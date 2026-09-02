import { Prisma } from '@prisma/client'
import { forUnit } from '../db'
import { getAsaasClient } from '../integration/asaas/client'
import type { Invoice } from '@prisma/client'

export class EnrollmentNotStartedError extends Error {
  readonly status = 422
  constructor() {
    super('Enrollment sem startedAt não pode ter cobrança proporcional calculada')
    this.name = 'EnrollmentNotStartedError'
  }
}

export class MissingAsaasKeyError extends Error {
  readonly status = 409
  constructor() {
    super('Unit sem asaasApiKeyEnc configurada — não é possível emitir cobrança')
    this.name = 'MissingAsaasKeyError'
  }
}

// Cálculos de data em UTC sempre — Enrollment.startedAt é um timestamp absoluto e
// referenceMonth é um rótulo de calendário; usar getDate()/new Date(y,m,d) locais faz o
// dia mudar conforme o fuso do processo (ex: America/Sao_Paulo), distorcendo o valor cobrado.
function daysInMonth(referenceMonth: string): number {
  const [year, month] = referenceMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// RN-14 — proporcional aos dias restantes do ciclo, de startedAt até o closingDay (inclusive)
function computeProportionalAmountCents(
  finalPriceCents: number,
  startedAt: Date,
  closingDay: number,
  referenceMonth: string
): number {
  const totalDays = daysInMonth(referenceMonth)
  const remainingDays = Math.max(0, Math.min(closingDay, totalDays) - startedAt.getUTCDate() + 1)
  return Math.round((finalPriceCents * remainingDays) / totalDays)
}

// RN-10 — se o dueDay do mês de competência já passou em relação a "agora", cobra no
// dueDay do mês seguinte (a Asaas rejeita dueDate no passado).
function nextDueDate(dueDay: number, referenceMonth: string, now: Date): Date {
  const [year, month] = referenceMonth.split('-').map(Number)
  const candidate = new Date(Date.UTC(year, month - 1, dueDay))
  if (candidate.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    return new Date(Date.UTC(year, month, dueDay))
  }
  return candidate
}

// Núcleo compartilhado por cron, emissão avulsa e lote (spec .specs/mvp-03-cobranca-automatica.md §5d).
// Retorna a Invoice existente/BLOCKED/PENDING/ERROR, ou null quando FREE_FIRST_MONTH pula a 1ª competência.
export async function emitInvoice(
  unitId: string,
  enrollmentId: string,
  referenceMonth: string,
  asaasApiKey: string
): Promise<Invoice | null> {
  const db = forUnit(unitId)
  const idempotencyKey = `${enrollmentId}:${referenceMonth}`

  // RN-03/RN-17 — idempotência: cron/manual/lote não duplicam. Exceção: uma Invoice em
  // ERROR não é "já emitida" de verdade — RN-13 exige retry automático (cron D+1/D+2) e
  // manual, então ela segue o fluxo abaixo reaproveitando o registro em vez de criar outro.
  const existing = await db.invoice.findUnique({ where: { idempotencyKey } })
  if (existing && existing.status !== 'ERROR') return existing

  const enrollment = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { guardian: true, unit: { include: { billingConfig: true } } },
  })

  const billingConfig = enrollment.unit.billingConfig!
  const isFirstCharge = !enrollment.isFirstChargeDone

  // RN-15 — 1ª competência isenta: não emite Invoice, só marca a flag
  if (isFirstCharge && billingConfig.firstChargeMode === 'FREE_FIRST_MONTH') {
    await db.enrollment.update({ where: { id: enrollmentId }, data: { isFirstChargeDone: true } })
    return null
  }

  if (isFirstCharge && billingConfig.firstChargeMode === 'PROPORTIONAL' && !enrollment.startedAt) {
    throw new EnrollmentNotStartedError()
  }

  // RN-13 — no retry de uma Invoice ERROR, reaproveita o amountCents já persistido na 1ª
  // tentativa em vez de recalcular: isFirstChargeDone já é true nessa altura, então recalcular
  // aqui usaria o valor cheio (RN-08/RN-09) mesmo quando a 1ª tentativa era PROPORTIONAL —
  // cobrando o valor errado no boleto real da Asaas.
  const amountCents = existing
    ? existing.amountCents
    : isFirstCharge && billingConfig.firstChargeMode === 'PROPORTIONAL'
      ? computeProportionalAmountCents(
          enrollment.finalPriceCents,
          enrollment.startedAt!,
          billingConfig.closingDay,
          referenceMonth
        )
      : enrollment.finalPriceCents // RN-08/RN-09 — cobranças subsequentes: valor cheio, sem recalcular

  const dueDate = nextDueDate(billingConfig.dueDay, referenceMonth, new Date())
  const base = { unitId, enrollmentId, amountCents, netAmountCents: amountCents, referenceMonth, dueDate, idempotencyKey }

  let invoice: Invoice
  if (existing) {
    // RN-13 — reaproveita a Invoice ERROR já reservada (idempotencyKey já é dela), não cria outra
    invoice = existing
  } else {
    // Reserva a Invoice ANTES de chamar a Asaas: idempotencyKey é @unique, então uma
    // segunda chamada concorrente (cron + retry manual, por ex.) falha aqui com P2002 em vez
    // de criar um segundo boleto real na Asaas — sem isso, duas chamadas simultâneas passariam
    // ambas pelo findUnique acima como "não existe" e ambas chamariam createPayment.
    try {
      invoice = await db.invoice.create({
        data: { ...base, status: enrollment.guardian.asaasCustomerId ? 'PENDING' : 'BLOCKED' },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await db.invoice.findUnique({ where: { idempotencyKey } })
        if (raced) return raced
      }
      throw err
    }

    // isFirstChargeDone já foi marcado na tentativa original que gerou o ERROR — só marca aqui
    // na primeira reserva bem-sucedida.
    if (isFirstCharge) {
      await db.enrollment.update({ where: { id: enrollmentId }, data: { isFirstChargeDone: true } })
    }
  }

  // RN-02/RN-19 — Guardian sem asaasCustomerId: BLOCKED, nunca chama Asaas
  if (!enrollment.guardian.asaasCustomerId) return invoice

  // Invoice ERROR com asaasPaymentId já preenchido: o createPayment anterior teve sucesso na
  // Asaas, só o update local que grava o vínculo falhou (timeout/erro transitório de rede/DB).
  // Retentar createPayment aqui criaria um SEGUNDO boleto real — a Asaas não deduplica por
  // externalReference. O que falhou foi só o registro local, não a cobrança em si — mas o
  // status ainda precisa ser promovido pra PENDING (dado legado de antes deste guard existir
  // podia ter asaasPaymentId preenchido com status ainda ERROR, o que a travaria pra sempre).
  if (invoice.asaasPaymentId) {
    if (invoice.status === 'ERROR') {
      return await db.invoice.update({ where: { id: invoice.id }, data: { status: 'PENDING' } })
    }
    return invoice
  }

  const client = getAsaasClient(asaasApiKey)

  try {
    const payment = await client.createPayment({
      customer: enrollment.guardian.asaasCustomerId,
      billingType: 'BOLETO',
      value: amountCents / 100,
      dueDate: dueDate.toISOString().slice(0, 10),
      externalReference: idempotencyKey,
      fine: { value: billingConfig.lateFeePercent / 100 },
      interest: { value: billingConfig.monthlyInterestBp / 100 },
    })

    return await db.invoice.update({
      where: { id: invoice.id },
      data: {
        // status:PENDING é o que sai do retry — sem isso, uma Invoice ERROR que virou boleto
        // real e cobrável ficaria marcada ERROR pra sempre. amountCents/netAmountCents/dueDate
        // gravam exatamente o que foi enviado à Asaas nesta chamada, pra Invoice local nunca
        // divergir do boleto real (relevante sobretudo no retry, onde ambos podem já ter sido
        // recalculados desde a tentativa original).
        status: 'PENDING',
        amountCents,
        netAmountCents: amountCents,
        dueDate,
        asaasPaymentId: payment.id,
        asaasPaymentUrl: payment.invoiceUrl,
        asaasBankSlipUrl: payment.bankSlipUrl,
        asaasBarCode: payment.barCode,
        emittedAt: new Date(),
      },
    })
  } catch {
    // RN-04 — falha na criação no Asaas: marca ERROR, não lança (retry via cron D+1/D+2 ou botão manual)
    return await db.invoice.update({ where: { id: invoice.id }, data: { status: 'ERROR' } })
  }
}

export interface BatchEmitResult {
  emitted: number
  skipped: number
  blocked: number
  errors: number
}

// Chama emitInvoice por Enrollment e agrega o resultado. emitInvoice já decide sozinho
// idempotência/retry (RN-03/RN-13) — não duplicar essa checagem aqui, ou uma Invoice ERROR
// nunca seria re-tentada pelo lote/cron.
async function emitForEnrollments(
  unitId: string,
  enrollmentIds: string[],
  referenceMonth: string,
  asaasApiKey: string
): Promise<BatchEmitResult> {
  const result: BatchEmitResult = { emitted: 0, skipped: 0, blocked: 0, errors: 0 }

  for (const enrollmentId of enrollmentIds) {
    try {
      const invoice = await emitInvoice(unitId, enrollmentId, referenceMonth, asaasApiKey)
      if (!invoice) result.skipped++
      else if (invoice.status === 'BLOCKED') result.blocked++
      else if (invoice.status === 'ERROR') result.errors++
      else result.emitted++
    } catch {
      result.errors++
    }
  }

  return result
}

// RN-18/RN-19 — emissão em lote por matéria/turma. Sequencial para não estourar rate limit da Asaas.
export async function emitBatchInvoices(
  unitId: string,
  subjectId: string,
  referenceMonth: string,
  asaasApiKey: string
): Promise<BatchEmitResult> {
  const db = forUnit(unitId)
  const enrollments = await db.enrollment.findMany({
    where: { subjectId, status: 'ACTIVE' },
    select: { id: true },
  })
  return emitForEnrollments(unitId, enrollments.map((e) => e.id), referenceMonth, asaasApiKey)
}

// Cron diário — todas as matérias/turmas da Unit, sem filtro de subjectId (espelha emitBatchInvoices).
export async function emitUnitInvoices(
  unitId: string,
  referenceMonth: string,
  asaasApiKey: string
): Promise<BatchEmitResult> {
  const db = forUnit(unitId)
  const enrollments = await db.enrollment.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  })
  return emitForEnrollments(unitId, enrollments.map((e) => e.id), referenceMonth, asaasApiKey)
}

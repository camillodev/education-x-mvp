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

  // RN-03/RN-17 — idempotência: cron/manual/lote não duplicam
  const existing = await db.invoice.findUnique({ where: { idempotencyKey } })
  if (existing) return existing

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

  const amountCents =
    isFirstCharge && billingConfig.firstChargeMode === 'PROPORTIONAL'
      ? computeProportionalAmountCents(
          enrollment.finalPriceCents,
          enrollment.startedAt!,
          billingConfig.closingDay,
          referenceMonth
        )
      : enrollment.finalPriceCents // RN-08/RN-09 — cobranças subsequentes: valor cheio, sem recalcular

  const dueDate = nextDueDate(billingConfig.dueDay, referenceMonth, new Date())
  const base = { unitId, enrollmentId, amountCents, netAmountCents: amountCents, referenceMonth, dueDate, idempotencyKey }

  // Reserva a Invoice ANTES de chamar a Asaas: idempotencyKey é @unique, então uma
  // segunda chamada concorrente (cron + retry manual, por ex.) falha aqui com P2002 em vez
  // de criar um segundo boleto real na Asaas — sem isso, duas chamadas simultâneas passariam
  // ambas pelo findUnique acima como "não existe" e ambas chamariam createPayment.
  let invoice: Invoice
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

  if (isFirstCharge) {
    await db.enrollment.update({ where: { id: enrollmentId }, data: { isFirstChargeDone: true } })
  }

  // RN-02/RN-19 — Guardian sem asaasCustomerId: BLOCKED, nunca chama Asaas
  if (!enrollment.guardian.asaasCustomerId) return invoice

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

// RN-18/RN-19 — emissão em lote por matéria/turma: mesma idempotência/BLOCKED de emitInvoice,
// aplicada a cada Enrollment ACTIVE do subjectId. Sequencial para não estourar rate limit da Asaas.
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

  const result: BatchEmitResult = { emitted: 0, skipped: 0, blocked: 0, errors: 0 }

  for (const { id: enrollmentId } of enrollments) {
    const alreadyExists = await db.invoice.findUnique({
      where: { idempotencyKey: `${enrollmentId}:${referenceMonth}` },
    })
    if (alreadyExists) {
      result.skipped++
      continue
    }

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

import { Prisma } from '@prisma/client'
// NOTA (exceção documentada em .claude/rules/security.md): este service usa o client BASE
// (`prisma`), NUNCA `forUnit(unitId)`. O webhook Asaas não tem sessão Clerk — não existe
// `unitId` conhecido no momento do lookup inicial da Invoice; o `unitId` só é descoberto
// DEPOIS de resolver a Invoice (via asaasPaymentId ou idempotencyKey). Autenticação desse
// endpoint é feita pelo header `asaas-access-token` comparado contra `ASAAS_WEBHOOK_TOKEN`
// (fora deste arquivo, na route handler). Não trocar para `forUnit` aqui.
import { prisma } from '@/lib/db'
import type { AsaasWebhookPayload } from '@/lib/integration/asaas/types'

// Cálculos de data em UTC sempre (mesma convenção de billing.service.ts) — paymentDate é
// date-only ("2026-09-05"), e `new Date('2026-09-05')` já é UTC midnight pela spec ES, então
// não precisa de sufixo. O risco real é o fallback de dateCreated ("2026-09-05 10:00:00", sem
// "T"/offset), que o V8 parseia como HORA LOCAL do processo — em produção (servidor UTC) isso
// coincide com UTC, mas não é garantido por spec. Normaliza explicitamente pra nunca depender
// do fuso do processo (achado de code review, EDU-26).
function parsePaidAt(paymentDate: string | undefined, dateCreated: string | undefined): Date {
  if (paymentDate) return new Date(paymentDate) // "YYYY-MM-DD" → UTC midnight, já correto
  if (dateCreated) return new Date(dateCreated.replace(' ', 'T') + 'Z')
  return new Date()
}

export async function processPaymentEvent(
  payload: AsaasWebhookPayload
): Promise<{ handled: boolean }> {
  if (payload.event !== 'PAYMENT_RECEIVED' && payload.event !== 'PAYMENT_OVERDUE') {
    return { handled: false }
  }

  // `externalReference` é opcional no payload. Se ausente, NÃO pode entrar no OR como
  // `{ idempotencyKey: undefined }` — o Prisma ignora campo `undefined` em `where`, o que
  // colapsaria essa branch para `{}` (sempre verdadeiro) e faria o findFirst devolver
  // qualquer Invoice, de qualquer Unit (vazamento cross-tenant).
  const invoiceLookup: Prisma.InvoiceWhereInput[] = [{ asaasPaymentId: payload.payment.id }]
  if (payload.payment.externalReference) {
    invoiceLookup.push({ idempotencyKey: payload.payment.externalReference })
  }

  const invoice = await prisma.invoice.findFirst({
    where: { OR: invoiceLookup },
    select: { id: true, unitId: true, status: true, asaasPaymentId: true },
  })

  if (!invoice) {
    // Log só com IDs do evento/payment — nunca o payload completo (PII de responsável/aluno
    // pode chegar em campos não mapeados aqui). Sem isso, um pagamento real cuja Invoice não
    // é encontrada (dado legado, corrida entre emissão e webhook) é 200 pro Asaas e silêncio
    // total pro nosso lado — mesmo raciocínio do log já adicionado em route.ts pra payload
    // rejeitado pelo Zod (achado de code review, EDU-26).
    console.error(
      `[webhook.service] Invoice não encontrada para evento — eventId=${payload.id} event=${payload.event} paymentId=${payload.payment.id}`
    )
    return { handled: false }
  }

  // `idempotencyKey` é @unique global (schema.prisma) — não há colisão cross-tenant possível
  // por esse campo. O risco real que este guard cobre é dado legado ou divergente: uma Invoice
  // já tem asaasPaymentId preenchido (de uma emissão anterior bem-sucedida) e o evento atual
  // aponta pra um payment.id diferente — reconciliar contra ela seria promover a Invoice errada
  // (achado de security review, EDU-26 — F2).
  if (invoice.asaasPaymentId && invoice.asaasPaymentId !== payload.payment.id) {
    console.error(
      `[webhook.service] asaasPaymentId divergente, evento descartado — eventId=${payload.id} invoiceId=${invoice.id} esperado=${invoice.asaasPaymentId} recebido=${payload.payment.id}`
    )
    return { handled: false }
  }

  if (payload.event === 'PAYMENT_RECEIVED') {
    return handlePaymentReceived(invoice, payload)
  }

  return handlePaymentOverdue(invoice)
}

async function handlePaymentReceived(
  invoice: { id: string; unitId: string; asaasPaymentId: string | null },
  payload: AsaasWebhookPayload
): Promise<{ handled: boolean }> {
  const amountCents = Math.round(payload.payment.value * 100)
  const paidAt = parsePaidAt(payload.payment.paymentDate, payload.dateCreated)
  // Vincula asaasPaymentId à Invoice sempre — cobre o caminho em que ela foi resolvida só por
  // externalReference (idempotencyKey) porque a emissão original (billing.service.ts) tinha
  // falhado ANTES de persistir asaasPaymentId (ex.: Invoice ERROR criada mas createPayment
  // ainda não tinha voltado). Sem isso, a Invoice fica PAID mas sem vínculo Asaas gravado, e
  // o guard de consistência (F2, abaixo) fica permanentemente desarmado pra ela.
  const invoiceUpdateData = {
    status: 'PAID' as const,
    paidAt,
    paidAmountCents: amountCents,
    asaasPaymentId: payload.payment.id,
  }

  try {
    // Payment.create + Invoice.update numa transação: se o update falhar por qualquer razão
    // (blip de conexão, dado inválido), o create também não commita — nunca fica um Payment
    // órfão com a Invoice presa em PENDING/ERROR/OVERDUE pra sempre (achado de security review,
    // EDU-26: sem transação, uma falha entre as duas escritas deixava a Invoice não-reconciliada
    // permanentemente, porque a reentrega seguinte batia em P2002 e retornava cedo sem nunca
    // tentar o update de novo).
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          unitId: invoice.unitId,
          invoiceId: invoice.id,
          asaasPaymentId: payload.payment.id,
          asaasEvent: payload.event,
          asaasStatus: payload.payment.status,
          amountCents,
          paidAt,
          clientPaidAt: payload.payment.clientPaymentDate
            ? new Date(payload.payment.clientPaymentDate)
            : undefined,
          webhookEventId: payload.id,
        },
      }),
      // Guard assimétrico: PAYMENT_RECEIVED sempre promove para PAID, independente do status
      // atual (PENDING, ERROR ou OVERDUE) — dinheiro que entrou sempre reconcilia.
      prisma.invoice.update({
        where: { id: invoice.id },
        data: invoiceUpdateData,
      }),
    ])
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Reentrega do mesmo evento webhook: o Payment.create da tentativa anterior colidiu em
      // webhookEventId, e o Prisma $transaction (modo array) faz rollback de TUDO se qualquer
      // operação falhar — logo o Invoice.update daquela tentativa também não commitou. Reaplicar
      // aqui, fora da transação, garante que a Invoice fica mesmo promovida em vez de assumir
      // que uma tentativa anterior (que na verdade sofreu rollback) já cuidou disso.
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: invoiceUpdateData,
      })
      return { handled: true }
    }
    throw error
  }

  return { handled: true }
}

async function handlePaymentOverdue(invoice: { id: string; status: string }): Promise<{ handled: boolean }> {
  // Guard simétrico: só rebaixa para OVERDUE se ainda estiver PENDING. Reentrega fora de
  // ordem de um evento OVERDUE antigo não pode desfazer um pagamento já reconciliado.
  if (invoice.status !== 'PENDING') {
    return { handled: true }
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'OVERDUE' },
  })

  return { handled: true }
}

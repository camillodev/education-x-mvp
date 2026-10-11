import { Prisma } from '@prisma/client'
// Base client on purpose: the webhook has no Clerk session, so unitId is only known after the
// Enrollment is resolved. See .claude/rules/security.md.
import { prisma } from '@/lib/db'
import { parseAsaasDateTime } from '@/lib/integration/asaas/date'
import type { AsaasWebhookPayload } from '@/lib/integration/asaas/types'

// Creates the Invoice for a charge Asaas generated from a subscription cycle (ADR-0007).
// Must stay idempotent: Asaas redelivers events.
export async function handlePaymentCreated(
  payload: AsaasWebhookPayload
): Promise<{ handled: boolean }> {
  const { payment } = payload
  if (!payment.subscription) return { handled: false }
  if (!payment.dueDate) {
    console.error(
      `[webhook.service] Subscription charge without dueDate — eventId=${payload.id} subscriptionId=${payment.subscription} paymentId=${payment.id}`
    )
    return { handled: false }
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { asaasSubscriptionId: payment.subscription },
    select: { id: true, unitId: true },
  })
  if (!enrollment) {
    console.error(
      `[webhook.service] Subscription not linked to any Enrollment — eventId=${payload.id} subscriptionId=${payment.subscription} paymentId=${payment.id}`
    )
    return { handled: false }
  }

  const alreadyCreated = await prisma.invoice.findFirst({
    where: { asaasPaymentId: payment.id },
    select: { id: true },
  })
  if (alreadyCreated) return { handled: true }

  // externalReference is fixed per subscription, so the key is derived from the cycle instead.
  const referenceMonth = payment.dueDate.slice(0, 7)
  const amountCents = Math.round(payment.value * 100)

  try {
    await prisma.invoice.create({
      data: {
        unitId: enrollment.unitId,
        enrollmentId: enrollment.id,
        amountCents,
        netAmountCents: amountCents,
        referenceMonth,
        dueDate: new Date(payment.dueDate),
        status: 'PENDING',
        asaasPaymentId: payment.id,
        asaasPaymentUrl: payment.invoiceUrl ?? undefined,
        asaasBankSlipUrl: payment.bankSlipUrl ?? undefined,
        emittedAt: payload.dateCreated ? parseAsaasDateTime(payload.dateCreated) : new Date(),
        idempotencyKey: `${enrollment.id}:${referenceMonth}`,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return resolveCreateConflict(payload, enrollment.id, referenceMonth)
    }
    throw error
  }

  return { handled: true }
}

// P2002 is a concurrent redelivery (same payment) or a different charge already owning this
// competence (e.g. a standalone Invoice): the latter is a real Asaas charge with no local Invoice.
async function resolveCreateConflict(
  payload: AsaasWebhookPayload,
  enrollmentId: string,
  referenceMonth: string
): Promise<{ handled: boolean }> {
  const owner = await prisma.invoice.findUnique({
    where: { idempotencyKey: `${enrollmentId}:${referenceMonth}` },
    select: { asaasPaymentId: true },
  })
  if (owner?.asaasPaymentId === payload.payment.id) return { handled: true }

  console.error(
    `[webhook.service] Competence already has a different charge — eventId=${payload.id} enrollmentId=${enrollmentId} paymentId=${payload.payment.id} referenceMonth=${referenceMonth}`
  )
  return { handled: false }
}

import { forUnit } from '../db'
import { getAsaasClient } from '../integration/asaas/client'
import { AsaasNotFoundError } from '../integration/asaas/errors'
import { lateChargeTerms } from '../integration/asaas/late-terms'

// Per run and per Unit, so a large Unit cannot outlive the cron request and leave work half done.
export const SUBSCRIPTION_MIGRATION_BATCH_SIZE = 50

// Reserves the Enrollment before the Asaas call: Asaas does not dedupe by externalReference, so a
// retry after a half-finished run would create a second live subscription.
const CLAIM_PREFIX = 'claim:'
const claimToken = (enrollmentId: string) => `${CLAIM_PREFIX}${enrollmentId}`

export interface SubscriptionMigrationResult {
  subscribed: number
  skipped: number
  errors: number
}

// Due date of the cycle right after the last emitted competence (dueDay is 1..28, never clamped).
// UTC on purpose: referenceMonth is a calendar label, not an instant.
export function nextCycleDueDate(dueDay: number, lastReferenceMonth: string): Date {
  const [year, month] = lastReferenceMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, dueDay))
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

// ADR-0007: after the standalone first charge, Asaas generates the following cycles. The local
// Invoice of each cycle is created by the PAYMENT_CREATED webhook, never here.
export async function migrateEnrollmentsToSubscription(
  unitId: string,
  asaasApiKey: string,
  now: Date = new Date()
): Promise<SubscriptionMigrationResult> {
  const db = forUnit(unitId)
  const client = getAsaasClient(asaasApiKey)
  const today = startOfUtcDay(now)

  const candidates = await db.enrollment.findMany({
    where: {
      status: 'ACTIVE',
      asaasSubscriptionId: null,
      isFirstChargeDone: true,
      guardian: { asaasCustomerId: { not: null } },
    },
    take: SUBSCRIPTION_MIGRATION_BATCH_SIZE,
    select: {
      id: true,
      finalPriceCents: true,
      guardian: { select: { asaasCustomerId: true } },
      unit: { select: { billingConfig: { select: { dueDay: true, lateFeePercent: true, monthlyInterestBp: true } } } },
      invoices: { select: { referenceMonth: true, status: true }, orderBy: { referenceMonth: 'desc' }, take: 1 },
    },
  })

  const result: SubscriptionMigrationResult = { subscribed: 0, skipped: 0, errors: 0 }

  // Sequential to stay under the Asaas rate limit, same as the batch emission.
  for (const enrollment of candidates) {
    const latest = enrollment.invoices[0]
    const billingConfig = enrollment.unit.billingConfig
    const customer = enrollment.guardian.asaasCustomerId
    if (!latest || latest.status === 'ERROR' || !billingConfig || !customer) {
      result.skipped++
      continue
    }

    const nextDueDate = nextCycleDueDate(billingConfig.dueDay, latest.referenceMonth)
    if (nextDueDate <= today) {
      result.skipped++
      continue
    }

    const claim = await db.enrollment.updateMany({
      where: { id: enrollment.id, asaasSubscriptionId: null },
      data: { asaasSubscriptionId: claimToken(enrollment.id) },
    })
    if (claim.count === 0) {
      result.skipped++
      continue
    }

    let subscriptionId: string
    try {
      const subscription = await client.createSubscription({
        customer,
        billingType: 'BOLETO',
        value: enrollment.finalPriceCents / 100, // Asaas expects reais, not cents
        nextDueDate: nextDueDate.toISOString().slice(0, 10),
        cycle: 'MONTHLY',
        externalReference: `sub:${enrollment.id}`,
        ...lateChargeTerms(billingConfig),
      })
      subscriptionId = subscription.id
    } catch (error) {
      console.error(`[subscription.service] Asaas rejected the subscription — enrollmentId=${enrollment.id}`, error)
      await releaseClaim(db, enrollment.id)
      result.errors++
      continue
    }

    try {
      await db.enrollment.update({ where: { id: enrollment.id }, data: { asaasSubscriptionId: subscriptionId } })
      result.subscribed++
    } catch (error) {
      // The claim stays on purpose (it blocks a duplicate); a human must link the id.
      console.error(
        `[subscription.service] Subscription created but not saved — enrollmentId=${enrollment.id} subscriptionId=${subscriptionId}`,
        error
      )
      result.errors++
    }
  }

  return result
}

async function releaseClaim(db: ReturnType<typeof forUnit>, enrollmentId: string): Promise<void> {
  try {
    await db.enrollment.updateMany({
      where: { id: enrollmentId, asaasSubscriptionId: claimToken(enrollmentId) },
      data: { asaasSubscriptionId: null },
    })
  } catch (error) {
    console.error(`[subscription.service] Could not release claim — enrollmentId=${enrollmentId}`, error)
  }
}

// Deleting the subscription also removes Asaas' pending charges; paid Invoices stay local.
export async function cancelEnrollmentSubscription(
  unitId: string,
  enrollmentId: string,
  asaasApiKey: string
): Promise<void> {
  const db = forUnit(unitId)
  const { asaasSubscriptionId } = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { asaasSubscriptionId: true },
  })
  if (!asaasSubscriptionId) return

  // A claim has no Asaas counterpart to delete. Already gone in Asaas counts as deleted, so a
  // retry after a failed local update can finish.
  if (!asaasSubscriptionId.startsWith(CLAIM_PREFIX)) {
    try {
      await getAsaasClient(asaasApiKey).deleteSubscription(asaasSubscriptionId)
    } catch (error) {
      if (!(error instanceof AsaasNotFoundError)) throw error
    }
  }
  await db.enrollment.update({ where: { id: enrollmentId }, data: { asaasSubscriptionId: null } })
}

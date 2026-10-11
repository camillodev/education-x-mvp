import { forUnit } from '../db'
import { getAsaasClient } from '../integration/asaas/client'
import { lateChargeTerms } from '../integration/asaas/late-terms'

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
      try {
        await db.enrollment.update({ where: { id: enrollment.id }, data: { asaasSubscriptionId: subscription.id } })
      } catch (error) {
        // Not rolled back: the next run would create a duplicate, so this needs a human.
        console.error(
          `[subscription.service] Subscription created but not saved — enrollmentId=${enrollment.id} subscriptionId=${subscription.id}`,
          error
        )
        throw error
      }
      result.subscribed++
    } catch (error) {
      console.error(`[subscription.service] Migration failed — enrollmentId=${enrollment.id}`, error)
      result.errors++
    }
  }

  return result
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

  await getAsaasClient(asaasApiKey).deleteSubscription(asaasSubscriptionId)
  await db.enrollment.update({ where: { id: enrollmentId }, data: { asaasSubscriptionId: null } })
}

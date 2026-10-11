import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { forUnit } from '@/lib/db'
import { AsaasNotFoundError } from '@/lib/integration/asaas/errors'
import {
  migrateEnrollmentsToSubscription,
  cancelEnrollmentSubscription,
  nextCycleDueDate,
} from '@/lib/services/subscription.service'

const mockCreateSubscription = vi.fn()
const mockDeleteSubscription = vi.fn()

vi.mock('@/lib/integration/asaas/client', () => ({
  getAsaasClient: vi.fn(() => ({
    createSubscription: mockCreateSubscription,
    deleteSubscription: mockDeleteSubscription,
  })),
}))

vi.mock('@/lib/db', () => {
  const findMany = vi.fn()
  const findUniqueOrThrow = vi.fn()
  const update = vi.fn()
  const updateMany = vi.fn()
  return { forUnit: vi.fn(() => ({ enrollment: { findMany, findUniqueOrThrow, update, updateMany } })) }
})

type MockDb = {
  enrollment: {
    findMany: ReturnType<typeof vi.fn>
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}
const db = () => forUnit('unit-1') as unknown as MockDb

const BILLING_CONFIG = { dueDay: 10, lateFeePercent: 200, monthlyInterestBp: 100 }

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enr-1',
    finalPriceCents: 35000,
    guardian: { asaasCustomerId: 'cus_1' },
    unit: { billingConfig: BILLING_CONFIG },
    invoices: [{ referenceMonth: '2026-10', status: 'PENDING' }],
    ...overrides,
  }
}

const NOW = new Date('2026-10-15T12:00:00Z')

describe('nextCycleDueDate', () => {
  it('is the dueDay of the month after the last competence, in UTC', () => {
    expect(nextCycleDueDate(10, '2026-10')).toEqual(new Date('2026-11-10T00:00:00Z'))
  })

  it('rolls over the year', () => {
    expect(nextCycleDueDate(5, '2026-12')).toEqual(new Date('2027-01-05T00:00:00Z'))
  })
})

describe('migrateEnrollmentsToSubscription', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    db().enrollment.findMany.mockResolvedValue([candidate()])
    db().enrollment.update.mockResolvedValue({})
    db().enrollment.updateMany.mockResolvedValue({ count: 1 })
    mockCreateSubscription.mockResolvedValue({ id: 'sub_1' })
  })

  afterEach(() => errorSpy.mockRestore())

  it('only selects ACTIVE, already-charged Enrollments with a customer and no subscription', async () => {
    await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(db().enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ACTIVE',
          asaasSubscriptionId: null,
          isFirstChargeDone: true,
          guardian: { asaasCustomerId: { not: null } },
        },
      })
    )
  })

  it('creates a MONTHLY subscription for the next clean cycle and stores its id', async () => {
    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result).toEqual({ subscribed: 1, skipped: 0, errors: 0 })
    expect(mockCreateSubscription).toHaveBeenCalledWith({
      customer: 'cus_1',
      billingType: 'BOLETO',
      value: 350,
      nextDueDate: '2026-11-10',
      cycle: 'MONTHLY',
      externalReference: 'sub:enr-1',
      fine: { value: 2 },
      interest: { value: 1 },
    })
    expect(db().enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { asaasSubscriptionId: 'sub_1' },
    })
  })

  it('skips an Enrollment with no Invoice yet (first charge still belongs to the standalone flow)', async () => {
    db().enrollment.findMany.mockResolvedValue([candidate({ invoices: [] })])

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result).toEqual({ subscribed: 0, skipped: 1, errors: 0 })
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('skips when the latest Invoice is ERROR (the charge was never really issued)', async () => {
    db().enrollment.findMany.mockResolvedValue([
      candidate({ invoices: [{ referenceMonth: '2026-10', status: 'ERROR' }] }),
    ])

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result.skipped).toBe(1)
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('skips when the next cycle due date is already in the past (Asaas rejects past dates)', async () => {
    db().enrollment.findMany.mockResolvedValue([
      candidate({ invoices: [{ referenceMonth: '2026-08', status: 'PAID' }] }),
    ])

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result.skipped).toBe(1)
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('claims the Enrollment atomically before calling Asaas', async () => {
    await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(db().enrollment.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'enr-1', asaasSubscriptionId: null },
      data: { asaasSubscriptionId: 'claim:enr-1' },
    })
    const claimOrder = db().enrollment.updateMany.mock.invocationCallOrder[0]
    expect(claimOrder).toBeLessThan(mockCreateSubscription.mock.invocationCallOrder[0])
  })

  it('does not call Asaas when another run already claimed the Enrollment', async () => {
    db().enrollment.updateMany.mockResolvedValue({ count: 0 })

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result.skipped).toBe(1)
    expect(mockCreateSubscription).not.toHaveBeenCalled()
  })

  it('limits how many Enrollments a single run handles', async () => {
    await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(db().enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }))
  })

  it('releases the claim when Asaas rejects, so the next run can retry', async () => {
    mockCreateSubscription.mockRejectedValue(new Error('asaas down'))

    await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(db().enrollment.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'enr-1', asaasSubscriptionId: 'claim:enr-1' },
      data: { asaasSubscriptionId: null },
    })
  })

  it('keeps the claim when the subscription exists in Asaas but could not be saved (blocks a duplicate)', async () => {
    db().enrollment.update.mockRejectedValue(new Error('db blip'))

    await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(db().enrollment.updateMany).toHaveBeenCalledTimes(1)
  })

  it('counts an Asaas failure as an error, keeps going, and stores nothing for it', async () => {
    db().enrollment.findMany.mockResolvedValue([candidate(), candidate({ id: 'enr-2' })])
    mockCreateSubscription.mockRejectedValueOnce(new Error('asaas down')).mockResolvedValueOnce({ id: 'sub_2' })

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result).toEqual({ subscribed: 1, skipped: 0, errors: 1 })
    expect(db().enrollment.update).toHaveBeenCalledTimes(1)
    expect(db().enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-2' },
      data: { asaasSubscriptionId: 'sub_2' },
    })
  })

  it('logs the orphan subscription id when saving it locally fails', async () => {
    db().enrollment.update.mockRejectedValue(new Error('db blip'))

    const result = await migrateEnrollmentsToSubscription('unit-1', 'key', NOW)

    expect(result.errors).toBe(1)
    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('sub_1')
    expect(logged).toContain('enr-1')
  })
})

describe('cancelEnrollmentSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db().enrollment.update.mockResolvedValue({})
  })

  it('deletes the Asaas subscription and clears the local id', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: 'sub_1' })

    await cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')

    expect(mockDeleteSubscription).toHaveBeenCalledWith('sub_1')
    expect(db().enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { asaasSubscriptionId: null },
    })
  })

  it('does nothing for an Enrollment that never migrated to a subscription', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: null })

    await cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')

    expect(mockDeleteSubscription).not.toHaveBeenCalled()
    expect(db().enrollment.update).not.toHaveBeenCalled()
  })

  it('treats a subscription already gone in Asaas as deleted and still clears the local id', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: 'sub_1' })
    mockDeleteSubscription.mockRejectedValue(new AsaasNotFoundError('not found', 'not_found', 404, null))

    await cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')

    expect(db().enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { asaasSubscriptionId: null },
    })
  })

  it('does not call Asaas for a claim that never became a subscription', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: 'claim:enr-1' })

    await cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')

    expect(mockDeleteSubscription).not.toHaveBeenCalled()
    expect(db().enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { asaasSubscriptionId: null },
    })
  })

  it('keeps the local id when the Asaas delete fails, so it can be retried', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: 'sub_1' })
    mockDeleteSubscription.mockRejectedValue(new Error('asaas down'))

    await expect(cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')).rejects.toThrow('asaas down')
    expect(db().enrollment.update).not.toHaveBeenCalled()
  })
})

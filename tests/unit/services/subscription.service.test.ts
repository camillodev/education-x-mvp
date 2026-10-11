import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { forUnit } from '@/lib/db'
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
  return { forUnit: vi.fn(() => ({ enrollment: { findMany, findUniqueOrThrow, update } })) }
})

type MockDb = {
  enrollment: {
    findMany: ReturnType<typeof vi.fn>
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
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

  it('keeps the local id when the Asaas delete fails, so it can be retried', async () => {
    db().enrollment.findUniqueOrThrow.mockResolvedValue({ asaasSubscriptionId: 'sub_1' })
    mockDeleteSubscription.mockRejectedValue(new Error('asaas down'))

    await expect(cancelEnrollmentSubscription('unit-1', 'enr-1', 'key')).rejects.toThrow('asaas down')
    expect(db().enrollment.update).not.toHaveBeenCalled()
  })
})

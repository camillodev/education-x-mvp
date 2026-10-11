import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { processPaymentEvent } from '@/lib/services/webhook.service'
import type { AsaasWebhookPayload } from '@/lib/integration/asaas/types'

vi.mock('@/lib/db', () => ({
  prisma: {
    enrollment: { findUnique: vi.fn() },
    invoice: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}))

type MockDb = {
  enrollment: { findUnique: ReturnType<typeof vi.fn> }
  invoice: {
    findFirst: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}
const db = prisma as unknown as MockDb

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

function cyclePayload(overrides: Partial<AsaasWebhookPayload['payment']> = {}): AsaasWebhookPayload {
  return {
    id: 'evt_created_1',
    event: 'PAYMENT_CREATED',
    dateCreated: '2026-09-26 08:00:00',
    payment: {
      id: 'pay_cycle_1',
      status: 'PENDING',
      value: 350,
      dueDate: '2026-10-10',
      subscription: 'sub_1',
      externalReference: 'subscription-enr-1',
      billingType: 'BOLETO',
      invoiceUrl: 'https://www.asaas.com/i/cycle1',
      bankSlipUrl: 'https://www.asaas.com/b/pdf/cycle1',
      ...overrides,
    },
  }
}

describe('processPaymentEvent — PAYMENT_CREATED', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    db.enrollment.findUnique.mockResolvedValue({ id: 'enr-1', unitId: 'unit-1' })
    db.invoice.findFirst.mockResolvedValue(null)
    db.invoice.create.mockResolvedValue({ id: 'inv-new' })
  })

  afterEach(() => errorSpy.mockRestore())

  it('creates a PENDING Invoice for a subscription cycle, resolving unitId from the Enrollment', async () => {
    const result = await processPaymentEvent(cyclePayload())

    expect(result).toEqual({ handled: true })
    expect(db.enrollment.findUnique).toHaveBeenCalledWith({
      where: { asaasSubscriptionId: 'sub_1' },
      select: { id: true, unitId: true },
    })
    expect(db.invoice.create).toHaveBeenCalledWith({
      data: {
        unitId: 'unit-1',
        enrollmentId: 'enr-1',
        amountCents: 35000,
        netAmountCents: 35000,
        referenceMonth: '2026-10',
        dueDate: new Date('2026-10-10T00:00:00Z'),
        status: 'PENDING',
        asaasPaymentId: 'pay_cycle_1',
        asaasPaymentUrl: 'https://www.asaas.com/i/cycle1',
        asaasBankSlipUrl: 'https://www.asaas.com/b/pdf/cycle1',
        emittedAt: new Date('2026-09-26T08:00:00Z'),
        idempotencyKey: 'enr-1:2026-10',
      },
    })
  })

  it('does not use the subscription-wide externalReference as the Invoice key', async () => {
    await processPaymentEvent(cyclePayload({ externalReference: 'subscription-enr-1' }))

    const { data } = db.invoice.create.mock.calls[0][0]
    expect(data.idempotencyKey).toBe('enr-1:2026-10')
  })

  it('converts reais to cents with Math.round (0.29 * 100 = 28.999999999999996)', async () => {
    await processPaymentEvent(cyclePayload({ value: 0.29 }))

    const { data } = db.invoice.create.mock.calls[0][0]
    expect(data.amountCents).toBe(29)
    expect(data.netAmountCents).toBe(29)
  })

  it('ignores a standalone charge (no payment.subscription): no lookup, no write', async () => {
    const result = await processPaymentEvent(cyclePayload({ subscription: undefined }))

    expect(result).toEqual({ handled: false })
    expect(db.enrollment.findUnique).not.toHaveBeenCalled()
    expect(db.invoice.create).not.toHaveBeenCalled()
  })

  it('returns handled:false and logs only ids when the subscription is unknown', async () => {
    db.enrollment.findUnique.mockResolvedValue(null)

    const result = await processPaymentEvent(cyclePayload())

    expect(result).toEqual({ handled: false })
    expect(db.invoice.create).not.toHaveBeenCalled()
    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('evt_created_1')
    expect(logged).toContain('sub_1')
  })

  it('returns handled:false when dueDate is missing (cannot derive the reference month)', async () => {
    const result = await processPaymentEvent(cyclePayload({ dueDate: undefined }))

    expect(result).toEqual({ handled: false })
    expect(db.invoice.create).not.toHaveBeenCalled()
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('pay_cycle_1')
  })

  it('is idempotent on redelivery: an Invoice already linked to payment.id means no second create', async () => {
    db.invoice.findFirst.mockResolvedValue({ id: 'inv-existing' })

    const result = await processPaymentEvent(cyclePayload())

    expect(result).toEqual({ handled: true })
    expect(db.invoice.findFirst).toHaveBeenCalledWith({
      where: { asaasPaymentId: 'pay_cycle_1' },
      select: { id: true },
    })
    expect(db.invoice.create).not.toHaveBeenCalled()
  })

  it('treats a concurrent redelivery (P2002, key owned by the same payment) as handled', async () => {
    db.invoice.create.mockRejectedValue(p2002())
    db.invoice.findUnique.mockResolvedValue({ asaasPaymentId: 'pay_cycle_1' })

    await expect(processPaymentEvent(cyclePayload())).resolves.toEqual({ handled: true })
  })

  it('returns handled:false and logs ids when the competence key is owned by a different charge', async () => {
    db.invoice.create.mockRejectedValue(p2002())
    db.invoice.findUnique.mockResolvedValue({ asaasPaymentId: 'pay_standalone' })

    await expect(processPaymentEvent(cyclePayload())).resolves.toEqual({ handled: false })
    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('pay_cycle_1')
    expect(logged).toContain('enr-1')
  })

  it('rethrows unexpected database errors so Asaas retries the delivery', async () => {
    db.invoice.create.mockRejectedValue(new Error('connection refused'))

    await expect(processPaymentEvent(cyclePayload())).rejects.toThrow('connection refused')
  })
})

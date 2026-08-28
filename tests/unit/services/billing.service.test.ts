import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { forUnit } from '@/lib/db'
import { emitInvoice, EnrollmentNotStartedError } from '@/lib/services/billing.service'

const mockCreatePayment = vi.fn()

vi.mock('@/lib/integration/asaas/client', () => ({
  getAsaasClient: vi.fn(() => ({
    createPayment: mockCreatePayment,
  })),
}))

vi.mock('@/lib/db', () => {
  const invoiceFindUnique = vi.fn()
  const invoiceCreate = vi.fn()
  const invoiceUpdate = vi.fn()
  const enrollmentFindUniqueOrThrow = vi.fn()
  const enrollmentUpdate = vi.fn()
  return {
    forUnit: vi.fn(() => ({
      invoice: {
        findUnique: invoiceFindUnique,
        create: invoiceCreate,
        update: invoiceUpdate,
      },
      enrollment: {
        findUniqueOrThrow: enrollmentFindUniqueOrThrow,
        update: enrollmentUpdate,
      },
    })),
  }
})

type MockForUnitDb = {
  invoice: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  enrollment: {
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const BILLING_CONFIG_BASE = {
  dueDay: 10,
  closingDay: 25,
  lateFeePercent: 200,
  monthlyInterestBp: 100,
  firstChargeMode: 'PROPORTIONAL' as const,
}

const ENROLLMENT_BASE = {
  id: 'enr-1',
  unitId: 'unit-1',
  guardianId: 'guardian-1',
  finalPriceCents: 45000,
  isFirstChargeDone: true,
  startedAt: new Date('2026-08-01T00:00:00Z'),
  guardian: { id: 'guardian-1', asaasCustomerId: 'cus_123' },
  unit: { billingConfig: BILLING_CONFIG_BASE },
}

const EXISTING_INVOICE = {
  id: 'inv-1',
  unitId: 'unit-1',
  enrollmentId: 'enr-1',
  referenceMonth: '2026-09',
  idempotencyKey: 'enr-1:2026-09',
  status: 'PENDING',
}

const RESERVED_INVOICE = { ...EXISTING_INVOICE, id: 'inv-new', status: 'PENDING' }

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

describe('emitInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreatePayment.mockResolvedValue({
      id: 'pay_abc',
      status: 'PENDING',
      invoiceUrl: 'https://sandbox.asaas.com/i/abc',
      bankSlipUrl: 'https://sandbox.asaas.com/b/abc',
      barCode: '000',
    })
  })

  it('idempotência: se já existe Invoice com a mesma idempotencyKey, retorna sem duplicar nem chamar Asaas (RN-03)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(EXISTING_INVOICE)

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(result).toEqual(EXISTING_INVOICE)
    expect(db.invoice.create).not.toHaveBeenCalled()
    expect(mockCreatePayment).not.toHaveBeenCalled()
  })

  it('race condition: create concorrente colide em idempotencyKey (P2002) → retorna a Invoice já criada pela outra chamada, sem duplicar boleto na Asaas', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValueOnce(null) // primeira leitura: ainda não existe
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    db.invoice.create.mockRejectedValue(p2002()) // outra chamada venceu a corrida
    db.invoice.findUnique.mockResolvedValueOnce(RESERVED_INVOICE) // reconsulta após P2002

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(result).toEqual(RESERVED_INVOICE)
    expect(mockCreatePayment).not.toHaveBeenCalled()
  })

  it('BLOCKED: Guardian sem asaasCustomerId cria Invoice BLOCKED sem chamar Asaas (RN-02/RN-19)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({
      ...ENROLLMENT_BASE,
      guardian: { id: 'guardian-1', asaasCustomerId: null },
    })
    db.invoice.create.mockResolvedValue({ ...RESERVED_INVOICE, status: 'BLOCKED' })

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).not.toHaveBeenCalled()
    expect(db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'BLOCKED', idempotencyKey: 'enr-1:2026-09' }),
      })
    )
    expect(result!.status).toBe('BLOCKED')
  })

  it('1ª competência sem startedAt: lança EnrollmentNotStartedError em vez de TypeError cru', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({
      ...ENROLLMENT_BASE,
      isFirstChargeDone: false,
      startedAt: null,
    })

    await expect(emitInvoice('unit-1', 'enr-1', '2026-08', 'asaas_key')).rejects.toThrow(
      EnrollmentNotStartedError
    )
    expect(db.invoice.create).not.toHaveBeenCalled()
    expect(mockCreatePayment).not.toHaveBeenCalled()
  })

  it('1ª competência PROPORTIONAL: calcula amountCents proporcional aos dias restantes do ciclo (RN-14)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({
      ...ENROLLMENT_BASE,
      isFirstChargeDone: false,
      startedAt: new Date('2026-08-16T00:00:00Z'), // 10 dias restantes até closingDay=25, mês de 31 dias
    })
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING' })

    await emitInvoice('unit-1', 'enr-1', '2026-08', 'asaas_key')

    // finalPriceCents=45000 × (10/31) ≈ 14516
    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.closeTo(145.16, 1) })
    )
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { isFirstChargeDone: true },
    })
  })

  it('FREE_FIRST_MONTH: não emite Invoice na 1ª competência, só marca isFirstChargeDone (RN-15)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({
      ...ENROLLMENT_BASE,
      isFirstChargeDone: false,
      unit: { billingConfig: { ...BILLING_CONFIG_BASE, firstChargeMode: 'FREE_FIRST_MONTH' } },
    })

    const result = await emitInvoice('unit-1', 'enr-1', '2026-08', 'asaas_key')

    expect(mockCreatePayment).not.toHaveBeenCalled()
    expect(db.invoice.create).not.toHaveBeenCalled()
    expect(db.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { isFirstChargeDone: true },
    })
    expect(result).toBeNull()
  })

  it('cobrança subsequente: usa finalPriceCents cheio, sem recalcular desconto (RN-08/RN-09)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE) // isFirstChargeDone: true
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING' })

    await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).toHaveBeenCalledWith(expect.objectContaining({ value: 450 }))
  })

  it('RN-10: dueDay do mês de referência já passou → cobra no dueDay do mês seguinte (Asaas rejeita dueDate no passado)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    // dueDay=10, referenceMonth=2026-08, mas "agora" já é 20/08 — 10/08 é passado
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING' })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'))
    try {
      await emitInvoice('unit-1', 'enr-1', '2026-08', 'asaas_key')
    } finally {
      vi.useRealTimers()
    }

    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: '2026-09-10' })
    )
  })

  it('POST /payments OK: atualiza a Invoice reservada para PENDING com asaasPaymentId salvo', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    mockCreatePayment.mockResolvedValue({
      id: 'pay_xyz',
      status: 'PENDING',
      invoiceUrl: 'https://sandbox.asaas.com/i/xyz',
      bankSlipUrl: 'https://sandbox.asaas.com/b/xyz',
      barCode: '111',
    })
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING', asaasPaymentId: 'pay_xyz' })

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', idempotencyKey: 'enr-1:2026-09' }) })
    )
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-new' },
      data: expect.objectContaining({ asaasPaymentId: 'pay_xyz' }),
    })
    expect(result!.status).toBe('PENDING')
  })

  it('POST /payments falha: Invoice reservada vira ERROR (nunca fica órfã sem registro local) sem lançar exceção', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    mockCreatePayment.mockRejectedValue(new Error('Asaas indisponível'))
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'ERROR' })

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-new' },
      data: { status: 'ERROR' },
    })
    expect(result!.status).toBe('ERROR')
  })
})

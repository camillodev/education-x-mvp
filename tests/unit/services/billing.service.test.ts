import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { forUnit, prisma } from '@/lib/db'
import {
  emitInvoice,
  emitBatchInvoices,
  emitUnitInvoices,
  emitDueInvoicesForActiveUnits,
  EnrollmentNotStartedError,
} from '@/lib/services/billing.service'

const mockCreatePayment = vi.fn()

vi.mock('@/lib/integration/asaas/client', () => ({
  getAsaasClient: vi.fn(() => ({
    createPayment: mockCreatePayment,
  })),
}))

// Student.nameEnc é PII criptografada (AES-256-GCM) — listInvoices precisa decriptografar antes
// de expor na listagem, mesmo padrão já usado em approval.service.ts (`decrypt(e.student.nameEnc)`).
// Mock determinístico: "enc:X" → "X", só pra teste conseguir asserir o nome descriptografado.
vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn(async (stored: string) => stored.replace(/^enc:/, '')),
}))

vi.mock('@/lib/db', () => {
  const invoiceFindUnique = vi.fn()
  const invoiceCreate = vi.fn()
  const invoiceUpdate = vi.fn()
  const invoiceFindMany = vi.fn()
  const invoiceCount = vi.fn()
  const enrollmentFindUniqueOrThrow = vi.fn()
  const enrollmentUpdate = vi.fn()
  const enrollmentFindMany = vi.fn()
  const unitFindMany = vi.fn()
  return {
    forUnit: vi.fn(() => ({
      invoice: {
        findUnique: invoiceFindUnique,
        create: invoiceCreate,
        update: invoiceUpdate,
        findMany: invoiceFindMany,
        count: invoiceCount,
      },
      enrollment: {
        findUniqueOrThrow: enrollmentFindUniqueOrThrow,
        update: enrollmentUpdate,
        findMany: enrollmentFindMany,
      },
    })),
    // emitDueInvoicesForActiveUnits usa prisma.unit direto (não forUnit — Unit não é
    // tenant-scoped, é a própria entidade tenant).
    prisma: { unit: { findMany: unitFindMany } },
  }
})

type MockForUnitDb = {
  invoice: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  enrollment: {
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
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
  amountCents: 45000, // igual a ENROLLMENT_BASE.finalPriceCents — mesma origem no fluxo normal
  netAmountCents: 45000,
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

  it('RN-13 retry: Invoice existente em ERROR é re-tentada contra a Asaas em vez de retornada direto — update final grava status:PENDING (nunca fica ERROR com boleto real válido)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    const erroredInvoice = { ...EXISTING_INVOICE, id: 'inv-err', status: 'ERROR' }
    db.invoice.findUnique.mockResolvedValue(erroredInvoice)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    mockCreatePayment.mockResolvedValue({
      id: 'pay_retry',
      status: 'PENDING',
      invoiceUrl: 'https://sandbox.asaas.com/i/retry',
      bankSlipUrl: 'https://sandbox.asaas.com/b/retry',
      barCode: '999',
    })
    // O mock ecoa o `data` recebido em vez de fabricar `status: 'PENDING'` — senão o teste
    // passa mesmo se o código de produção esquecer de gravar o status (bug real já visto aqui).
    db.invoice.update.mockImplementation(async (args: { data: object }) => ({ ...erroredInvoice, ...args.data }))

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).toHaveBeenCalledWith(expect.objectContaining({ value: 450 })) // = EXISTING_INVOICE.amountCents / 100, reaproveitado do existing
    expect(db.invoice.create).not.toHaveBeenCalled() // reaproveita a Invoice ERROR já reservada, não cria outra
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-err' },
      data: expect.objectContaining({ status: 'PENDING', asaasPaymentId: 'pay_retry' }),
    })
    expect(result!.status).toBe('PENDING')
  })

  it('RN-13 retry de 1ª competência PROPORTIONAL: cobra o valor já persistido na Invoice reservada, não o valor cheio recalculado', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    const proportionalErrored = {
      ...EXISTING_INVOICE,
      id: 'inv-err-prop',
      status: 'ERROR',
      amountCents: 15000, // valor proporcional já calculado e persistido na 1ª tentativa
      netAmountCents: 15000,
    }
    db.invoice.findUnique.mockResolvedValue(proportionalErrored)
    // isFirstChargeDone já é true (foi marcado na tentativa original) — enrollment.finalPriceCents
    // (45000) NÃO deve ser usado no retry, só o amountCents já persistido na Invoice (15000).
    db.enrollment.findUniqueOrThrow.mockResolvedValue({ ...ENROLLMENT_BASE, isFirstChargeDone: true })
    db.invoice.update.mockImplementation(async (args: { data: object }) => ({ ...proportionalErrored, ...args.data }))

    await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ value: 150 }) // 15000 centavos / 100, não 450 (valor cheio)
    )
  })

  it('RN-13 retry: Invoice ERROR mas com asaasPaymentId já preenchido não repete createPayment, e promove status pra PENDING (dado legado do bug antigo não fica ERROR pra sempre)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    const erroredWithPayment = { ...EXISTING_INVOICE, id: 'inv-err', status: 'ERROR', asaasPaymentId: 'pay_already_created' }
    db.invoice.findUnique.mockResolvedValue(erroredWithPayment)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    db.invoice.update.mockImplementation(async (args: { data: object }) => ({ ...erroredWithPayment, ...args.data }))

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).not.toHaveBeenCalled()
    expect(db.invoice.create).not.toHaveBeenCalled()
    expect(db.invoice.update).toHaveBeenCalledWith({ where: { id: 'inv-err' }, data: { status: 'PENDING' } })
    expect(result!.status).toBe('PENDING')
  })

  it('RN-13 retry: nova tentativa também falha → segue ERROR, sem lançar', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    const erroredInvoice = { ...EXISTING_INVOICE, id: 'inv-err', status: 'ERROR' }
    db.invoice.findUnique.mockResolvedValue(erroredInvoice)
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    mockCreatePayment.mockRejectedValue(new Error('Asaas indisponível de novo'))
    db.invoice.update.mockResolvedValue(erroredInvoice)

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(db.invoice.update).toHaveBeenCalledWith({ where: { id: 'inv-err' }, data: { status: 'ERROR' } })
    expect(result!.status).toBe('ERROR')
  })

  it('idempotência genuína: Invoice existente PENDING/PAID/BLOCKED/CANCELLED retorna direto, sem chamar Asaas de novo', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findUnique.mockResolvedValue(EXISTING_INVOICE) // status: PENDING

    const result = await emitInvoice('unit-1', 'enr-1', '2026-09', 'asaas_key')

    expect(result).toEqual(EXISTING_INVOICE)
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

describe('emitBatchInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agrega resultado por Enrollment ACTIVE do subjectId: emitted/blocked (RN-18)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }, { id: 'enr-2' }])
    // emitInvoice decide idempotência/status internamente — mock 1 findUnique por enrollment
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow
      .mockResolvedValueOnce({ ...ENROLLMENT_BASE, id: 'enr-1', guardian: { asaasCustomerId: null } }) // BLOCKED
      .mockResolvedValueOnce({ ...ENROLLMENT_BASE, id: 'enr-2' }) // PENDING
    db.invoice.create
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-1', status: 'BLOCKED' })
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-2', status: 'PENDING' })
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, id: 'inv-2', status: 'PENDING' })

    const result = await emitBatchInvoices('unit-1', 'subj-1', '2026-09', 'asaas_key')

    expect(db.enrollment.findMany).toHaveBeenCalledWith({
      where: { subjectId: 'subj-1', status: 'ACTIVE' },
      select: { id: true },
    })
    expect(result).toEqual({ emitted: 1, skipped: 0, blocked: 1, errors: 0 })
  })

  it('RN-13: uma Enrollment com Invoice ERROR do mesmo mês é re-tentada pelo lote, não pulada', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }])
    db.invoice.findUnique.mockResolvedValue({ ...RESERVED_INVOICE, id: 'inv-err', status: 'ERROR' })
    db.enrollment.findUniqueOrThrow.mockResolvedValue(ENROLLMENT_BASE)
    mockCreatePayment.mockResolvedValue({ id: 'pay_retry', status: 'PENDING', invoiceUrl: 'x', bankSlipUrl: 'y', barCode: 'z' })
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, id: 'inv-err', status: 'PENDING' })

    const result = await emitBatchInvoices('unit-1', 'subj-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).toHaveBeenCalled()
    expect(result).toEqual({ emitted: 1, skipped: 0, blocked: 0, errors: 0 })
  })

  it('BLOCKED não chama Asaas para nenhuma Enrollment do lote (RN-19)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }])
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({
      ...ENROLLMENT_BASE,
      id: 'enr-1',
      guardian: { asaasCustomerId: null },
    })
    db.invoice.create.mockResolvedValue({ ...RESERVED_INVOICE, status: 'BLOCKED' })

    await emitBatchInvoices('unit-1', 'subj-1', '2026-09', 'asaas_key')

    expect(mockCreatePayment).not.toHaveBeenCalled()
  })
})

describe('emitUnitInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca todos os Enrollment ACTIVE da Unit, sem filtro de subjectId (cron atinge todas as matérias)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }, { id: 'enr-2' }])
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow
      .mockResolvedValueOnce({ ...ENROLLMENT_BASE, id: 'enr-1' })
      .mockResolvedValueOnce({ ...ENROLLMENT_BASE, id: 'enr-2' })
    db.invoice.create
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-1' })
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-2' })
    db.invoice.update
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-1', status: 'PENDING' })
      .mockResolvedValueOnce({ ...RESERVED_INVOICE, id: 'inv-2', status: 'PENDING' })

    const result = await emitUnitInvoices('unit-1', '2026-09', 'asaas_key')

    expect(db.enrollment.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })
    expect(result).toEqual({ emitted: 2, skipped: 0, blocked: 0, errors: 0 })
  })

  it('não pega Enrollment CANCELLED/SUSPENDED — a query Prisma já filtra por status ACTIVE, o teste confirma que o filtro foi passado corretamente', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([])

    const result = await emitUnitInvoices('unit-1', '2026-09', 'asaas_key')

    expect(db.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } })
    )
    expect(result).toEqual({ emitted: 0, skipped: 0, blocked: 0, errors: 0 })
  })

  it('delega corretamente para emitForEnrollments: chama a Asaas para cada enrollment id retornado', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }])
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({ ...ENROLLMENT_BASE, id: 'enr-1' })
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING' })

    await emitUnitInvoices('unit-1', '2026-09', 'asaas_key')

    expect(db.enrollment.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'enr-1' } })
    )
    expect(mockCreatePayment).toHaveBeenCalledTimes(1)
  })
})

// Migrado de cron-billing.route.test.ts (achado de code review: seleção de Units elegíveis
// e orquestração RN-13 viviam no route handler do cron, não no service).
describe('emitDueInvoicesForActiveUnits', () => {
  const unitFindMany = prisma.unit.findMany as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('busca Units candidatas com a query Prisma esperada (status ACTIVE + autoBilling + closingDay)', async () => {
    unitFindMany.mockResolvedValue([])

    await emitDueInvoicesForActiveUnits('2026-03')

    expect(unitFindMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', billingConfig: { autoBilling: true } },
      select: { id: true, asaasApiKeyEnc: true, billingConfig: { select: { closingDay: true } } },
    })
  })

  it('gate por closingDay: Unit com closingDay maior que o dia corrente é pulada, não aparece em results', async () => {
    // "hoje" fixado em 2026-03-10 (dia 10)
    unitFindMany.mockResolvedValue([
      { id: 'unit-cedo', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } }, // <= 10: processa
      { id: 'unit-tarde', asaasApiKeyEnc: 'enc:chave2', billingConfig: { closingDay: 20 } }, // > 10: pula
    ])
    const db = forUnit('unit-cedo') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([])

    const results = await emitDueInvoicesForActiveUnits('2026-03')

    expect(results.map((r) => r.unitId)).toEqual(['unit-cedo'])
  })

  it('Unit sem asaasApiKeyEnc não chama emissão, mas entra em results com ok:false e error', async () => {
    unitFindMany.mockResolvedValue([
      { id: 'unit-sem-chave', asaasApiKeyEnc: null, billingConfig: { closingDay: 5 } },
    ])

    const results = await emitDueInvoicesForActiveUnits('2026-03')

    expect(results).toEqual([
      expect.objectContaining({ unitId: 'unit-sem-chave', ok: false, error: expect.any(String) }),
    ])
  })

  it('Unit com chave válida dentro do gate: emite e agrega resultado com os 4 campos', async () => {
    unitFindMany.mockResolvedValue([
      { id: 'unit-1', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } },
    ])
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }])
    db.invoice.findUnique.mockResolvedValue(null)
    db.enrollment.findUniqueOrThrow.mockResolvedValue({ ...ENROLLMENT_BASE, id: 'enr-1' })
    db.invoice.create.mockResolvedValue(RESERVED_INVOICE)
    db.invoice.update.mockResolvedValue({ ...RESERVED_INVOICE, status: 'PENDING' })

    const results = await emitDueInvoicesForActiveUnits('2026-03')

    expect(results).toEqual([
      expect.objectContaining({ unitId: 'unit-1', ok: true, emitted: 1, skipped: 0, blocked: 0, errors: 0 }),
    ])
  })

  it('Unit cuja emissão rejeita não derruba as demais — entra em results com ok:false, outras continuam', async () => {
    unitFindMany.mockResolvedValue([
      { id: 'unit-falha', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } },
      { id: 'unit-ok', asaasApiKeyEnc: 'enc:chave2', billingConfig: { closingDay: 5 } },
    ])
    const dbFalha = forUnit('unit-falha') as unknown as MockForUnitDb
    dbFalha.enrollment.findMany.mockRejectedValueOnce(new Error('Asaas fora do ar'))
    const dbOk = forUnit('unit-ok') as unknown as MockForUnitDb
    dbOk.enrollment.findMany.mockResolvedValueOnce([])

    const results = await emitDueInvoicesForActiveUnits('2026-03')

    expect(results).toEqual([
      expect.objectContaining({ unitId: 'unit-falha', ok: false, error: 'Asaas fora do ar' }),
      expect.objectContaining({ unitId: 'unit-ok', ok: true, emitted: 0, skipped: 0, blocked: 0, errors: 0 }),
    ])
  })
})

// EDU-27 — lista de cobranças com filtros. listInvoices ainda não existe (RED): import
// dinâmico dentro de cada teste para não derrubar o módulo inteiro (e os describes acima)
// caso o export falhe no load.
describe('listInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeInvoiceRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'inv-1',
      unitId: 'unit-1',
      enrollmentId: 'enr-1',
      status: 'PENDING',
      referenceMonth: '2026-09',
      amountCents: 45000,
      dueDate: new Date('2026-09-10T00:00:00Z'),
      enrollment: {
        guardian: { id: 'guardian-1', name: 'Maria' },
        student: { id: 'student-1', nameEnc: 'enc:joao' },
        subject: { id: 'subj-1', name: 'Matemática' },
      },
      ...overrides,
    }
  }

  it('AC1: sem filtro retorna Invoices da Unit via forUnit, paginado 20 por página (page default 1)', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    vi.mocked(forUnit).mockClear()
    db.invoice.findMany.mockResolvedValue([makeInvoiceRow()])
    db.invoice.count.mockResolvedValue(1)

    const result = await listInvoices('unit-1', {})

    // enrollmentId é necessário pro frontend montar POST /api/enrollments/[id]/invoices
    // (reemissão, EDU-24) — sem ele a tela /cobrancas não teria como reemitir uma Invoice
    // ERROR (achado do RED do EDU-27 frontend).
    expect(result.items[0].enrollmentId).toBe('enr-1')
    expect(forUnit).toHaveBeenCalledWith('unit-1')
    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    )
    expect(result.page).toBe(1)
    expect(result.items).toHaveLength(1)
  })

  it('AC2: filters.status = BLOCKED retorna só Invoices BLOCKED', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([makeInvoiceRow({ status: 'BLOCKED' })])
    db.invoice.count.mockResolvedValue(1)

    await listInvoices('unit-1', { status: 'BLOCKED' })

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'BLOCKED' }) })
    )
  })

  it('AC3: filters.referenceMonth = "2026-06" retorna só Invoices desse mês', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([])
    db.invoice.count.mockResolvedValue(0)

    await listInvoices('unit-1', { referenceMonth: '2026-06' })

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ referenceMonth: '2026-06' }) })
    )
  })

  it('AC4: página 2 retorna itens 21-40 (skip: 20, take: 20), page: 2', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([makeInvoiceRow({ id: 'inv-21' })])
    db.invoice.count.mockResolvedValue(25)

    const result = await listInvoices('unit-1', { page: 2 })

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    )
    expect(result.page).toBe(2)
  })

  it('AC5: total/totalPages corretos — 25 registros, 20/página → totalPages: 2, total: 25', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue(Array.from({ length: 20 }, (_, i) => makeInvoiceRow({ id: `inv-${i}` })))
    db.invoice.count.mockResolvedValue(25)

    const result = await listInvoices('unit-1', {})

    expect(result.total).toBe(25)
    expect(result.totalPages).toBe(2)
  })

  it('count recebe o mesmo where que findMany — senão totalPages mente sob filtro (ex: status BLOCKED)', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([])
    db.invoice.count.mockResolvedValue(0)

    await listInvoices('unit-1', { status: 'BLOCKED' })

    const findManyWhere = db.invoice.findMany.mock.calls[0][0].where
    const countWhere = db.invoice.count.mock.calls[0][0].where
    expect(countWhere).toEqual(findManyWhere)
  })

  it('AC6: busca as relações necessárias para exibição (responsável, aluno, matéria) via include/select', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([makeInvoiceRow()])
    db.invoice.count.mockResolvedValue(1)

    await listInvoices('unit-1', {})

    const call = db.invoice.findMany.mock.calls[0][0]
    const relationsScope = JSON.stringify(call.include ?? call.select)
    expect(relationsScope).toContain('guardian')
    expect(relationsScope).toContain('student')
    expect(relationsScope).toContain('subject')
  })

  it('decripta Student.nameEnc antes de expor na listagem (PII criptografada, nunca em texto plano na resposta)', async () => {
    // Student.nameEnc é AES-256-GCM (prisma/schema.prisma) — mesmo padrão de
    // approval.service.ts (decrypt(e.student.nameEnc)). Sem isso, a tela de /cobrancas mostraria
    // o valor cifrado ("enc:joao") em vez do nome do aluno.
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([makeInvoiceRow({ enrollment: { guardian: { id: 'guardian-1', name: 'Maria' }, student: { id: 'student-1', nameEnc: 'enc:joao' }, subject: { id: 'subj-1', name: 'Matemática' } } })])
    db.invoice.count.mockResolvedValue(1)

    const result = await listInvoices('unit-1', {})

    expect(JSON.stringify(result.items)).not.toContain('enc:joao')
    expect(JSON.stringify(result.items)).toContain('joao')
  })

  it('AC7: Unit sem nenhuma Invoice retorna items: [] e total: 0', async () => {
    const { listInvoices } = await import('@/lib/services/billing.service')
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.invoice.findMany.mockResolvedValue([])
    db.invoice.count.mockResolvedValue(0)

    const result = await listInvoices('unit-1', {})

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

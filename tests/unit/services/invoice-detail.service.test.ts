import { describe, it, expect, vi, beforeEach } from 'vitest'
import { forUnit } from '@/lib/db'
import {
  getInvoiceDetail,
  cancelInvoice,
  calculateLateFeeAndInterest,
  InvoiceNotFoundError,
  InvoiceInvalidStateError,
} from '@/lib/services/invoice-detail.service'

const mockCancelPayment = vi.fn()

vi.mock('@/lib/integration/asaas/client', () => ({
  getAsaasClient: vi.fn(() => ({
    cancelPayment: mockCancelPayment,
  })),
}))

vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn(async (v: string) => v.replace('enc:', '')),
}))

vi.mock('@/lib/db', () => {
  const invoiceFindUnique = vi.fn()
  const invoiceFindFirst = vi.fn()
  const invoiceUpdate = vi.fn()
  return {
    forUnit: vi.fn(() => ({
      invoice: {
        findUnique: invoiceFindUnique,
        findFirst: invoiceFindFirst,
        update: invoiceUpdate,
      },
    })),
  }
})

type MockForUnitDb = {
  invoice: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

// Testes de getInvoiceDetail/cancelInvoice não sabem se a implementação vai usar
// findUnique ou findFirst internamente (é `forUnit` quem decide o rewrite) — resolvemos
// os dois mocks pro mesmo valor em cada teste pra não depender dessa escolha.
function mockInvoiceLookup(db: MockForUnitDb, value: unknown) {
  db.invoice.findUnique.mockResolvedValue(value)
  db.invoice.findFirst.mockResolvedValue(value)
}

const BILLING_CONFIG = { lateFeePercent: 200, monthlyInterestBp: 100 }

// Invoice não tem relação direta com student/subject/guardian no schema — essas relações
// pertencem a Enrollment (Invoice → Enrollment → Student/Subject/Guardian). O fixture reflete
// o include real (aninhado sob enrollment), não uma forma achatada hipotética.
const INVOICE_DETAIL_ROW = {
  id: 'inv-1',
  unitId: 'unit-1',
  status: 'PENDING',
  amountCents: 45000,
  netAmountCents: 45000,
  referenceMonth: '2026-09',
  dueDate: new Date('2026-09-10T00:00:00Z'),
  emittedAt: new Date('2026-09-01T00:00:00Z'),
  paidAt: null,
  paidAmountCents: null,
  asaasPaymentId: 'pay_abc',
  asaasPaymentUrl: 'https://sandbox.asaas.com/i/abc',
  asaasBankSlipUrl: 'https://sandbox.asaas.com/b/abc',
  asaasBarCode: '000',
  enrollment: {
    discountType: null,
    discountValueBp: null,
    discountValueCents: null,
    student: { nameEnc: 'enc:João' },
    subject: { name: 'Matemática' },
    guardian: { asaasCustomerId: 'cus_123' },
  },
  unit: { billingConfig: BILLING_CONFIG },
  payments: [],
}

describe('calculateLateFeeAndInterest', () => {
  it('lateFeePercent=200 (2% em basis points), amountCents=100000 → lateFeeCents=2000', () => {
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 200, monthlyInterestBp: 0 },
      100000,
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-07-02T00:00:00Z')
    )
    expect(result.lateFeeCents).toBe(2000)
  })

  it('monthlyInterestBp=100 (1% a.m.), amountCents=100000, 12 dias de atraso → interestCents=400', () => {
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 0, monthlyInterestBp: 100 },
      100000,
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-07-13T00:00:00Z') // 12 dias após dueDate
    )
    expect(result.interestCents).toBe(400)
  })

  it('dueDate e now no mesmo dia UTC → diasEmAtraso vira o mínimo 1, nunca 0', () => {
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 0, monthlyInterestBp: 100 },
      100000,
      new Date('2026-07-10T00:00:00Z'),
      new Date('2026-07-10T18:00:00Z') // mesmo dia UTC, ainda não fechou 24h
    )
    // Se o mínimo de 1 dia não fosse aplicado, o resultado seria 0 (0 dias de atraso).
    // round(100000 * 100/10000 * 1/30) = round(33.33) = 33
    expect(result.interestCents).toBe(33)
  })

  it('diferença de dias é calculada pela DATA em UTC (truncamento), não pela divisão bruta de ms — dueDate não-meia-noite expõe a diferença', () => {
    // dueDate=2026-07-10T21:00:00Z, now=2026-07-12T02:00:00Z:
    // diferença bruta em ms ≈ 29h → 1 dia se truncado por 86400000 direto.
    // Mas pela regra (olhar só a DATA em UTC: 10/jul vs 12/jul), a diferença é 2 dias.
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 0, monthlyInterestBp: 100 },
      100000,
      new Date('2026-07-10T21:00:00Z'),
      new Date('2026-07-12T02:00:00Z')
    )
    // round(100000 * 100/10000 * 2/30) = round(66.67) = 67
    expect(result.interestCents).toBe(67)
  })

  it('lateFeePercent=0 → lateFeeCents=0', () => {
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 0, monthlyInterestBp: 100 },
      100000,
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-07-05T00:00:00Z')
    )
    expect(result.lateFeeCents).toBe(0)
  })

  it('now < dueDate (cobrança ainda não venceu) → lateFeeCents=0 e interestCents=0, mesmo com lateFeePercent/monthlyInterestBp positivos (achado de code review)', () => {
    const result = calculateLateFeeAndInterest(
      { lateFeePercent: 200, monthlyInterestBp: 100 },
      100000,
      new Date('2026-07-10T00:00:00Z'),
      new Date('2026-07-05T00:00:00Z') // 5 dias ANTES do vencimento
    )
    expect(result.lateFeeCents).toBe(0)
    expect(result.interestCents).toBe(0)
  })
})

describe('getInvoiceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna InvoiceDetail com student.name já decriptado quando a Invoice pertence à Unit', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, INVOICE_DETAIL_ROW)

    const result = await getInvoiceDetail('unit-1', 'inv-1')

    expect(result).not.toBeNull()
    expect(result!.student.name).toBe('João')
    expect(result!.id).toBe('inv-1')
    expect(result!.asaasPaymentId).toBe('pay_abc')
  })

  it('nunca vaza campos de BillingConfig além de lateFeePercent/monthlyInterestBp — regressão de vazamento de secret (achado de code review, EDU-28)', async () => {
    // Fixture "gordo": simula o que um `include: { billingConfig: true }` real traria —
    // TODAS as colunas da tabela, inclusive um secret criptografado. Se o service usa
    // `select` explícito (correto), esses campos extras não chegam no resultado.
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, {
      ...INVOICE_DETAIL_ROW,
      unit: {
        billingConfig: {
          ...BILLING_CONFIG,
          asaasWebhookTokenEnc: 'enc:secret-nunca-deveria-vazar',
          municipalRegistration: '123456',
          planId: 'pro',
          planPriceCents: 9900,
        },
      },
    })

    const result = await getInvoiceDetail('unit-1', 'inv-1')

    expect(result!.billingConfig).toEqual(BILLING_CONFIG)
    expect(result).not.toHaveProperty('billingConfig.asaasWebhookTokenEnc')
    expect(JSON.stringify(result)).not.toContain('secret-nunca-deveria-vazar')
  })

  it('Invoice existe mas pertence a outra Unit → retorna null (isolamento via forUnit)', async () => {
    const db = forUnit('unit-2') as unknown as MockForUnitDb
    // forUnit('unit-2') simula não encontrar a Invoice que só existe em unit-1.
    mockInvoiceLookup(db, null)

    const result = await getInvoiceDetail('unit-2', 'inv-1')

    expect(result).toBeNull()
  })

  it('Invoice inexistente → retorna null', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, null)

    const result = await getInvoiceDetail('unit-1', 'inv-inexistente')

    expect(result).toBeNull()
  })
})

describe('cancelInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('status PENDING com asaasPaymentId preenchido → chama cancelPayment e atualiza status para CANCELLED', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, { ...INVOICE_DETAIL_ROW, status: 'PENDING', asaasPaymentId: 'pay_abc' })
    db.invoice.update.mockResolvedValue({ ...INVOICE_DETAIL_ROW, status: 'CANCELLED' })

    const result = await cancelInvoice('unit-1', 'inv-1', 'asaas_key')

    expect(mockCancelPayment).toHaveBeenCalledWith('pay_abc')
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'CANCELLED' },
    })
    expect(result.status).toBe('CANCELLED')
  })

  it('status PENDING mas asaasPaymentId=null (janela de falha antes da resposta Asaas) → NÃO chama cancelPayment, mas ainda marca CANCELLED', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, { ...INVOICE_DETAIL_ROW, status: 'PENDING', asaasPaymentId: null })
    db.invoice.update.mockResolvedValue({ ...INVOICE_DETAIL_ROW, status: 'CANCELLED', asaasPaymentId: null })

    const result = await cancelInvoice('unit-1', 'inv-1', 'asaas_key')

    expect(mockCancelPayment).not.toHaveBeenCalled()
    expect(db.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'CANCELLED' },
    })
    expect(result.status).toBe('CANCELLED')
  })

  it.each(['PAID', 'OVERDUE', 'CANCELLED'])(
    'status %s (diferente de PENDING) → lança InvoiceInvalidStateError, sem chamar Asaas nem atualizar o banco',
    async (status) => {
      const db = forUnit('unit-1') as unknown as MockForUnitDb
      mockInvoiceLookup(db, { ...INVOICE_DETAIL_ROW, status })

      await expect(cancelInvoice('unit-1', 'inv-1', 'asaas_key')).rejects.toThrow(
        InvoiceInvalidStateError
      )
      expect(mockCancelPayment).not.toHaveBeenCalled()
      expect(db.invoice.update).not.toHaveBeenCalled()
    }
  )

  it('client.cancelPayment falha → Invoice permanece com o status anterior e o erro é propagado (nunca fingir sucesso)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    mockInvoiceLookup(db, { ...INVOICE_DETAIL_ROW, status: 'PENDING', asaasPaymentId: 'pay_abc' })
    mockCancelPayment.mockRejectedValue(new Error('Asaas indisponível'))

    await expect(cancelInvoice('unit-1', 'inv-1', 'asaas_key')).rejects.toThrow('Asaas indisponível')
    expect(db.invoice.update).not.toHaveBeenCalled()
  })

  it('Invoice inexistente ou de outra Unit → lança InvoiceNotFoundError', async () => {
    const db = forUnit('unit-2') as unknown as MockForUnitDb
    mockInvoiceLookup(db, null)

    await expect(cancelInvoice('unit-2', 'inv-1', 'asaas_key')).rejects.toThrow(InvoiceNotFoundError)
    expect(mockCancelPayment).not.toHaveBeenCalled()
    expect(db.invoice.update).not.toHaveBeenCalled()
  })
})

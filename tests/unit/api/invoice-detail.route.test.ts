import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  const { withSchoolAdmin } = await import('./_school-admin-mock')
  return withSchoolAdmin(actual, (...a: unknown[]) => getUnitContext(...a))
})

const getInvoiceDetail = vi.fn()
const cancelInvoice = vi.fn()
vi.mock('@/lib/services/invoice-detail.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/invoice-detail.service')>('@/lib/services/invoice-detail.service')
  return {
    ...actual,
    getInvoiceDetail: (...a: unknown[]) => getInvoiceDetail(...a),
    cancelInvoice: (...a: unknown[]) => cancelInvoice(...a),
  }
})

vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual }
})

const findUnique = vi.fn()
const forUnit = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } },
  forUnit: (...a: unknown[]) => forUnit(...a),
}))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

import { GET, DELETE } from '@/app/api/invoices/[id]/route'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(method: string) {
  return new Request('http://x', { method })
}

const CTX = { role: 'orientador', unitId: 'unit-1', userId: 'u1' }

beforeEach(() => {
  getUnitContext.mockReset()
  getInvoiceDetail.mockReset()
  cancelInvoice.mockReset()
  findUnique.mockReset()
  forUnit.mockReset()
  decrypt.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/invoices/[id]', () => {
  it('200 com { invoice } quando getInvoiceDetail retorna um objeto', async () => {
    getUnitContext.mockResolvedValue(CTX)
    const invoice = { id: 'inv-1', status: 'PENDING' }
    getInvoiceDetail.mockResolvedValue(invoice)

    const res = await GET(makeRequest('GET'), makeParams('inv-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ invoice })
    expect(getInvoiceDetail).toHaveBeenCalledWith('unit-1', 'inv-1')
  })

  it('404 quando getInvoiceDetail retorna null', async () => {
    getUnitContext.mockResolvedValue(CTX)
    getInvoiceDetail.mockResolvedValue(null)

    const res = await GET(makeRequest('GET'), makeParams('inv-1'))

    expect(res.status).toBe(404)
  })

  it('403 for a non-school user — getInvoiceDetail is never called', async () => {
    getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'a1' })

    const res = await GET(makeRequest('GET'), makeParams('inv-1'))

    expect(res.status).toBe(403)
    expect(getInvoiceDetail).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/invoices/[id]', () => {
  it('200 com { invoice } quando cancelInvoice resolve com sucesso', async () => {
    getUnitContext.mockResolvedValue(CTX)
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:x' })
    decrypt.mockResolvedValue('chave-real')
    const invoice = { id: 'inv-1', status: 'CANCELLED' }
    cancelInvoice.mockResolvedValue(invoice)

    const res = await DELETE(makeRequest('DELETE'), makeParams('inv-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ invoice })
    expect(cancelInvoice).toHaveBeenCalledWith('unit-1', 'inv-1', 'chave-real')
  })

  it('409 quando Unit não tem asaasApiKeyEnc — cancelInvoice nunca é chamado', async () => {
    getUnitContext.mockResolvedValue(CTX)
    findUnique.mockResolvedValue({ asaasApiKeyEnc: null })

    const res = await DELETE(makeRequest('DELETE'), makeParams('inv-1'))

    expect(res.status).toBe(409)
    expect(decrypt).not.toHaveBeenCalled()
    expect(cancelInvoice).not.toHaveBeenCalled()
  })

  it('409 quando cancelInvoice lança InvoiceInvalidStateError', async () => {
    getUnitContext.mockResolvedValue(CTX)
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:x' })
    decrypt.mockResolvedValue('chave-real')
    const { InvoiceInvalidStateError } = await import('@/lib/services/invoice-detail.service')
    cancelInvoice.mockRejectedValue(new InvoiceInvalidStateError())

    const res = await DELETE(makeRequest('DELETE'), makeParams('inv-1'))

    expect(res.status).toBe(409)
  })

  it('404 quando cancelInvoice lança InvoiceNotFoundError', async () => {
    getUnitContext.mockResolvedValue(CTX)
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:x' })
    decrypt.mockResolvedValue('chave-real')
    const { InvoiceNotFoundError } = await import('@/lib/services/invoice-detail.service')
    cancelInvoice.mockRejectedValue(new InvoiceNotFoundError())

    const res = await DELETE(makeRequest('DELETE'), makeParams('inv-1'))

    expect(res.status).toBe(404)
  })
})

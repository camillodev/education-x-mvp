import { it, expect, vi, beforeEach, afterEach } from 'vitest'

const guardOrientador = vi.fn()
vi.mock('@/lib/api/guard', () => ({ guardOrientador: (...a: unknown[]) => guardOrientador(...a) }))

vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual }
})

vi.mock('@/lib/services/invoice-detail.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/invoice-detail.service')>('@/lib/services/invoice-detail.service')
  return { ...actual }
})

const findUnique = vi.fn()
const invoiceFindUnique = vi.fn()
const forUnit = vi.fn((unitId: string) => {
  void unitId
  return { invoice: { findUnique: (...a: unknown[]) => invoiceFindUnique(...a) } }
})
vi.mock('@/lib/db', () => ({
  prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } },
  forUnit: (unitId: string) => forUnit(unitId),
}))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

const getPixQrCode = vi.fn()
const getAsaasClient = vi.fn((apiKey: string) => {
  void apiKey
  return { getPixQrCode: (...a: unknown[]) => getPixQrCode(...a) }
})
vi.mock('@/lib/integration/asaas/client', () => ({ getAsaasClient: (apiKey: string) => getAsaasClient(apiKey) }))

import { GET } from '@/app/api/invoices/[id]/pix/route'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest() {
  return new Request('http://x', { method: 'GET' })
}

const CTX = { role: 'orientador', unitId: 'unit-1', userId: 'u1' }

beforeEach(() => {
  guardOrientador.mockReset()
  findUnique.mockReset()
  invoiceFindUnique.mockReset()
  forUnit.mockClear()
  decrypt.mockReset()
  getPixQrCode.mockReset()
  getAsaasClient.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('200 com { pix } quando Invoice tem asaasPaymentId e client resolve o QR', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue({ asaasPaymentId: 'pay_abc' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:x' })
  decrypt.mockResolvedValue('chave-real')
  const pix = { encodedImage: 'img', payload: 'copiaecola', expirationDate: '2026-09-10' }
  getPixQrCode.mockResolvedValue(pix)

  const res = await GET(makeRequest(), makeParams('inv-1'))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body).toEqual({ pix })
  expect(forUnit).toHaveBeenCalledWith('unit-1')
  expect(invoiceFindUnique).toHaveBeenCalledWith({ where: { id: 'inv-1' } })
  expect(getAsaasClient).toHaveBeenCalledWith('chave-real')
  expect(getPixQrCode).toHaveBeenCalledWith('pay_abc')
})

it('404 quando Invoice não encontrada', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue(null)

  const res = await GET(makeRequest(), makeParams('inv-1'))

  expect(res.status).toBe(404)
  expect(findUnique).not.toHaveBeenCalled()
  expect(getPixQrCode).not.toHaveBeenCalled()
})

it('404 quando Invoice encontrada mas ainda não emitida na Asaas (asaasPaymentId null)', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue({ asaasPaymentId: null })

  const res = await GET(makeRequest(), makeParams('inv-1'))

  expect(res.status).toBe(404)
  expect(findUnique).not.toHaveBeenCalled()
  expect(getPixQrCode).not.toHaveBeenCalled()
})

it('409 quando Unit não tem asaasApiKeyEnc', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue({ asaasPaymentId: 'pay_abc' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: null })

  const res = await GET(makeRequest(), makeParams('inv-1'))

  expect(res.status).toBe(409)
  expect(decrypt).not.toHaveBeenCalled()
  expect(getPixQrCode).not.toHaveBeenCalled()
})

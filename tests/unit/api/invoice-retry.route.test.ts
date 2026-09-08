import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'

const guardOrientador = vi.fn()
vi.mock('@/lib/api/guard', () => ({ guardOrientador: (...a: unknown[]) => guardOrientador(...a) }))

const emitInvoice = vi.fn()
vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual, emitInvoice: (...a: unknown[]) => emitInvoice(...a) }
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

import { POST } from '@/app/api/invoices/[id]/retry/route'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest() {
  return new Request('http://x', { method: 'POST' })
}

const CTX = { role: 'orientador', unitId: 'unit-1', userId: 'u1' }

beforeEach(() => {
  guardOrientador.mockReset()
  emitInvoice.mockReset()
  findUnique.mockReset()
  invoiceFindUnique.mockReset()
  forUnit.mockClear()
  decrypt.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('200 reemite Invoice existente via emitInvoice', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue({ enrollmentId: 'enr-1', referenceMonth: '2026-09' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:x' })
  decrypt.mockResolvedValue('chave-real')
  const invoice = { id: 'inv-1', status: 'PENDING' }
  emitInvoice.mockResolvedValue(invoice)

  const res = await POST(makeRequest(), makeParams('inv-1'))
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body).toEqual({ invoice })
  expect(forUnit).toHaveBeenCalledWith('unit-1')
  expect(invoiceFindUnique).toHaveBeenCalledWith({ where: { id: 'inv-1' } })
  expect(emitInvoice).toHaveBeenCalledWith('unit-1', 'enr-1', '2026-09', 'chave-real')
})

it('404 quando Invoice não existe — emitInvoice nunca é chamado', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue(null)

  const res = await POST(makeRequest(), makeParams('inv-1'))

  expect(res.status).toBe(404)
  expect(emitInvoice).not.toHaveBeenCalled()
})

it('409 quando Unit não tem asaasApiKeyEnc', async () => {
  guardOrientador.mockResolvedValue(CTX)
  invoiceFindUnique.mockResolvedValue({ enrollmentId: 'enr-1', referenceMonth: '2026-09' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: null })

  const res = await POST(makeRequest(), makeParams('inv-1'))

  expect(res.status).toBe(409)
  expect(invoiceFindUnique).toHaveBeenCalled()
  expect(decrypt).not.toHaveBeenCalled()
  expect(emitInvoice).not.toHaveBeenCalled()
})

it('guard nega → devolve a resposta do guard direto, sem chamar forUnit', async () => {
  const denied = NextResponse.json({ error: 'Apenas a escola pode executar esta ação.', code: 'FORBIDDEN' }, { status: 403 })
  guardOrientador.mockResolvedValue(denied)

  const res = await POST(makeRequest(), makeParams('inv-1'))

  expect(res).toBe(denied)
  expect(forUnit).not.toHaveBeenCalled()
  expect(emitInvoice).not.toHaveBeenCalled()
})

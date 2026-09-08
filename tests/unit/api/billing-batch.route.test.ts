import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const emitBatchInvoices = vi.fn()
vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual, emitBatchInvoices: (...a: unknown[]) => emitBatchInvoices(...a) }
})

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({
  // resolveUnitAsaasKey (billing.service.ts) usa forUnit(unitId).unit.findUnique.
  forUnit: () => ({ unit: { findUnique: (...a: unknown[]) => findUnique(...a) } }),
}))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

import { POST } from '@/app/api/billing/batch/route'

function makeRequest(body: unknown) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  getUnitContext.mockReset()
  emitBatchInvoices.mockReset()
  findUnique.mockReset()
  decrypt.mockReset()
})

it('200 emite em lote por subjectId e retorna o resumo agregado (RN-18)', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:chave' })
  decrypt.mockResolvedValue('chave-real')
  emitBatchInvoices.mockResolvedValue({ emitted: 3, skipped: 1, blocked: 2, errors: 0 })

  const res = await POST(makeRequest({ subjectId: 'subj-1' }))
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({ emitted: 3, skipped: 1, blocked: 2, errors: 0 })
  expect(emitBatchInvoices).toHaveBeenCalledWith(
    'unit-1',
    'subj-1',
    expect.stringMatching(/^\d{4}-\d{2}$/),
    'chave-real'
  )
})

it('400 quando subjectId não é informado', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })

  const res = await POST(makeRequest({}))

  expect(res.status).toBe(400)
  expect(emitBatchInvoices).not.toHaveBeenCalled()
})

it('403 para admin', async () => {
  getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

  const res = await POST(makeRequest({ subjectId: 'subj-1' }))

  expect(res.status).toBe(403)
  expect(emitBatchInvoices).not.toHaveBeenCalled()
})

it('409 quando Unit não tem asaasApiKeyEnc — nunca chama emitBatchInvoices com chave vazia', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})

  const res = await POST(makeRequest({ subjectId: 'subj-1' }))

  expect(res.status).toBe(409)
  expect(decrypt).not.toHaveBeenCalled()
  expect(emitBatchInvoices).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})

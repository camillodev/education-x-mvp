import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const emitInvoice = vi.fn()
vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual, emitInvoice: (...a: unknown[]) => emitInvoice(...a) }
})

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } } }))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

import { POST } from '@/app/api/enrollments/[id]/invoices/route'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: unknown) {
  return new Request('http://x', { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

beforeEach(() => {
  getUnitContext.mockReset()
  emitInvoice.mockReset()
  findUnique.mockReset()
  decrypt.mockReset()
})

it('200 emite Invoice avulsa pra Enrollment (mês corrente por padrão) — RN-17', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:chave' })
  decrypt.mockResolvedValue('chave-real')
  emitInvoice.mockResolvedValue({ id: 'inv-1', status: 'PENDING' })

  const res = await POST(makeRequest(), makeParams('enr-1'))

  expect(res.status).toBe(200)
  expect(emitInvoice).toHaveBeenCalledWith(
    'unit-1',
    'enr-1',
    expect.stringMatching(/^\d{4}-\d{2}$/),
    'chave-real'
  )
})

it('200 usa referenceMonth do body quando informado', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:chave' })
  decrypt.mockResolvedValue('chave-real')
  emitInvoice.mockResolvedValue({ id: 'inv-1', status: 'PENDING' })

  const res = await POST(makeRequest({ referenceMonth: '2026-12' }), makeParams('enr-1'))

  expect(res.status).toBe(200)
  expect(emitInvoice).toHaveBeenCalledWith('unit-1', 'enr-1', '2026-12', 'chave-real')
})

it('403 para admin', async () => {
  getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

  const res = await POST(makeRequest(), makeParams('enr-1'))

  expect(res.status).toBe(403)
  expect(emitInvoice).not.toHaveBeenCalled()
})

it('422 quando Enrollment não tem startedAt para 1ª competência proporcional', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc:chave' })
  decrypt.mockResolvedValue('chave-real')
  const { EnrollmentNotStartedError } = await import('@/lib/services/billing.service')
  emitInvoice.mockRejectedValue(new EnrollmentNotStartedError())
  vi.spyOn(console, 'error').mockImplementation(() => {})

  const res = await POST(makeRequest(), makeParams('enr-1'))

  expect(res.status).toBe(422)
  vi.restoreAllMocks()
})

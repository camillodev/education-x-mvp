import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const listInvoices = vi.fn()
vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual, listInvoices: (...a: unknown[]) => listInvoices(...a) }
})

// GET /api/invoices ainda não existe (RED) — import dinâmico dentro de cada teste,
// não no top-level, senão a suíte inteira falha no load do módulo em vez de reportar
// falhas de asserção por teste.
function makeRequest(query = '') {
  return new NextRequest(`http://localhost/api/invoices${query}`)
}

beforeEach(() => {
  getUnitContext.mockReset()
  listInvoices.mockReset()
})

it('401 sem sessão (guard falha por UnauthorizedError)', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  const { UnauthorizedError } = await import('@/lib/auth/unit-context')
  getUnitContext.mockRejectedValue(new UnauthorizedError())

  const res = await GET(makeRequest())

  expect(res.status).toBe(401)
  expect(listInvoices).not.toHaveBeenCalled()
})

it('403 quando role não é orientador (admin não é dono da lista de cobranças)', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

  const res = await GET(makeRequest())

  expect(res.status).toBe(403)
  expect(listInvoices).not.toHaveBeenCalled()
})

it('200 sem query params: chama listInvoices com unitId da sessão e devolve items/page/totalPages/total', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listInvoices.mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 })

  const res = await GET(makeRequest())

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toEqual({ items: [], page: 1, totalPages: 0, total: 0 })
  expect(listInvoices).toHaveBeenCalledWith('unit-1', {})
})

it('?status=BLOCKED passa o filtro pro service', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listInvoices.mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 })

  const res = await GET(makeRequest('?status=BLOCKED'))

  expect(res.status).toBe(200)
  expect(listInvoices).toHaveBeenCalledWith('unit-1', expect.objectContaining({ status: 'BLOCKED' }))
})

it('?referenceMonth=2026-06 passa o filtro pro service', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listInvoices.mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 })

  const res = await GET(makeRequest('?referenceMonth=2026-06'))

  expect(res.status).toBe(200)
  expect(listInvoices).toHaveBeenCalledWith('unit-1', expect.objectContaining({ referenceMonth: '2026-06' }))
})

it('?status=VALOR_INVALIDO não é um InvoiceStatus válido → 400 (Zod rejeita)', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })

  const res = await GET(makeRequest('?status=VALOR_INVALIDO'))

  expect(res.status).toBe(400)
  expect(listInvoices).not.toHaveBeenCalled()
})

it('?page=2 passa page=2 pro service', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listInvoices.mockResolvedValue({ items: [], page: 2, totalPages: 2, total: 25 })

  const res = await GET(makeRequest('?page=2'))

  expect(res.status).toBe(200)
  expect(listInvoices).toHaveBeenCalledWith('unit-1', expect.objectContaining({ page: 2 }))
})

it('?unitId=unit-hacker no query é ignorado — unitId sempre vem da sessão Clerk, nunca de parâmetro HTTP (regra 7 CLAUDE.md)', async () => {
  const { GET } = await import('@/app/api/invoices/route')
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listInvoices.mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 })

  const res = await GET(makeRequest('?unitId=unit-hacker&status=BLOCKED'))

  expect(res.status).toBe(200)
  expect(listInvoices).toHaveBeenCalledWith('unit-1', expect.objectContaining({ status: 'BLOCKED' }))
  expect(listInvoices).not.toHaveBeenCalledWith('unit-hacker', expect.anything())
})

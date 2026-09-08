import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const emitDueInvoicesForActiveUnits = vi.fn()
vi.mock('@/lib/services/billing.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/billing.service')>('@/lib/services/billing.service')
  return { ...actual, emitDueInvoicesForActiveUnits: (...a: unknown[]) => emitDueInvoicesForActiveUnits(...a) }
})

import { GET } from '@/app/api/cron/billing/route'

function makeRequest(authHeader?: string) {
  const headers = new Headers()
  if (authHeader) headers.set('Authorization', authHeader)
  return new Request('http://x', { method: 'GET', headers })
}

const ORIGINAL_ENV = process.env.CRON_SECRET

beforeEach(() => {
  emitDueInvoicesForActiveUnits.mockReset()
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
})

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_ENV
  vi.useRealTimers()
})

// A rota só autentica e delega — o gate por closingDay, decrypt e agregação de resultados
// vivem em emitDueInvoicesForActiveUnits (billing.service.test.ts), extraídos daqui como
// achado de code review (lógica de negócio não pertence ao route handler).

it('401 sem Authorization header', async () => {
  const res = await GET(makeRequest())
  expect(res.status).toBe(401)
  expect(emitDueInvoicesForActiveUnits).not.toHaveBeenCalled()
})

it('401 com Bearer token errado', async () => {
  const res = await GET(makeRequest('Bearer token-errado'))
  expect(res.status).toBe(401)
  expect(emitDueInvoicesForActiveUnits).not.toHaveBeenCalled()
})

it('500 sem CRON_SECRET configurado — nunca aceita qualquer token quando o secret não existe', async () => {
  delete process.env.CRON_SECRET
  const res = await GET(makeRequest('Bearer qualquer-coisa'))
  expect(res.status).toBe(500)
  expect(emitDueInvoicesForActiveUnits).not.toHaveBeenCalled()
})

it('autenticado: delega para emitDueInvoicesForActiveUnits com o referenceMonth do dia corrente', async () => {
  emitDueInvoicesForActiveUnits.mockResolvedValue([])

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(emitDueInvoicesForActiveUnits).toHaveBeenCalledWith('2026-03')
  expect(res.status).toBe(200)
  expect(json.referenceMonth).toBe('2026-03')
  expect(json.results).toEqual([])
})

it('resposta 200 propaga os results retornados pelo service', async () => {
  emitDueInvoicesForActiveUnits.mockResolvedValue([
    { unitId: 'unit-1', ok: true, emitted: 2, skipped: 1, blocked: 0, errors: 0 },
  ])

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(json.results).toEqual([
    { unitId: 'unit-1', ok: true, emitted: 2, skipped: 1, blocked: 0, errors: 0 },
  ])
})

it('500 se emitDueInvoicesForActiveUnits rejeitar', async () => {
  emitDueInvoicesForActiveUnits.mockRejectedValue(new Error('falha inesperada'))

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  expect(res.status).toBe(500)
})

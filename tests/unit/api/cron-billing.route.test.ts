import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const emitUnitInvoices = vi.fn()
vi.mock('@/lib/services/billing.service', () => ({
  emitUnitInvoices: (...a: unknown[]) => emitUnitInvoices(...a),
}))

const findMany = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { unit: { findMany: (...a: unknown[]) => findMany(...a) } } }))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

import { GET } from '@/app/api/cron/billing/route'

function makeRequest(authHeader?: string) {
  const headers = new Headers()
  if (authHeader) headers.set('Authorization', authHeader)
  return new Request('http://x', { method: 'GET', headers })
}

const ORIGINAL_ENV = process.env.CRON_SECRET

beforeEach(() => {
  emitUnitInvoices.mockReset()
  findMany.mockReset()
  decrypt.mockReset()
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
})

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL_ENV
  vi.useRealTimers()
})

it('401 sem Authorization header', async () => {
  const res = await GET(makeRequest())
  expect(res.status).toBe(401)
  expect(emitUnitInvoices).not.toHaveBeenCalled()
})

it('401 com Bearer token errado', async () => {
  const res = await GET(makeRequest('Bearer token-errado'))
  expect(res.status).toBe(401)
  expect(emitUnitInvoices).not.toHaveBeenCalled()
})

it('500 sem CRON_SECRET configurado — nunca aceita qualquer token quando o secret não existe', async () => {
  delete process.env.CRON_SECRET
  const res = await GET(makeRequest('Bearer qualquer-coisa'))
  expect(res.status).toBe(500)
  expect(emitUnitInvoices).not.toHaveBeenCalled()
})

it('busca Units candidatas com a query Prisma esperada (status ACTIVE + autoBilling + closingDay)', async () => {
  findMany.mockResolvedValue([])

  await GET(makeRequest('Bearer test-cron-secret'))

  expect(findMany).toHaveBeenCalledWith({
    where: { status: 'ACTIVE', billingConfig: { autoBilling: true } },
    select: { id: true, asaasApiKeyEnc: true, billingConfig: { select: { closingDay: true } } },
  })
})

it('gate por closingDay: Unit com closingDay maior que o dia corrente é pulada, não aparece em results', async () => {
  // "hoje" fixado em 2026-03-10 (dia 10)
  findMany.mockResolvedValue([
    { id: 'unit-cedo', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } }, // <= 10: processa
    { id: 'unit-tarde', asaasApiKeyEnc: 'enc:chave2', billingConfig: { closingDay: 20 } }, // > 10: pula
  ])
  decrypt.mockImplementation(async (v: string) => v.replace('enc:', ''))
  emitUnitInvoices.mockResolvedValue({ emitted: 1, skipped: 0, blocked: 0, errors: 0 })

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(emitUnitInvoices).toHaveBeenCalledTimes(1)
  expect(emitUnitInvoices).toHaveBeenCalledWith('unit-cedo', expect.stringMatching(/^\d{4}-\d{2}$/), 'chave1')
  expect(json.results.map((r: { unitId: string }) => r.unitId)).toEqual(['unit-cedo'])
})

it('Unit sem asaasApiKeyEnc não chama emitUnitInvoices, mas entra em results com ok:false e error', async () => {
  findMany.mockResolvedValue([
    { id: 'unit-sem-chave', asaasApiKeyEnc: null, billingConfig: { closingDay: 5 } },
  ])

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(emitUnitInvoices).not.toHaveBeenCalled()
  expect(json.results).toEqual([
    expect.objectContaining({ unitId: 'unit-sem-chave', ok: false, error: expect.any(String) }),
  ])
})

it('Unit com chave válida dentro do gate: decrypt depois emitUnitInvoices, resultado agregado com os 4 campos', async () => {
  findMany.mockResolvedValue([
    { id: 'unit-1', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } },
  ])
  decrypt.mockImplementation(async (v: string) => v.replace('enc:', ''))
  emitUnitInvoices.mockResolvedValue({ emitted: 2, skipped: 1, blocked: 0, errors: 0 })

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(decrypt).toHaveBeenCalledWith('enc:chave1')
  expect(emitUnitInvoices).toHaveBeenCalledWith('unit-1', expect.stringMatching(/^\d{4}-\d{2}$/), 'chave1')
  expect(json.results).toEqual([
    expect.objectContaining({ unitId: 'unit-1', ok: true, emitted: 2, skipped: 1, blocked: 0, errors: 0 }),
  ])
})

it('Unit cujo emitUnitInvoices rejeita não derruba as demais — entra em results com ok:false, outras continuam', async () => {
  findMany.mockResolvedValue([
    { id: 'unit-falha', asaasApiKeyEnc: 'enc:chave1', billingConfig: { closingDay: 5 } },
    { id: 'unit-ok', asaasApiKeyEnc: 'enc:chave2', billingConfig: { closingDay: 5 } },
  ])
  decrypt.mockImplementation(async (v: string) => v.replace('enc:', ''))
  emitUnitInvoices
    .mockRejectedValueOnce(new Error('Asaas fora do ar'))
    .mockResolvedValueOnce({ emitted: 1, skipped: 0, blocked: 0, errors: 0 })

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(emitUnitInvoices).toHaveBeenCalledTimes(2)
  expect(json.results).toEqual([
    expect.objectContaining({ unitId: 'unit-falha', ok: false, error: 'Asaas fora do ar' }),
    expect.objectContaining({ unitId: 'unit-ok', ok: true, emitted: 1, skipped: 0, blocked: 0, errors: 0 }),
  ])
})

it('resposta 200 autenticada traz referenceMonth no formato YYYY-MM e results', async () => {
  findMany.mockResolvedValue([])

  const res = await GET(makeRequest('Bearer test-cron-secret'))
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json.referenceMonth).toBe('2026-03')
  expect(json.results).toEqual([])
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdmin = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, requireAdmin: (...a: unknown[]) => requireAdmin(...a) }
})

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } } }))

const updateSchool = vi.fn()
vi.mock('@/lib/services/onboarding.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/onboarding.service')>('@/lib/services/onboarding.service')
  return { ...actual, updateSchool: (...a: unknown[]) => updateSchool(...a) }
})

import { GET, PATCH } from '@/app/api/escolas/[unitId]/route'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/unit-context'
import { UnitNotFoundError } from '@/lib/services/onboarding.service'

const ctx = (unitId: string) => ({ params: Promise.resolve({ unitId }) })
beforeEach(() => { requireAdmin.mockReset(); findUnique.mockReset(); updateSchool.mockReset(); requireAdmin.mockResolvedValue({ role: 'admin' }) })

it('GET 404 quando a escola não existe', async () => {
  findUnique.mockResolvedValue(null)
  const res = await GET(new NextRequest('http://x'), ctx('nope'))
  expect(res.status).toBe(404)
})

it('GET 200 nunca expõe responsibleCpfEnc', async () => {
  findUnique.mockResolvedValue({ id: '1', name: 'A', responsibleCpfEnc: 'SECRET', billingConfig: {}, subjects: [] })
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(JSON.stringify(body)).not.toContain('SECRET')
})

it('GET 403 para não-admin', async () => {
  requireAdmin.mockRejectedValue(new ForbiddenError())
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  expect(res.status).toBe(403)
})

it('GET 401 quando sessão expirada', async () => {
  requireAdmin.mockRejectedValue(new UnauthorizedError())
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  expect(res.status).toBe(401)
  const body = await res.json()
  expect(body.code).toBe('UNAUTHORIZED')
})

it('GET 200 não vaza nenhum dos 6 campos sensíveis', async () => {
  findUnique.mockResolvedValue({
    id: '1',
    name: 'Escola Teste',
    responsibleCpfEnc: 'SENTINEL_CPF_ENC',
    asaasApiKeyEnc: 'SENTINEL_ASAAS_KEY',
    asaasWalletId: 'SENTINEL_WALLET_ID',
    asaasAccountId: 'SENTINEL_ACCOUNT_ID',
    confirmationToken: 'SENTINEL_CONF_TOKEN',
    confirmationTokenExpiresAt: 'SENTINEL_CONF_TOKEN_EXP',
    billingConfig: { id: 'b1' },
    subjects: [{ id: 's1' }],
  })
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  const body = await res.json()
  expect(res.status).toBe(200)
  const serialized = JSON.stringify(body)
  expect(serialized).not.toContain('SENTINEL_CPF_ENC')
  expect(serialized).not.toContain('SENTINEL_ASAAS_KEY')
  expect(serialized).not.toContain('SENTINEL_WALLET_ID')
  expect(serialized).not.toContain('SENTINEL_ACCOUNT_ID')
  expect(serialized).not.toContain('SENTINEL_CONF_TOKEN')
  expect(serialized).not.toContain('SENTINEL_CONF_TOKEN_EXP')
  expect(body).not.toHaveProperty('responsibleCpfEnc')
  expect(body).not.toHaveProperty('asaasApiKeyEnc')
  expect(body).not.toHaveProperty('asaasWalletId')
  expect(body).not.toHaveProperty('asaasAccountId')
  expect(body).not.toHaveProperty('confirmationToken')
  expect(body).not.toHaveProperty('confirmationTokenExpiresAt')
  // Relações preservadas
  expect(body).toHaveProperty('billingConfig')
  expect(body).toHaveProperty('subjects')
})

it('PATCH 404 quando updateSchool lança UnitNotFoundError', async () => {
  updateSchool.mockRejectedValue(new UnitNotFoundError())
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(minimalValidBody()) })
  const res = await PATCH(req, ctx('nope'))
  expect(res.status).toBe(404)
})

it('PATCH 400 com body inválido', async () => {
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify({ name: '' }) })
  const res = await PATCH(req, ctx('1'))
  expect(res.status).toBe(400)
})

it('PATCH 401 quando sessão expirada', async () => {
  requireAdmin.mockRejectedValue(new UnauthorizedError())
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(minimalValidBody()) })
  const res = await PATCH(req, ctx('1'))
  expect(res.status).toBe(401)
  const body = await res.json()
  expect(body.code).toBe('UNAUTHORIZED')
})

it('PATCH 200 não vaza nenhum dos 6 campos sensíveis', async () => {
  updateSchool.mockResolvedValue({
    id: '1',
    name: 'Escola Teste',
    responsibleCpfEnc: 'SENTINEL_CPF_ENC',
    asaasApiKeyEnc: 'SENTINEL_ASAAS_KEY',
    asaasWalletId: 'SENTINEL_WALLET_ID',
    asaasAccountId: 'SENTINEL_ACCOUNT_ID',
    confirmationToken: 'SENTINEL_CONF_TOKEN',
    confirmationTokenExpiresAt: 'SENTINEL_CONF_TOKEN_EXP',
    billingConfig: { id: 'b1' },
    subjects: [{ id: 's1' }],
  })
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(minimalValidBody()) })
  const res = await PATCH(req, ctx('1'))
  const body = await res.json()
  expect(res.status).toBe(200)
  const serialized = JSON.stringify(body)
  expect(serialized).not.toContain('SENTINEL_CPF_ENC')
  expect(serialized).not.toContain('SENTINEL_ASAAS_KEY')
  expect(serialized).not.toContain('SENTINEL_WALLET_ID')
  expect(serialized).not.toContain('SENTINEL_ACCOUNT_ID')
  expect(serialized).not.toContain('SENTINEL_CONF_TOKEN')
  expect(serialized).not.toContain('SENTINEL_CONF_TOKEN_EXP')
  expect(body).not.toHaveProperty('responsibleCpfEnc')
  expect(body).not.toHaveProperty('asaasApiKeyEnc')
  expect(body).not.toHaveProperty('asaasWalletId')
  expect(body).not.toHaveProperty('asaasAccountId')
  expect(body).not.toHaveProperty('confirmationToken')
  expect(body).not.toHaveProperty('confirmationTokenExpiresAt')
  // Relações preservadas
  expect(body).toHaveProperty('billingConfig')
  expect(body).toHaveProperty('subjects')
})

function minimalValidBody() {
  return {
    name: 'Escola X', email: 'e@e.com', phone: '31999990000', cep: '30350540',
    address: 'Rua Grande', number: '1', neighborhood: 'Centro', city: 'BH', state: 'MG',
    isFranchise: false, responsibleName: 'Ana', responsibleEmail: 'a@a.com', responsiblePhone: '31988887777',
    billing: { dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 100, cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'ESCOLA', municipalRegistration: '1' },
    plan: { planId: 'basico', isBeta: false },
    subjects: [{ name: 'Mat', nfseServiceCode: '0801', priceCents: 30000, annualPriceCents: 300000, isActive: true }],
  }
}

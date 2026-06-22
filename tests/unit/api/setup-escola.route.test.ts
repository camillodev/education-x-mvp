import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock do RBAC — controla se o "usuário" é admin, sem Clerk real.
const requireAdmin = vi.fn()
vi.mock('../../../src/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/auth/unit-context')>(
    '../../../src/lib/auth/unit-context'
  )
  return { ...actual, requireAdmin: (...args: unknown[]) => requireAdmin(...args) }
})

// Mock do service de persistência — o teste foca no contrato HTTP da rota.
const createSchool = vi.fn()
vi.mock('../../../src/lib/services/onboarding.service', async () => {
  const actual = await vi.importActual<
    typeof import('../../../src/lib/services/onboarding.service')
  >('../../../src/lib/services/onboarding.service')
  return { ...actual, createSchool: (...args: unknown[]) => createSchool(...args) }
})

import { POST } from '../../../src/app/api/setup/escola/route'
import { UnauthorizedError, ForbiddenError } from '../../../src/lib/auth/unit-context'
import {
  DuplicateCnpjError,
  AsaasProvisionError,
  InvalidPlanError,
} from '../../../src/lib/services/onboarding.service'

// Payload válido completo (mesma forma que o front envia).
const validPayload = {
  name: 'Kumon Camargos',
  cnpj: '11222333000181',
  email: 'contato@kumon.com',
  phone: '31999990000',
  cep: '30350540',
  address: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'MG',
  isFranchise: true,
  franchiseParent: 'Kumon Brasil',
  responsibleName: 'Maria Pimenta',
  responsibleEmail: 'maria@kumon.com',
  responsiblePhone: '31988887777',
  billing: {
    dueDay: 10,
    closingDay: 25,
    lateFeePercent: 200,
    monthlyInterestBp: 100,
    cardFeePayer: 'RESPONSAVEL' as const,
    negativacaoFeePayer: 'RESPONSAVEL' as const,
    municipalRegistration: '1234567',
  },
  plan: { planId: 'crescimento' as const, isBeta: false },
  subjects: [
    { name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000, annualPriceCents: 360000 },
  ],
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest('https://app.educationx.com/api/setup/escola', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: admin autenticado.
  requireAdmin.mockResolvedValue({ userId: 'admin-1', unitId: '__admin__', role: 'admin' })
})

describe('POST /api/setup/escola — persistência (caminho feliz)', () => {
  it('admin válido → 201 e persiste via createSchool com o payload validado', async () => {
    createSchool.mockResolvedValue({ id: 'unit-novo-1', name: validPayload.name })

    const res = await POST(postRequest(validPayload))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json).toMatchObject({ id: 'unit-novo-1' })
    // Prova que a rota chamou a persistência (e não engoliu o request).
    expect(createSchool).toHaveBeenCalledOnce()
    const [data] = createSchool.mock.calls[0]
    expect(data).toMatchObject({
      cnpj: '11222333000181',
      subjects: [{ name: 'Matemática' }],
    })
  })
})

describe('POST /api/setup/escola — RBAC', () => {
  it('não autenticado → 401 e NÃO persiste', async () => {
    requireAdmin.mockRejectedValue(new UnauthorizedError())

    const res = await POST(postRequest(validPayload))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.code).toBe('UNAUTHORIZED')
    expect(createSchool).not.toHaveBeenCalled()
  })

  it('autenticado sem permissão → 403 e NÃO persiste', async () => {
    requireAdmin.mockRejectedValue(new ForbiddenError())

    const res = await POST(postRequest(validPayload))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe('FORBIDDEN')
    expect(json.error).toMatch(/permissão/i)
    expect(createSchool).not.toHaveBeenCalled()
  })
})

describe('POST /api/setup/escola — validação e erros de domínio', () => {
  it('payload inválido (CNPJ ruim) → 400 com issues e NÃO persiste', async () => {
    const res = await POST(postRequest({ ...validPayload, cnpj: '123' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe('VALIDATION')
    expect(json.issues).toBeDefined()
    expect(createSchool).not.toHaveBeenCalled()
  })

  it('body não-JSON → 400 INVALID_BODY', async () => {
    const req = new NextRequest('https://app.educationx.com/api/setup/escola', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json{',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe('INVALID_BODY')
  })

  it('CNPJ duplicado → 409', async () => {
    createSchool.mockRejectedValue(new DuplicateCnpjError())
    const res = await POST(postRequest(validPayload))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.code).toBe('DUPLICATE_CNPJ')
  })

  it('plano inválido → 400 INVALID_PLAN', async () => {
    createSchool.mockRejectedValue(new InvalidPlanError())
    const res = await POST(postRequest(validPayload))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.code).toBe('INVALID_PLAN')
  })

  it('falha de provisionamento → 502 sem vazar "Asaas" pro usuário', async () => {
    createSchool.mockRejectedValue(new AsaasProvisionError(new Error('boom')))
    const res = await POST(postRequest(validPayload))
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json.code).toBe('ASAAS_PROVISION')
    expect(json.error).not.toContain('Asaas')
  })

  it('erro inesperado → 500 INTERNAL', async () => {
    createSchool.mockRejectedValue(new Error('db down'))
    const res = await POST(postRequest(validPayload))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.code).toBe('INTERNAL')
  })
})

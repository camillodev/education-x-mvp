import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AsaasMockClient } from '../../../src/lib/integration/asaas/mock-client'
import { decrypt } from '../../../src/lib/crypto'

// Mock Prisma
vi.mock('../../../src/lib/db', () => {
  const mockUnit = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mockBillingConfig = { create: vi.fn() }
  const mockSubject = { createMany: vi.fn() }
  const mockTermsVersion = { findUnique: vi.fn(), findMany: vi.fn() }
  const mockTermsAcceptance = { create: vi.fn() }

  const tx = {
    unit: mockUnit,
    billingConfig: mockBillingConfig,
    subject: mockSubject,
    termsVersion: mockTermsVersion,
    termsAcceptance: mockTermsAcceptance,
  }

  return {
    prisma: {
      ...tx,
      $transaction: vi.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    },
  }
})

// Mock Asaas client factory
let mockAsaasClient: AsaasMockClient
vi.mock('../../../src/lib/integration/asaas/client', () => ({
  getMasterAsaasClient: () => mockAsaasClient,
}))

// Mock email (não enviar de verdade nos testes)
const sendConfirmationEmail = vi.fn()
vi.mock('../../../src/lib/email/confirmation-email', () => ({
  sendConfirmationEmail: (...args: unknown[]) => sendConfirmationEmail(...args),
}))

// Mock convite Clerk
const inviteUnitResponsible = vi.fn()
vi.mock('../../../src/lib/auth/invite', () => ({
  inviteUnitResponsible: (...args: unknown[]) => inviteUnitResponsible(...args),
}))

import { prisma } from '../../../src/lib/db'
import {
  createSchool,
  confirmSchool,
  DuplicateCnpjError,
  InvalidConfirmationTokenError,
  AlreadyConfirmedError,
  NoTermsVersionError,
} from '../../../src/lib/services/onboarding.service'

const baseInput = {
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
  responsibleCpf: '11144477735',
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
  plan: {
    planId: 'crescimento' as const,
    isBeta: false,
  },
  subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000 }],
}

const BASE_URL = 'https://app.educationx.com'

type MockPrisma = {
  unit: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  billingConfig: { create: ReturnType<typeof vi.fn> }
  subject: { createMany: ReturnType<typeof vi.fn> }
  termsVersion: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  termsAcceptance: { create: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAsaasClient = new AsaasMockClient()
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.ASAAS_MODE = 'mock'

  const mp = prisma as unknown as MockPrisma
  mp.unit.findUnique.mockResolvedValue(null)
  mp.unit.create.mockResolvedValue({ id: 'unit-id-1', name: baseInput.name })
  mp.unit.update.mockResolvedValue({ id: 'unit-id-1' })
  mp.billingConfig.create.mockResolvedValue({ id: 'billing-id-1' })
  mp.subject.createMany.mockResolvedValue({ count: 1 })
  mp.termsVersion.findMany.mockResolvedValue([
    { id: 'tv-1', kind: 'IX_ESCOLA', version: '1.0' },
  ])
  mp.termsAcceptance.create.mockResolvedValue({ id: 'acc-1' })
})

describe('createSchool', () => {
  it('cria Unit + BillingConfig + Subjects e status PENDING', async () => {
    const mp = prisma as unknown as MockPrisma
    await createSchool(baseInput, BASE_URL)

    expect(mp.unit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cnpj: '11222333000181',
          name: 'Kumon Camargos',
          responsibleEmail: 'maria@kumon.com',
          status: 'PENDING',
        }),
      })
    )
    expect(mp.billingConfig.create).toHaveBeenCalled()
    expect(mp.subject.createMany).toHaveBeenCalled()
  })

  it('persiste o plano no BillingConfig com preço snapshot', async () => {
    const mp = prisma as unknown as MockPrisma
    await createSchool(baseInput, BASE_URL)

    expect(mp.billingConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planId: 'crescimento',
          planPriceCents: 49900, // snapshot do SCHOOL_PLANS
          isBeta: false,
        }),
      })
    )
  })

  it('criptografa o CPF do responsável (não persiste plaintext)', async () => {
    const mp = prisma as unknown as MockPrisma
    await createSchool(baseInput, BASE_URL)

    const createCall = mp.unit.create.mock.calls[0][0]
    const enc = createCall.data.responsibleCpfEnc
    expect(enc).toBeDefined()
    expect(enc).not.toContain('11144477735')
    expect(await decrypt(enc)).toBe('11144477735')
  })

  it('gera token de confirmação e mantém status PENDING após Asaas', async () => {
    const mp = prisma as unknown as MockPrisma
    await createSchool(baseInput, BASE_URL)

    const createCall = mp.unit.create.mock.calls[0][0]
    expect(createCall.data.confirmationToken).toBeDefined()
    expect(createCall.data.confirmationTokenExpiresAt).toBeInstanceOf(Date)

    // update da subconta NÃO ativa a unidade (status fica PENDING até o aceite)
    const updateCall = mp.unit.update.mock.calls[0][0]
    expect(updateCall.data.asaasAccountId).toBeDefined()
    expect(updateCall.data.status).toBeUndefined()
  })

  it('envia e-mail de confirmação com link contendo o token', async () => {
    await createSchool(baseInput, BASE_URL)

    expect(sendConfirmationEmail).toHaveBeenCalledOnce()
    const arg = sendConfirmationEmail.mock.calls[0][0]
    expect(arg.to).toBe('maria@kumon.com')
    expect(arg.confirmUrl).toMatch(/^https:\/\/app\.educationx\.com\/confirmar\//)
  })

  it('NÃO registra TermsAcceptance no cadastro (só no aceite)', async () => {
    const mp = prisma as unknown as MockPrisma
    await createSchool(baseInput, BASE_URL)
    expect(mp.termsAcceptance.create).not.toHaveBeenCalled()
  })

  it('lança DuplicateCnpjError quando CNPJ já existe', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({ id: 'existing' })
    await expect(createSchool(baseInput, BASE_URL)).rejects.toThrow(DuplicateCnpjError)
  })
})

describe('confirmSchool', () => {
  it('ativa a unidade e registra TermsAcceptance ao confirmar token válido', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-id-1',
      responsibleEmail: 'maria@kumon.com',
      confirmationToken: 'tok-1',
      confirmationTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      confirmedAt: null,
    })

    await confirmSchool('tok-1', '127.0.0.1')

    expect(mp.termsAcceptance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ip: '127.0.0.1' }) })
    )
    expect(mp.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', confirmationToken: null }),
      })
    )
    // Convite Clerk disparado pro responsável, escopado na unidade
    expect(inviteUnitResponsible).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@kumon.com', unitId: 'unit-id-1' })
    )
  })

  it('lança InvalidConfirmationTokenError para token inexistente', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue(null)
    await expect(confirmSchool('bad', '127.0.0.1')).rejects.toThrow(InvalidConfirmationTokenError)
  })

  it('lança InvalidConfirmationTokenError para token expirado', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-id-1',
      responsibleEmail: 'maria@kumon.com',
      confirmationToken: 'tok-1',
      confirmationTokenExpiresAt: new Date(Date.now() - 1000),
      confirmedAt: null,
    })
    await expect(confirmSchool('tok-1', '127.0.0.1')).rejects.toThrow(InvalidConfirmationTokenError)
  })

  it('lança AlreadyConfirmedError quando já confirmado', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-id-1',
      responsibleEmail: 'maria@kumon.com',
      confirmationToken: 'tok-1',
      confirmationTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      confirmedAt: new Date(),
    })
    await expect(confirmSchool('tok-1', '127.0.0.1')).rejects.toThrow(AlreadyConfirmedError)
  })

  it('NÃO ativa a unidade se não houver versão de termos (lança NoTermsVersionError)', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-id-1',
      responsibleEmail: 'maria@kumon.com',
      confirmationToken: 'tok-1',
      confirmationTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      confirmedAt: null,
    })
    mp.termsVersion.findMany.mockResolvedValue([]) // seed não rodou

    await expect(confirmSchool('tok-1', '127.0.0.1')).rejects.toThrow(NoTermsVersionError)
    expect(mp.unit.update).not.toHaveBeenCalled()
  })

  it('registra aceite só da versão mais recente por kind', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-id-1',
      responsibleEmail: 'maria@kumon.com',
      confirmationToken: 'tok-1',
      confirmationTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      confirmedAt: null,
    })
    // 2 versões do mesmo kind — só a mais recente (primeira, pois orderBy desc) conta
    mp.termsVersion.findMany.mockResolvedValue([
      { id: 'tv-new', kind: 'IX_ESCOLA', version: '2.0' },
      { id: 'tv-old', kind: 'IX_ESCOLA', version: '1.0' },
      { id: 'tv-priv', kind: 'PRIVACY', version: '1.0' },
    ])

    await confirmSchool('tok-1', '127.0.0.1')

    expect(mp.termsAcceptance.create).toHaveBeenCalledTimes(2)
    const acceptedIds = mp.termsAcceptance.create.mock.calls.map((c) => c[0].data.termsVersionId)
    expect(acceptedIds).toContain('tv-new')
    expect(acceptedIds).toContain('tv-priv')
    expect(acceptedIds).not.toContain('tv-old')
  })
})

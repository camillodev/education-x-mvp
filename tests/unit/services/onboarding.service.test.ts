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
  const mockTermsVersion = { findUnique: vi.fn() }
  const mockTermsAcceptance = { create: vi.fn() }

  return {
    prisma: {
      unit: mockUnit,
      billingConfig: mockBillingConfig,
      subject: mockSubject,
      termsVersion: mockTermsVersion,
      termsAcceptance: mockTermsAcceptance,
      $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          unit: mockUnit,
          billingConfig: mockBillingConfig,
          subject: mockSubject,
          termsVersion: mockTermsVersion,
          termsAcceptance: mockTermsAcceptance,
        })
      ),
    },
  }
})

// Mock Asaas client factory
let mockAsaasClient: AsaasMockClient
vi.mock('../../../src/lib/integration/asaas/client', () => ({
  getMasterAsaasClient: () => mockAsaasClient,
}))

import { prisma } from '../../../src/lib/db'
import { createSchool } from '../../../src/lib/services/onboarding.service'
import { DuplicateCnpjError, TermsVersionNotFoundError } from '../../../src/lib/services/onboarding.service'

const baseInput = {
  name: 'Kumon Camargos',
  cnpj: '12345678000199',
  email: 'contato@kumon.com',
  phone: '31999990000',
  cep: '30350540',
  address: 'Rua das Flores, 123',
  city: 'Belo Horizonte',
  state: 'MG',
  isFranchise: true,
  franchiseParent: 'Kumon Brasil',
  billing: {
    dueDay: 10,
    closingDay: 5,
    lateFeePercent: 200,
    monthlyInterestBp: 100,
    enablesSpc: false,
    autoBilling: true,
    acceptsCard: false,
    cardFeePayer: 'RESPONSAVEL' as const,
    negativacaoFeePayer: 'RESPONSAVEL' as const,
    municipalRegistration: '1234567',
  },
  subjects: [
    { name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000 },
  ],
  termsVersionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAsaasClient = new AsaasMockClient()
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.ASAAS_MODE = 'mock'

  // Setup mocks padrão
  const mockPrisma = prisma as unknown as {
    unit: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
    billingConfig: { create: ReturnType<typeof vi.fn> }
    subject: { createMany: ReturnType<typeof vi.fn> }
    termsVersion: { findUnique: ReturnType<typeof vi.fn> }
    termsAcceptance: { create: ReturnType<typeof vi.fn> }
  }

  mockPrisma.unit.findUnique.mockResolvedValue(null) // CNPJ não duplicado
  mockPrisma.unit.create.mockResolvedValue({ id: 'unit-id-1', ...baseInput })
  mockPrisma.unit.update.mockResolvedValue({ id: 'unit-id-1' })
  mockPrisma.billingConfig.create.mockResolvedValue({ id: 'billing-id-1' })
  mockPrisma.subject.createMany.mockResolvedValue({ count: 1 })
  mockPrisma.termsVersion.findUnique.mockResolvedValue({ id: baseInput.termsVersionId, kind: 'IX_ESCOLA', version: '1.0' })
  mockPrisma.termsAcceptance.create.mockResolvedValue({ id: 'acceptance-id-1' })
})

describe('createSchool', () => {
  it('cria Unit + BillingConfig + Subjects em transação', async () => {
    const mockPrisma = prisma as unknown as {
      unit: { create: ReturnType<typeof vi.fn> }
      billingConfig: { create: ReturnType<typeof vi.fn> }
      subject: { createMany: ReturnType<typeof vi.fn> }
    }

    await createSchool(baseInput, '127.0.0.1')

    expect(mockPrisma.unit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cnpj: '12345678000199', name: 'Kumon Camargos' }),
      })
    )
    expect(mockPrisma.billingConfig.create).toHaveBeenCalled()
    expect(mockPrisma.subject.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Matemática', priceCents: 35000 }),
        ]),
      })
    )
  })

  it('chama createSubAccount no Asaas e persiste asaasAccountId', async () => {
    const mockPrisma = prisma as unknown as {
      unit: { update: ReturnType<typeof vi.fn> }
    }

    await createSchool(baseInput, '127.0.0.1')

    // Verifica que unit.update foi chamado com asaasAccountId definido
    const updateCall = mockPrisma.unit.update.mock.calls[0][0]
    expect(updateCall.data.asaasAccountId).toBeDefined()
    expect(typeof updateCall.data.asaasAccountId).toBe('string')
    expect(updateCall.data.status).toBe('ACTIVE')
  })

  it('criptografa asaasApiKey antes de salvar (update com *Enc)', async () => {
    const mockPrisma = prisma as unknown as {
      unit: { update: ReturnType<typeof vi.fn> }
    }

    await createSchool(baseInput, '127.0.0.1')

    const updateCall = mockPrisma.unit.update.mock.calls[0][0]
    const enc = updateCall.data.asaasApiKeyEnc
    expect(enc).toBeDefined()
    expect(typeof enc).toBe('string')
    // Verifica formato iv:authTag:ciphertext
    expect(enc.split(':').length).toBe(3)
    // Decrypt deve retornar a apiKey original (formato mock: "mock-api-key-{cpfCnpj}")
    const decrypted = await decrypt(enc)
    expect(decrypted).toContain('12345678000199')
  })

  it('registra TermsAcceptance com ip e timestamp', async () => {
    const mockPrisma = prisma as unknown as {
      termsAcceptance: { create: ReturnType<typeof vi.fn> }
    }

    await createSchool(baseInput, '192.168.1.100')

    expect(mockPrisma.termsAcceptance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ip: '192.168.1.100',
          termsVersionId: baseInput.termsVersionId,
        }),
      })
    )
  })

  it('lança DuplicateCnpjError quando CNPJ já existe', async () => {
    const mockPrisma = prisma as unknown as {
      unit: { findUnique: ReturnType<typeof vi.fn> }
    }
    mockPrisma.unit.findUnique.mockResolvedValue({ id: 'existing-unit' })

    await expect(createSchool(baseInput, '127.0.0.1')).rejects.toThrow(DuplicateCnpjError)
  })

  it('lança TermsVersionNotFoundError quando termsVersionId inválido', async () => {
    const mockPrisma = prisma as unknown as {
      termsVersion: { findUnique: ReturnType<typeof vi.fn> }
    }
    mockPrisma.termsVersion.findUnique.mockResolvedValue(null)

    await expect(createSchool(baseInput, '127.0.0.1')).rejects.toThrow(TermsVersionNotFoundError)
  })
})

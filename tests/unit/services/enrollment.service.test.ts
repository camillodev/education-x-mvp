import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma, forUnit } from '@/lib/db'
import {
  resolveEnrollmentLink,
  InvalidEnrollmentLinkError,
  submitGuardianStep,
  GuardianOwnershipError,
} from '@/lib/services/enrollment.service'

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(async (v: string) => `enc:${v}`),
}))

vi.mock('@/lib/db', () => {
  const guardianCreate = vi.fn()
  const guardianUpdate = vi.fn()
  const guardianFindFirst = vi.fn()
  return {
    prisma: {
      unit: { findUnique: vi.fn() },
    },
    forUnit: vi.fn(() => ({
      guardian: {
        create: guardianCreate,
        update: guardianUpdate,
        findFirst: guardianFindFirst,
      },
    })),
  }
})

type MockPrisma = { unit: { findUnique: ReturnType<typeof vi.fn> } }
type MockForUnitDb = {
  guardian: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
  }
}

describe('resolveEnrollmentLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna unitId e nome da unidade para um token válido', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'Kumon Camargos',
    })

    const result = await resolveEnrollmentLink('tok-valido')

    expect(result).toEqual({ unitId: 'unit-1', unitName: 'Kumon Camargos' })
    expect(mp.unit.findUnique).toHaveBeenCalledWith({
      where: { enrollmentLinkToken: 'tok-valido' },
      select: { id: true, name: true },
    })
  })

  it('lança InvalidEnrollmentLinkError quando o token não resolve nenhuma unidade', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue(null)

    await expect(resolveEnrollmentLink('tok-invalido')).rejects.toThrow(InvalidEnrollmentLinkError)
  })
})

const VALID_GUARDIAN_INPUT = {
  name: 'Maria da Silva',
  cpf: '111.444.777-35',
  email: 'maria@example.com',
  phone: '(31) 98888-7777',
  type: 'MOTHER' as const,
}

describe('submitGuardianStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cria um novo Guardian criptografado quando não há guardianId existente (fluxo novo)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.create.mockResolvedValue({ id: 'guardian-1', unitId: 'unit-1' })

    const guardian = await submitGuardianStep('unit-1', null, VALID_GUARDIAN_INPUT)

    expect(db.guardian.create).toHaveBeenCalledWith({
      data: {
        unitId: 'unit-1',
        name: 'Maria da Silva',
        cpfEnc: 'enc:11144477735',
        emailEnc: 'enc:maria@example.com',
        phoneEnc: 'enc:31988887777',
        type: 'MOTHER',
      },
    })
    expect(guardian.id).toBe('guardian-1')
  })

  it('reaproveita o Guardian existente (update) quando guardianId já pertence a esta unidade — idempotência de back-navigation', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue({ id: 'guardian-1', unitId: 'unit-1' })
    db.guardian.update.mockResolvedValue({ id: 'guardian-1', unitId: 'unit-1' })

    await submitGuardianStep('unit-1', 'guardian-1', VALID_GUARDIAN_INPUT)

    expect(db.guardian.findFirst).toHaveBeenCalledWith({ where: { id: 'guardian-1' } })
    expect(db.guardian.update).toHaveBeenCalledWith({
      where: { id: 'guardian-1' },
      data: {
        unitId: 'unit-1',
        name: 'Maria da Silva',
        cpfEnc: 'enc:11144477735',
        emailEnc: 'enc:maria@example.com',
        phoneEnc: 'enc:31988887777',
        type: 'MOTHER',
      },
    })
    expect(db.guardian.create).not.toHaveBeenCalled()
  })

  it('lança GuardianOwnershipError quando guardianId do cookie pertence a outra unidade (cria novo em vez de vazar)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue(null) // forUnit já filtra por unitId — não encontra em outro tenant

    await expect(
      submitGuardianStep('unit-1', 'guardian-de-outra-escola', VALID_GUARDIAN_INPUT)
    ).rejects.toThrow(GuardianOwnershipError)
    expect(db.guardian.update).not.toHaveBeenCalled()
    expect(db.guardian.create).not.toHaveBeenCalled()
  })
})

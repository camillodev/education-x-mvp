import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma, forUnit } from '@/lib/db'
import {
  resolveEnrollmentLink,
  InvalidEnrollmentLinkError,
  submitGuardianStep,
  GuardianOwnershipError,
  submitStudentsStep,
  submitPlanStep,
  StudentOwnershipError,
} from '@/lib/services/enrollment.service'

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(async (v: string) => `enc:${v}`),
}))

vi.mock('@/lib/db', () => {
  const guardianCreate = vi.fn()
  const guardianUpdate = vi.fn()
  const guardianFindFirst = vi.fn()
  const studentDeleteMany = vi.fn()
  const studentCreate = vi.fn()
  const studentFindMany = vi.fn()
  const subjectFindMany = vi.fn()
  const enrollmentDeleteMany = vi.fn()
  const enrollmentCreate = vi.fn()
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
      student: {
        deleteMany: studentDeleteMany,
        create: studentCreate,
        findMany: studentFindMany,
      },
      subject: {
        findMany: subjectFindMany,
      },
      enrollment: {
        deleteMany: enrollmentDeleteMany,
        create: enrollmentCreate,
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
  student: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  subject: {
    findMany: ReturnType<typeof vi.fn>
  }
  enrollment: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
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

describe('submitStudentsStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const blocks = [
    { name: 'João Silva', birthDate: new Date(2015, 2, 15), subjectIds: ['subj-1', 'subj-2'] },
    { name: 'Ana Silva', birthDate: new Date(2018, 5, 10), subjectIds: ['subj-1'] },
  ]

  it('delete-recreate: apaga Students anteriores do Guardian e cria os novos, retornando studentId->subjectIds', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.student.create
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'student-2' })

    const result = await submitStudentsStep('unit-1', 'guardian-1', blocks)

    expect(db.student.deleteMany).toHaveBeenCalledWith({ where: { guardianId: 'guardian-1' } })
    expect(db.student.create).toHaveBeenNthCalledWith(1, {
      data: { unitId: 'unit-1', guardianId: 'guardian-1', nameEnc: 'enc:João Silva', birthDateEnc: expect.any(String) },
    })
    expect(result).toEqual([
      { studentId: 'student-1', subjectIds: ['subj-1', 'subj-2'] },
      { studentId: 'student-2', subjectIds: ['subj-1'] },
    ])
  })
})

describe('submitPlanStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const selection = [
    { studentId: 'student-1', subjectIds: ['subj-1', 'subj-2'] },
    { studentId: 'student-2', subjectIds: ['subj-1'] },
  ]

  it('cria 1 Enrollment por (student, subject) com agreedPriceCents derivado do Subject (R5a)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.student.findMany.mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }])
    db.subject.findMany.mockResolvedValue([
      { id: 'subj-1', priceCents: 30000, quarterlyPriceCents: null, semiannualPriceCents: null, annualPriceCents: 24000 },
      { id: 'subj-2', priceCents: 20000, quarterlyPriceCents: null, semiannualPriceCents: null, annualPriceCents: 16000 },
    ])
    db.enrollment.create.mockResolvedValue({ id: 'enr-x' })

    const result = await submitPlanStep('unit-1', 'guardian-1', selection, 'ANNUAL')

    expect(db.enrollment.deleteMany).toHaveBeenCalledWith({ where: { guardianId: 'guardian-1' } })
    expect(db.enrollment.create).toHaveBeenCalledTimes(3) // 2 subjects (student-1) + 1 subject (student-2)
    expect(db.enrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: 'unit-1',
        guardianId: 'guardian-1',
        studentId: 'student-1',
        subjectId: 'subj-1',
        plan: 'ANNUAL',
        agreedPriceCents: 24000,
        finalPriceCents: 24000,
      }),
    })
    expect(result.totalCents).toBe(24000 + 16000 + 24000) // student-1: subj-1+subj-2, student-2: subj-1
  })

  it('lança StudentOwnershipError se algum studentId do cookie não pertence a este Guardian/unidade', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.student.findMany.mockResolvedValue([{ id: 'student-1' }]) // só 1 de 2 encontrado

    await expect(submitPlanStep('unit-1', 'guardian-1', selection, 'ANNUAL')).rejects.toThrow(
      StudentOwnershipError
    )
    expect(db.enrollment.create).not.toHaveBeenCalled()
  })

  it('lança erro se algum Subject não tem preço configurado para o plano escolhido (R3)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.student.findMany.mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }])
    db.subject.findMany.mockResolvedValue([
      { id: 'subj-1', priceCents: 30000, quarterlyPriceCents: null, semiannualPriceCents: null, annualPriceCents: null },
      { id: 'subj-2', priceCents: 20000, quarterlyPriceCents: null, semiannualPriceCents: null, annualPriceCents: 16000 },
    ])

    await expect(submitPlanStep('unit-1', 'guardian-1', selection, 'ANNUAL')).rejects.toThrow()
    expect(db.enrollment.create).not.toHaveBeenCalled()
  })
})

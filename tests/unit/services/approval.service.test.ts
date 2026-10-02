import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma, forUnit } from '@/lib/db'
import {
  approveEnrollment,
  rejectEnrollment,
  listPendingEnrollments,
  GuardianNotFoundError,
} from '@/lib/services/approval.service'

vi.mock('@/lib/crypto', () => ({
  decrypt: vi.fn(async (v: string) => v.replace('enc:', '')),
}))

const mockCreateCustomer = vi.fn()
const mockFindCustomerByCpfCnpj = vi.fn()

vi.mock('@/lib/integration/asaas/client', () => ({
  getAsaasClient: vi.fn(() => ({
    createCustomer: mockCreateCustomer,
    findCustomerByCpfCnpj: mockFindCustomerByCpfCnpj,
  })),
}))

vi.mock('@/lib/db', () => {
  const guardianFindFirst = vi.fn()
  const guardianUpdate = vi.fn()
  const enrollmentUpdateMany = vi.fn()
  const enrollmentFindMany = vi.fn()
  return {
    prisma: {
      unit: { findUnique: vi.fn() },
    },
    forUnit: vi.fn(() => ({
      guardian: {
        findFirst: guardianFindFirst,
        update: guardianUpdate,
      },
      enrollment: {
        updateMany: enrollmentUpdateMany,
        findMany: enrollmentFindMany,
      },
    })),
  }
})

type MockPrisma = { unit: { findUnique: ReturnType<typeof vi.fn> } }
type MockForUnitDb = {
  guardian: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  enrollment: {
    updateMany: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
}

const GUARDIAN_BASE = {
  id: 'guardian-1',
  unitId: 'unit-1',
  name: 'Maria da Silva',
  cpfEnc: 'enc:11144477735',
  emailEnc: 'enc:maria@example.com',
  phoneEnc: 'enc:31988887777',
  asaasCustomerId: null,
}

describe('approveEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cria customer no Asaas (name+cpfCnpj+externalReference=guardianId), grava asaasCustomerId e ativa os Enrollments', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue(GUARDIAN_BASE)
    mockFindCustomerByCpfCnpj.mockResolvedValue(null)
    mockCreateCustomer.mockResolvedValue({ id: 'cus_123', name: 'Maria da Silva', cpfCnpj: '11144477735' })
    db.enrollment.updateMany.mockResolvedValue({ count: 2 })

    await approveEnrollment('unit-1', 'guardian-1', 'asaas_api_key_da_escola')

    expect(mockCreateCustomer).toHaveBeenCalledWith({
      name: 'Maria da Silva',
      cpfCnpj: '11144477735',
      externalReference: 'guardian-1',
    })
    expect(db.guardian.update).toHaveBeenCalledWith({
      where: { id: 'guardian-1' },
      data: { asaasCustomerId: 'cus_123' },
    })
    expect(db.enrollment.updateMany).toHaveBeenCalledWith({
      where: { guardianId: 'guardian-1' },
      data: { status: 'ACTIVE', startedAt: expect.any(Date) },
    })
  })

  it('reaproveita asaasCustomerId já gravado no Guardian — nunca cria customer duplicado', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue({ ...GUARDIAN_BASE, asaasCustomerId: 'cus_existing' })
    db.enrollment.updateMany.mockResolvedValue({ count: 1 })

    await approveEnrollment('unit-1', 'guardian-1', 'asaas_api_key_da_escola')

    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(mockFindCustomerByCpfCnpj).not.toHaveBeenCalled()
    expect(db.guardian.update).not.toHaveBeenCalled()
    expect(db.enrollment.updateMany).toHaveBeenCalledWith({
      where: { guardianId: 'guardian-1' },
      data: { status: 'ACTIVE', startedAt: expect.any(Date) },
    })
  })

  it('reaproveita customer encontrado por CPF no Asaas (recuperação de escrita perdida) — não cria duplicado', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue(GUARDIAN_BASE)
    mockFindCustomerByCpfCnpj.mockResolvedValue({ id: 'cus_recovered', name: 'Maria da Silva', cpfCnpj: '11144477735' })
    db.enrollment.updateMany.mockResolvedValue({ count: 1 })

    await approveEnrollment('unit-1', 'guardian-1', 'asaas_api_key_da_escola')

    expect(mockFindCustomerByCpfCnpj).toHaveBeenCalledWith('11144477735')
    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(db.guardian.update).toHaveBeenCalledWith({
      where: { id: 'guardian-1' },
      data: { asaasCustomerId: 'cus_recovered' },
    })
  })

  it('lança GuardianNotFoundError se o guardianId não pertence a esta unidade', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.guardian.findFirst.mockResolvedValue(null)

    await expect(approveEnrollment('unit-1', 'guardian-x', 'key')).rejects.toThrow(GuardianNotFoundError)
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })
})

describe('listPendingEnrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agrupa Enrollments PENDING_SCHOOL_APPROVAL por guardianId (1 linha por família)', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.findMany.mockResolvedValue([
      {
        id: 'enr-1', guardianId: 'guardian-1', studentId: 'student-1', plan: 'MONTHLY', finalPriceCents: 35000,
        guardian: { id: 'guardian-1', name: 'Maria da Silva' },
        student: { id: 'student-1', nameEnc: 'enc:João' },
        subject: { id: 'subj-1', name: 'Matemática' },
      },
      {
        id: 'enr-2', guardianId: 'guardian-1', studentId: 'student-2', plan: 'MONTHLY', finalPriceCents: 20000,
        guardian: { id: 'guardian-1', name: 'Maria da Silva' },
        student: { id: 'student-2', nameEnc: 'enc:Ana' },
        subject: { id: 'subj-2', name: 'Português' },
      },
      {
        id: 'enr-3', guardianId: 'guardian-2', studentId: 'student-3', plan: 'ANNUAL', finalPriceCents: 24000,
        guardian: { id: 'guardian-2', name: 'Carlos Souza' },
        student: { id: 'student-3', nameEnc: 'enc:Beto' },
        subject: { id: 'subj-1', name: 'Matemática' },
      },
    ])

    const result = await listPendingEnrollments('unit-1')

    expect(db.enrollment.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING_SCHOOL_APPROVAL' },
      include: { guardian: true, student: true, subject: true },
    })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      guardianId: 'guardian-1',
      guardianName: 'Maria da Silva',
      totalCents: 55000,
      students: ['João', 'Ana'],
    })
    expect(result[1]).toMatchObject({ guardianId: 'guardian-2', totalCents: 24000 })
  })
})

describe('rejectEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muda status para CANCELLED com cancelledAt e NÃO chama Asaas', async () => {
    const db = forUnit('unit-1') as unknown as MockForUnitDb
    db.enrollment.updateMany.mockResolvedValue({ count: 1 })

    await rejectEnrollment('unit-1', 'guardian-1')

    expect(db.enrollment.updateMany).toHaveBeenCalledWith({
      where: { guardianId: 'guardian-1' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
    })
    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(mockFindCustomerByCpfCnpj).not.toHaveBeenCalled()
  })
})

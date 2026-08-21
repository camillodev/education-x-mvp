import { describe, it, expect, afterEach, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  approveEnrollment,
  rejectEnrollment,
  listPendingEnrollments,
} from '@/lib/services/approval.service'
import {
  submitGuardianStep,
  submitStudentsStep,
  submitPlanStep,
  submitAcceptanceStep,
} from '@/lib/services/enrollment.service'
import { StudentsStepSchema } from '@/lib/validations/student'
import { cleanupUnits, TEST_PREFIX } from './_setup'

beforeEach(() => {
  process.env.ASAAS_MODE = 'mock'
})

afterEach(async () => {
  delete process.env.ASAAS_MODE
  await cleanupUnits()
})
afterAll(() => cleanupUnits())

async function seedUnitWithSubject(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola B8 ${suffix}`,
      cnpj: `11222999000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
      subjects: { create: [{ name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000 }] },
    },
    include: { subjects: true },
  })
}

const GUARDIAN_INPUT = {
  name: 'Maria da Silva',
  cpf: '111.444.777-35',
  email: 'maria@example.com',
  phone: '(31) 98888-7777',
  type: 'MOTHER' as const,
}

async function seedPendingEnrollment(suffix: string) {
  const unit = await seedUnitWithSubject(suffix)
  const [subject] = unit.subjects
  const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
  const selection = await submitStudentsStep(
    unit.id,
    guardian.id,
    StudentsStepSchema.parse([{ name: 'João', birthDate: '15/03/2015', subjectIds: [subject.id] }])
  )
  await submitPlanStep(unit.id, guardian.id, selection, 'MONTHLY')
  await submitAcceptanceStep(unit.id, guardian.id, '203.0.113.10')
  return { unit, guardian }
}

describe('approveEnrollment (integração — banco real + Asaas mock)', () => {
  it('cria customer no Asaas mock, grava asaasCustomerId no Guardian e ativa os Enrollments', async () => {
    const { unit, guardian } = await seedPendingEnrollment('01')

    await approveEnrollment(unit.id, guardian.id, 'fake-asaas-key')

    const reloadedGuardian = await prisma.guardian.findUniqueOrThrow({ where: { id: guardian.id } })
    expect(reloadedGuardian.asaasCustomerId).toBeTruthy()
    expect(reloadedGuardian.asaasCustomerId).toMatch(/^cus_mock_/)

    const enrollments = await prisma.enrollment.findMany({ where: { guardianId: guardian.id } })
    expect(enrollments).toHaveLength(1)
    expect(enrollments[0].status).toBe('ACTIVE')
    expect(enrollments[0].startedAt).toBeTruthy()
  }, 40000)

  // Timeout maior: 2 chamadas completas de approveEnrollment (cada uma decrypt+Asaas
  // mock+2 writes) somadas ao seed (4 writes) passam do timeout padrão de 20s sob rede
  // lenta — mesmo padrão intermitente do pooler Supabase já observado nesta sessão.
  it('não duplica customer ao aprovar duas vezes (Guardian já tem asaasCustomerId)', async () => {
    const { unit, guardian } = await seedPendingEnrollment('02')

    await approveEnrollment(unit.id, guardian.id, 'fake-asaas-key')
    const firstCustomerId = (await prisma.guardian.findUniqueOrThrow({ where: { id: guardian.id } })).asaasCustomerId

    await approveEnrollment(unit.id, guardian.id, 'fake-asaas-key')
    const secondCustomerId = (await prisma.guardian.findUniqueOrThrow({ where: { id: guardian.id } })).asaasCustomerId

    expect(secondCustomerId).toBe(firstCustomerId)
  }, 40000)
})

describe('rejectEnrollment (integração — banco real)', () => {
  it('muda status para CANCELLED com cancelledAt e não grava asaasCustomerId', async () => {
    const { unit, guardian } = await seedPendingEnrollment('03')

    await rejectEnrollment(unit.id, guardian.id)

    const reloadedGuardian = await prisma.guardian.findUniqueOrThrow({ where: { id: guardian.id } })
    expect(reloadedGuardian.asaasCustomerId).toBeNull()

    const enrollments = await prisma.enrollment.findMany({ where: { guardianId: guardian.id } })
    expect(enrollments[0].status).toBe('CANCELLED')
    expect(enrollments[0].cancelledAt).toBeTruthy()
  })
})

describe('listPendingEnrollments (integração — banco real)', () => {
  it('lista só PENDING_SCHOOL_APPROVAL, agrupado por Guardian, com nomes descriptografados', async () => {
    const { unit, guardian } = await seedPendingEnrollment('04')

    const list = await listPendingEnrollments(unit.id)

    expect(list).toHaveLength(1)
    expect(list[0].guardianId).toBe(guardian.id)
    expect(list[0].students).toEqual(['João'])
    expect(list[0].totalCents).toBe(30000)
  })

  it('não lista matrícula já aprovada nem recusada', async () => {
    const { unit, guardian } = await seedPendingEnrollment('05')
    await approveEnrollment(unit.id, guardian.id, 'fake-key')

    const list = await listPendingEnrollments(unit.id)

    expect(list).toHaveLength(0)
  })
})

import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import {
  submitGuardianStep,
  submitStudentsStep,
  submitPlanStep,
  StudentOwnershipError,
} from '@/lib/services/enrollment.service'
import { StudentsStepSchema } from '@/lib/validations/student'
import { cleanupUnits, TEST_PREFIX } from './_setup'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

async function seedUnitWithSubjects(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola B4 ${suffix}`,
      cnpj: `11222666000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
      subjects: {
        create: [
          { name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000, annualPriceCents: 24000 },
          { name: 'Português', nfseServiceCode: '0801', priceCents: 20000, annualPriceCents: 16000 },
        ],
      },
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

describe('submitPlanStep (integração — banco real)', () => {
  it('cria Enrollments com agreedPriceCents=annualPriceCents do Subject (R5a) e retorna total correto', async () => {
    const unit = await seedUnitWithSubjects('01')
    const [mat, port] = unit.subjects
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
    const selection = await submitStudentsStep(
      unit.id,
      guardian.id,
      StudentsStepSchema.parse([{ name: 'João', birthDate: '15/03/2015', subjectIds: [mat.id, port.id] }])
    )

    const result = await submitPlanStep(unit.id, guardian.id, selection, 'ANNUAL')

    expect(result.totalCents).toBe(24000 + 16000)

    const enrollments = await prisma.enrollment.findMany({ where: { guardianId: guardian.id } })
    expect(enrollments).toHaveLength(2)
    for (const e of enrollments) {
      expect(e.plan).toBe('ANNUAL')
      expect(e.finalPriceCents).toBe(e.agreedPriceCents)
    }
  })

  it('reenvio (delete-recreate) substitui os Enrollments anteriores — não duplica', async () => {
    const unit = await seedUnitWithSubjects('02')
    const [mat] = unit.subjects
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
    const selection = await submitStudentsStep(
      unit.id,
      guardian.id,
      StudentsStepSchema.parse([{ name: 'João', birthDate: '15/03/2015', subjectIds: [mat.id] }])
    )

    await submitPlanStep(unit.id, guardian.id, selection, 'MONTHLY')
    await submitPlanStep(unit.id, guardian.id, selection, 'ANNUAL')

    const enrollments = await prisma.enrollment.findMany({ where: { guardianId: guardian.id } })
    expect(enrollments).toHaveLength(1)
    expect(enrollments[0].plan).toBe('ANNUAL')
  })

  it('lança StudentOwnershipError se o cookie referenciar um studentId de outro Guardian', async () => {
    const unit = await seedUnitWithSubjects('03')
    const [mat] = unit.subjects
    const guardianA = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
    const guardianB = await submitGuardianStep(unit.id, null, { ...GUARDIAN_INPUT, cpf: '529.982.247-25' })

    const selectionB = await submitStudentsStep(
      unit.id,
      guardianB.id,
      StudentsStepSchema.parse([{ name: 'Aluno B', birthDate: '15/03/2015', subjectIds: [mat.id] }])
    )

    await expect(submitPlanStep(unit.id, guardianA.id, selectionB, 'MONTHLY')).rejects.toThrow(
      StudentOwnershipError
    )
    const enrollmentsA = await prisma.enrollment.findMany({ where: { guardianId: guardianA.id } })
    expect(enrollmentsA).toHaveLength(0)
  })
})

import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import {
  submitGuardianStep,
  submitStudentsStep,
  submitPlanStep,
  submitAcceptanceStep,
  NoEnrollmentError,
} from '@/lib/services/enrollment.service'
import { StudentsStepSchema } from '@/lib/validations/student'
import { cleanupUnits, TEST_PREFIX } from './_setup'

async function cleanupContracts() {
  await prisma.termsVersion.deleteMany({ where: { unitId: { startsWith: TEST_PREFIX } } })
}

afterEach(async () => {
  await cleanupContracts()
  await cleanupUnits()
})
afterAll(async () => {
  await cleanupContracts()
  await cleanupUnits()
})

async function seedUnitWithSubject(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola B5 ${suffix}`,
      cnpj: `11222888000${suffix}`.slice(-14).padStart(14, '1'),
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

describe('submitAcceptanceStep (integração — banco real)', () => {
  it('registra TermsAcceptance apontando pro contrato da escola e move Enrollments para PENDING_SCHOOL_APPROVAL', async () => {
    const unit = await seedUnitWithSubject('01')
    const [subject] = unit.subjects
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
    const selection = await submitStudentsStep(
      unit.id,
      guardian.id,
      StudentsStepSchema.parse([{ name: 'João', birthDate: '15/03/2015', subjectIds: [subject.id] }])
    )
    await submitPlanStep(unit.id, guardian.id, selection, 'MONTHLY')

    await submitAcceptanceStep(unit.id, guardian.id, '203.0.113.10')

    const acceptance = await prisma.termsAcceptance.findFirstOrThrow({ where: { guardianId: guardian.id } })
    expect(acceptance.unitId).toBe(unit.id)
    expect(acceptance.ip).toBe('203.0.113.10')

    const referencedVersion = await prisma.termsVersion.findUniqueOrThrow({ where: { id: acceptance.termsVersionId } })
    expect(referencedVersion.kind).toBe('ESCOLA_RESPONSAVEL')

    const enrollments = await prisma.enrollment.findMany({ where: { guardianId: guardian.id } })
    expect(enrollments).toHaveLength(1)
    expect(enrollments[0].status).toBe('PENDING_SCHOOL_APPROVAL')
  })

  it('aponta para o contrato CUSTOM da escola quando ela já salvou uma versão própria', async () => {
    const unit = await seedUnitWithSubject('02')
    const [subject] = unit.subjects
    const customVersion = await prisma.termsVersion.create({
      data: { unitId: unit.id, kind: 'ESCOLA_RESPONSAVEL', version: 'custom-1', body: 'Contrato customizado desta escola' },
    })

    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)
    const selection = await submitStudentsStep(
      unit.id,
      guardian.id,
      StudentsStepSchema.parse([{ name: 'João', birthDate: '15/03/2015', subjectIds: [subject.id] }])
    )
    await submitPlanStep(unit.id, guardian.id, selection, 'MONTHLY')

    await submitAcceptanceStep(unit.id, guardian.id, '203.0.113.10')

    const acceptance = await prisma.termsAcceptance.findFirstOrThrow({ where: { guardianId: guardian.id } })
    expect(acceptance.termsVersionId).toBe(customVersion.id)
  })

  it('lança NoEnrollmentError se o Guardian não tem Enrollment pendente (nada pra enviar)', async () => {
    const unit = await seedUnitWithSubject('03')
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)

    await expect(submitAcceptanceStep(unit.id, guardian.id, '203.0.113.10')).rejects.toThrow(NoEnrollmentError)
  })
})

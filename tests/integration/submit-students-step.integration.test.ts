import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { submitGuardianStep, submitStudentsStep } from '@/lib/services/enrollment.service'
import { StudentsStepSchema } from '@/lib/validations/student'
import { decrypt } from '@/lib/crypto'
import { cleanupUnits, TEST_PREFIX } from './_setup'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

async function seedUnit(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola B3 ${suffix}`,
      cnpj: `11222555000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
    },
  })
}

const GUARDIAN_INPUT = {
  name: 'Maria da Silva',
  cpf: '111.444.777-35',
  email: 'maria@example.com',
  phone: '(31) 98888-7777',
  type: 'MOTHER' as const,
}

function parseBlocks(raw: unknown) {
  return StudentsStepSchema.parse(raw)
}

describe('submitStudentsStep (integração — banco real)', () => {
  it('grava Students com PII criptografada, vinculados ao Guardian', async () => {
    const unit = await seedUnit('01')
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)

    const blocks = parseBlocks([
      { name: 'João Silva', birthDate: '15/03/2015', subjectIds: ['subj-1', 'subj-2'] },
    ])
    const selection = await submitStudentsStep(unit.id, guardian.id, blocks)

    expect(selection).toEqual([{ studentId: expect.any(String), subjectIds: ['subj-1', 'subj-2'] }])

    const raw = await prisma.student.findUniqueOrThrow({ where: { id: selection[0].studentId } })
    expect(await decrypt(raw.nameEnc)).toBe('João Silva')
    expect(raw.guardianId).toBe(guardian.id)
    expect(raw.unitId).toBe(unit.id)
  })

  it('reenvio (delete-recreate) substitui os Students anteriores — não duplica', async () => {
    const unit = await seedUnit('02')
    const guardian = await submitGuardianStep(unit.id, null, GUARDIAN_INPUT)

    await submitStudentsStep(
      unit.id,
      guardian.id,
      parseBlocks([{ name: 'Primeiro', birthDate: '15/03/2015', subjectIds: ['subj-1'] }])
    )

    const second = await submitStudentsStep(
      unit.id,
      guardian.id,
      parseBlocks([
        { name: 'Segundo A', birthDate: '15/03/2015', subjectIds: ['subj-1'] },
        { name: 'Segundo B', birthDate: '10/06/2018', subjectIds: ['subj-2'] },
      ])
    )

    const remaining = await prisma.student.findMany({ where: { guardianId: guardian.id } })
    expect(remaining).toHaveLength(2)
    expect(second).toHaveLength(2)
  })
})

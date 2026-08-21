import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma, forUnit } from '@/lib/db'
import { cleanupUnits, TEST_PREFIX } from './_setup'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

async function seedUnitWithSubject(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola ${suffix}`,
      cnpj: `11222333000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
      subjects: { create: [{ name: 'Matemática', nfseServiceCode: '0801', priceCents: 10000 }] },
    },
    include: { subjects: true },
  })
}

describe('Isolamento de tenant — Student e Enrollment (EDU-8)', () => {
  it('forUnit(unitId) sobrescreve um unitId forjado no data — nunca confia no client', async () => {
    const unit = await seedUnitWithSubject('01')
    const outraUnit = await seedUnitWithSubject('05')
    const db = forUnit(unit.id)

    const guardian = await db.guardian.create({
      data: { unitId: outraUnit.id, name: 'Responsável', cpfEnc: 'enc', emailEnc: 'enc', phoneEnc: 'enc' },
    })

    const student = await db.student.create({
      data: {
        unitId: outraUnit.id,
        guardianId: guardian.id,
        nameEnc: 'enc-nome',
        birthDateEnc: 'enc-data',
      },
    })

    expect(student.unitId).toBe(unit.id)

    const enrollment = await db.enrollment.create({
      data: {
        unitId: outraUnit.id,
        guardianId: guardian.id,
        studentId: student.id,
        subjectId: unit.subjects[0].id,
        plan: 'MONTHLY',
        agreedPriceCents: 10000,
        finalPriceCents: 10000,
      },
    })

    expect(enrollment.unitId).toBe(unit.id)
  })

  it('findMany escopado por unitId nunca vaza Student/Enrollment de outra escola', async () => {
    const unitA = await seedUnitWithSubject('02')
    const unitB = await seedUnitWithSubject('03')
    const dbA = forUnit(unitA.id)
    const dbB = forUnit(unitB.id)

    const guardianA = await dbA.guardian.create({
      data: { unitId: unitA.id, name: 'Guardian A', cpfEnc: 'enc', emailEnc: 'enc', phoneEnc: 'enc' },
    })
    const studentA = await dbA.student.create({
      data: { unitId: unitA.id, guardianId: guardianA.id, nameEnc: 'enc-a', birthDateEnc: 'enc-a' },
    })
    await dbA.enrollment.create({
      data: {
        unitId: unitA.id,
        guardianId: guardianA.id,
        studentId: studentA.id,
        subjectId: unitA.subjects[0].id,
        plan: 'MONTHLY',
        agreedPriceCents: 10000,
        finalPriceCents: 10000,
      },
    })

    const guardianB = await dbB.guardian.create({
      data: { unitId: unitB.id, name: 'Guardian B', cpfEnc: 'enc', emailEnc: 'enc', phoneEnc: 'enc' },
    })
    await dbB.student.create({
      data: { unitId: unitB.id, guardianId: guardianB.id, nameEnc: 'enc-b', birthDateEnc: 'enc-b' },
    })

    const studentsFromA = await dbA.student.findMany({})
    const enrollmentsFromA = await dbA.enrollment.findMany({})

    expect(studentsFromA).toHaveLength(1)
    expect(studentsFromA[0].unitId).toBe(unitA.id)
    expect(enrollmentsFromA).toHaveLength(1)
    expect(enrollmentsFromA[0].unitId).toBe(unitA.id)
  })

  it('Unit deletada faz cascade em Student e Enrollment (limpeza de teste depende disso)', async () => {
    const unit = await seedUnitWithSubject('04')
    const db = forUnit(unit.id)
    const guardian = await db.guardian.create({
      data: { unitId: unit.id, name: 'Guardian', cpfEnc: 'enc', emailEnc: 'enc', phoneEnc: 'enc' },
    })
    const student = await db.student.create({
      data: { unitId: unit.id, guardianId: guardian.id, nameEnc: 'enc', birthDateEnc: 'enc' },
    })
    await db.enrollment.create({
      data: {
        unitId: unit.id,
        guardianId: guardian.id,
        studentId: student.id,
        subjectId: unit.subjects[0].id,
        plan: 'MONTHLY',
        agreedPriceCents: 10000,
        finalPriceCents: 10000,
      },
    })

    await prisma.unit.delete({ where: { id: unit.id } })

    const remainingStudents = await prisma.student.findMany({ where: { unitId: unit.id } })
    const remainingEnrollments = await prisma.enrollment.findMany({ where: { unitId: unit.id } })
    expect(remainingStudents).toHaveLength(0)
    expect(remainingEnrollments).toHaveLength(0)
  })
})

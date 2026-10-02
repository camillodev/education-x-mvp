// Seed de desenvolvimento — Unit fixa para uso com o dev auth bypass
// (DISABLE_CLERK=true + DEV_UNIT_ID, ver src/lib/auth/unit-context.ts).
//
// Idempotente: upsert por CNPJ fixo, pode rodar várias vezes sem duplicar.
// Roda com: pnpm seed:dev
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/lib/crypto'

const prisma = new PrismaClient()

const DEV_UNIT_CNPJ = '11222333000199'

async function main() {
  const unit = await prisma.unit.upsert({
    where: { cnpj: DEV_UNIT_CNPJ },
    create: {
      name: 'Kumon Dev (seed local)',
      cnpj: DEV_UNIT_CNPJ,
      email: 'dev@educationx.local',
      phone: '31999990000',
      cep: '30000000',
      address: 'Rua Dev',
      number: '1',
      neighborhood: 'Centro',
      city: 'BH',
      state: 'MG',
      isFranchise: true,
      franchiseParent: 'Kumon',
      responsibleName: 'Resp Dev',
      responsibleEmail: 'resp@educationx.local',
      responsiblePhone: '31988880000',
      status: 'ACTIVE',
      billingConfig: {
        create: {
          dueDay: 5,
          closingDay: 1,
          lateFeePercent: 200,
          monthlyInterestBp: 100,
          cardFeePayer: 'RESPONSAVEL',
          negativacaoFeePayer: 'RESPONSAVEL',
          municipalRegistration: '0001',
          planId: 'basico',
          planPriceCents: 39900,
        },
      },
      subjects: {
        create: [
          {
            id: 'subj-dev-matematica',
            name: 'Matemática',
            nfseServiceCode: '0001',
            priceCents: 45000,
            annualPriceCents: 450000,
          },
        ],
      },
    },
    update: {},
  })

  const subject = await prisma.subject.findFirstOrThrow({ where: { unitId: unit.id } })

  const guardian = await prisma.guardian.upsert({
    where: { id: 'guardian-dev-maria' },
    create: {
      id: 'guardian-dev-maria',
      unitId: unit.id,
      name: 'Maria da Silva',
      type: 'MOTHER',
      selfPayer: true,
      cpfEnc: await encrypt('12345678900'),
      emailEnc: await encrypt('maria@educationx.local'),
      phoneEnc: await encrypt('31977776666'),
    },
    update: {},
  })

  const student = await prisma.student.upsert({
    where: { id: 'student-dev-joao' },
    create: {
      id: 'student-dev-joao',
      unitId: unit.id,
      guardianId: guardian.id,
      nameEnc: await encrypt('João da Silva'),
      birthDateEnc: await encrypt('2015-03-10'),
    },
    update: {},
  })

  const enrollment = await prisma.enrollment.upsert({
    where: { id: 'enrollment-dev-joao-matematica' },
    create: {
      id: 'enrollment-dev-joao-matematica',
      unitId: unit.id,
      guardianId: guardian.id,
      studentId: student.id,
      subjectId: subject.id,
      plan: 'MONTHLY',
      agreedPriceCents: 45000,
      finalPriceCents: 45000,
      status: 'ACTIVE',
      startedAt: new Date('2026-08-01'),
      isFirstChargeDone: true,
    },
    update: {},
  })

  const invoiceSeeds = [
    { key: '2026-09', status: 'PENDING' as const, dueDate: new Date('2026-09-05') },
    { key: '2026-08', status: 'BLOCKED' as const, dueDate: new Date('2026-08-05') },
    { key: '2026-07', status: 'ERROR' as const, dueDate: new Date('2026-07-05') },
  ]

  for (const seed of invoiceSeeds) {
    const idempotencyKey = `${enrollment.id}:${seed.key}`
    await prisma.invoice.upsert({
      where: { idempotencyKey },
      create: {
        unitId: unit.id,
        enrollmentId: enrollment.id,
        amountCents: 45000,
        netAmountCents: 45000,
        referenceMonth: seed.key,
        dueDate: seed.dueDate,
        status: seed.status,
        idempotencyKey,
      },
      update: {},
    })
  }

  console.log('✅ Seed de dev pronto.')
  console.log(`DEV_UNIT_ID=${unit.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

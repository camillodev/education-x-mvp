import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { updateSchool, UnitNotFoundError } from '@/lib/services/onboarding.service'
import { cleanupUnits, TEST_PREFIX } from './_setup'
import type { UpdateSchoolInput } from '@/lib/validations/unit'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

// Cria uma Unit completa (Unit + BillingConfig + 1 Subject) direto no banco.
async function seedUnit(suffix = 'a') {
  const cpfEnc = await encrypt('12345678909')
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola ${suffix}`,
      cnpj: `9999999900${suffix === 'a' ? '01' : '02'}81`.slice(-14).padStart(14, '9'),
      email: 'old@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua Velha', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Antigo', responsibleCpfEnc: cpfEnc,
      responsibleEmail: 'old@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
      billingConfig: { create: {
        dueDay: 5, closingDay: 1, lateFeePercent: 100, monthlyInterestBp: 100,
        cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'RESPONSAVEL',
        municipalRegistration: '0001', planId: 'basico', planPriceCents: 39900,
      }},
      subjects: { create: [{ name: 'Antiga', nfseServiceCode: '0001', priceCents: 10000, annualPriceCents: 100000 }] },
    },
  })
}

function validInput(): UpdateSchoolInput {
  return {
    name: `${TEST_PREFIX} Escola Nova`, email: 'novo@e.com', phone: '31999991111',
    cep: '30350540', address: 'Rua Nova Grande', number: '99', neighborhood: 'Savassi',
    city: 'BH', state: 'MG', isFranchise: false,
    responsibleName: 'Maria Nova', responsibleEmail: 'maria@r.com', responsiblePhone: '31977776666',
    billing: { dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 150,
      cardFeePayer: 'ESCOLA', negativacaoFeePayer: 'ESCOLA', municipalRegistration: '9999' },
    plan: { planId: 'crescimento', isBeta: false },
    subjects: [{ name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000, annualPriceCents: 300000, isActive: true }],
  }
}

describe('updateSchool (integração — banco real)', () => {
  it('persiste Unit + BillingConfig + Subjects (substitui matérias)', async () => {
    const unit = await seedUnit()
    await updateSchool(unit.id, validInput())

    const reloaded = await prisma.unit.findUniqueOrThrow({
      where: { id: unit.id },
      include: { billingConfig: true, subjects: true },
    })
    expect(reloaded.name).toBe(`${TEST_PREFIX} Escola Nova`)
    expect(reloaded.city).toBe('BH')
    expect(reloaded.billingConfig?.dueDay).toBe(10)
    expect(reloaded.billingConfig?.planId).toBe('crescimento')
    expect(reloaded.subjects).toHaveLength(1)
    expect(reloaded.subjects[0].name).toBe('Matemática')
  })

  it('não altera cnpj nem responsibleCpfEnc', async () => {
    const unit = await seedUnit()
    const before = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } })
    await updateSchool(unit.id, validInput())
    const after = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } })
    expect(after.cnpj).toBe(before.cnpj)
    expect(after.responsibleCpfEnc).toBe(before.responsibleCpfEnc)
  })

  it('lança UnitNotFoundError se a Unit não existe', async () => {
    await expect(updateSchool('nao-existe', validInput())).rejects.toBeInstanceOf(UnitNotFoundError)
  })

  it('rejeita input inválido na validação antes de tocar o banco', async () => {
    const unit = await seedUnit()
    const bad = validInput()
    // NaN falha no Zod (z.number().int().positive()), então o banco nunca é acionado.
    // Este caso testa a camada de validação, não a transação.
    const broken = { ...bad, subjects: [{ ...bad.subjects[0], priceCents: Number.NaN }] } as unknown as UpdateSchoolInput
    await expect(updateSchool(unit.id, broken)).rejects.toBeTruthy()
    const after = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id }, include: { billingConfig: true } })
    // BillingConfig não mudou (Zod rejeitou antes de qualquer query).
    expect(after.billingConfig?.dueDay).toBe(5)
  })

  it('rollback atômico real: falha no createMany DENTRO da tx reverte o billingConfig.update', async () => {
    // Estratégia (Option B — constraint violation no banco):
    // priceCents: 2_147_483_648 passa no Zod (z.number().int().positive())
    // mas viola o range do tipo INT do Postgres (max 2_147_483_647).
    // A tx executa: unit.update → billingConfig.update (dueDay 5→10) → subject.deleteMany
    // → subject.createMany ← FALHA AQUI no banco.
    // O Postgres reverte tudo. A assertiva confirma que dueDay permanece 5 (não 10).
    const unit = await seedUnit()
    const bad = validInput()
    // 2^31 = 2_147_483_648 > INT max (2_147_483_647) — passa Zod, falha no Postgres
    const overflowCents = 2_147_483_648
    const broken: UpdateSchoolInput = {
      ...bad,
      subjects: [{ ...bad.subjects[0], priceCents: overflowCents, annualPriceCents: overflowCents }],
    }
    await expect(updateSchool(unit.id, broken)).rejects.toBeTruthy()

    const after = await prisma.billingConfig.findFirst({ where: { unitId: unit.id } })
    // dueDay deve ser 5 (seed), NÃO 10 (input) — prova que o rollback reverteu o billingConfig.update
    expect(after?.dueDay).toBe(5)
  })
})

import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { submitGuardianStep, GuardianOwnershipError } from '@/lib/services/enrollment.service'
import { decrypt } from '@/lib/crypto'
import { cleanupUnits, TEST_PREFIX } from './_setup'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

async function seedUnit(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola B2 ${suffix}`,
      cnpj: `11222444000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
    },
  })
}

const VALID_INPUT = {
  name: 'Maria da Silva',
  cpf: '111.444.777-35',
  email: 'maria@example.com',
  phone: '(31) 98888-7777',
  type: 'MOTHER' as const,
}

describe('submitGuardianStep (integração — banco real)', () => {
  it('cria Guardian com PII criptografada (nunca plaintext no banco)', async () => {
    const unit = await seedUnit('01')

    const guardian = await submitGuardianStep(unit.id, null, VALID_INPUT)

    const raw = await prisma.guardian.findUniqueOrThrow({ where: { id: guardian.id } })
    expect(raw.cpfEnc).not.toBe('11144477735')
    expect(raw.cpfEnc).not.toContain('11144477735')
    expect(await decrypt(raw.cpfEnc!)).toBe('11144477735')
    expect(await decrypt(raw.emailEnc!)).toBe('maria@example.com')
    expect(await decrypt(raw.phoneEnc!)).toBe('31988887777')
    expect(raw.unitId).toBe(unit.id)
  })

  it('reenvio do mesmo guardianId atualiza em vez de duplicar (idempotência de back-navigation)', async () => {
    const unit = await seedUnit('02')

    const first = await submitGuardianStep(unit.id, null, VALID_INPUT)
    const second = await submitGuardianStep(unit.id, first.id, { ...VALID_INPUT, name: 'Maria S. Atualizada' })

    expect(second.id).toBe(first.id)
    const count = await prisma.guardian.count({ where: { unitId: unit.id } })
    expect(count).toBe(1)
    const reloaded = await prisma.guardian.findUniqueOrThrow({ where: { id: first.id } })
    expect(reloaded.name).toBe('Maria S. Atualizada')
  })

  it('guardianId de outra unidade nunca é reaproveitado nem vaza — lança GuardianOwnershipError', async () => {
    const unitA = await seedUnit('03')
    const unitB = await seedUnit('04')

    const guardianB = await submitGuardianStep(unitB.id, null, VALID_INPUT)

    await expect(submitGuardianStep(unitA.id, guardianB.id, VALID_INPUT)).rejects.toThrow(
      GuardianOwnershipError
    )

    const stillOwnedByB = await prisma.guardian.findUniqueOrThrow({ where: { id: guardianB.id } })
    expect(stillOwnedByB.unitId).toBe(unitB.id)
  })
})

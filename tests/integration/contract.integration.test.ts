import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { getUnitContract, saveUnitContract, EmptyContractBodyError } from '@/lib/services/contract.service'
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

async function seedUnit(suffix: string) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola Contrato ${suffix}`,
      cnpj: `11222777000${suffix}`.slice(-14).padStart(14, '1'),
      email: 'e@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Resp',
      responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
    },
  })
}

describe('contract.service (integração — banco real)', () => {
  it('escola sem contrato próprio recebe a versão global (fallback) com id real', async () => {
    const unit = await seedUnit('01')

    const result = await getUnitContract(unit.id)

    expect(result.isCustom).toBe(false)
    expect(result.id).toBeTruthy()
    // id real referenciável por TermsAcceptance.termsVersionId (FK obrigatória)
    const globalRow = await prisma.termsVersion.findUnique({ where: { id: result.id } })
    expect(globalRow?.unitId).toBeNull()
  })

  it('salvar grava uma NOVA versão (append-only) e getUnitContract retorna a mais recente', async () => {
    const unit = await seedUnit('02')

    await saveUnitContract(unit.id, 'Primeira versão do contrato')
    // pequeno delay pra garantir createdAt estritamente crescente
    await new Promise((r) => setTimeout(r, 10))
    await saveUnitContract(unit.id, 'Segunda versão do contrato')

    const result = await getUnitContract(unit.id)
    expect(result.body).toBe('Segunda versão do contrato')
    expect(result.isCustom).toBe(true)

    const allVersions = await prisma.termsVersion.findMany({ where: { unitId: unit.id } })
    expect(allVersions).toHaveLength(2)
  })

  it('isolamento: contrato da escola A não aparece pra escola B', async () => {
    const unitA = await seedUnit('03')
    const unitB = await seedUnit('04')

    await saveUnitContract(unitA.id, 'Contrato exclusivo da escola A')

    const resultB = await getUnitContract(unitB.id)
    expect(resultB.isCustom).toBe(false)
    expect(resultB.body).not.toBe('Contrato exclusivo da escola A')
  })

  it('rejeita corpo vazio sem gravar nada', async () => {
    const unit = await seedUnit('05')

    await expect(saveUnitContract(unit.id, '   ')).rejects.toThrow(EmptyContractBodyError)

    const versions = await prisma.termsVersion.findMany({ where: { unitId: unit.id } })
    expect(versions).toHaveLength(0)
  })
})

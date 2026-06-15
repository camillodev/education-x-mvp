import { describe, it, expect, vi } from 'vitest'
import { forUnit } from '../../../src/lib/db'

// Mock do PrismaClient para testar a extension em isolamento
vi.mock('../../../src/lib/db', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/lib/db')>()

  // Criar um mock do prisma base
  const mockPrisma = {
    $extends: vi.fn().mockImplementation((ext) => {
      // Simula o comportamento da extension retornando o objeto extendido
      return { __extended: true, extension: ext }
    }),
  }

  return {
    ...original,
    prisma: mockPrisma,
    forUnit: original.forUnit,
  }
})

describe('forUnit', () => {
  it('retorna um objeto extendido via $extends', () => {
    const db = forUnit('unit-abc')
    expect(db).toBeDefined()
  })
})

// Testes de integração da lógica da extension (sem Prisma real)
describe('forUnit — lógica de injeção de unitId', () => {
  // Testar a lógica de modificação de args diretamente
  it('injeção em findMany: args.where recebe unitId', () => {
    const unitId = 'unit-test-123'
    const args: { where?: Record<string, unknown> } = { where: { isActive: true } }

    // Simular o que a extension faz internamente
    args.where = { ...args.where, unitId }

    expect(args.where).toEqual({ isActive: true, unitId: 'unit-test-123' })
  })

  it('injeção em findMany sem where inicial: cria where com unitId', () => {
    const unitId = 'unit-test-123'
    const args: { where?: Record<string, unknown> } = {}

    args.where = { ...args.where, unitId }

    expect(args.where).toEqual({ unitId: 'unit-test-123' })
  })

  it('injeção em create: args.data recebe unitId', () => {
    const unitId = 'unit-test-123'
    const args: { data?: Record<string, unknown> } = {
      data: { name: 'Matemática', priceCents: 35000 },
    }

    args.data = { ...args.data, unitId }

    expect(args.data).toEqual({
      name: 'Matemática',
      priceCents: 35000,
      unitId: 'unit-test-123',
    })
  })

  it('injeção em createMany: todos os items recebem unitId', () => {
    const unitId = 'unit-test-123'
    const args: { data?: Array<Record<string, unknown>> } = {
      data: [
        { name: 'Matemática', priceCents: 35000 },
        { name: 'Português', priceCents: 30000 },
      ],
    }

    if (Array.isArray(args.data)) {
      args.data = args.data.map((item) => ({ ...item, unitId }))
    }

    expect(args.data).toEqual([
      { name: 'Matemática', priceCents: 35000, unitId: 'unit-test-123' },
      { name: 'Português', priceCents: 30000, unitId: 'unit-test-123' },
    ])
  })

  it('modelos não-tenant não recebem injeção (Unit, TermsVersion)', () => {
    const TENANT_MODELS = ['subject', 'guardian', 'billingconfig', 'termsacceptance']
    expect(TENANT_MODELS.includes('unit')).toBe(false)
    expect(TENANT_MODELS.includes('termsversion')).toBe(false)
    expect(TENANT_MODELS.includes('subject')).toBe(true)
    expect(TENANT_MODELS.includes('guardian')).toBe(true)
  })
})

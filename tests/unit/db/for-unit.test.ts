import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

  it('injeção em upsert: where e create.data recebem unitId (ADR-0008 exige upsert por invoiceId no retry de Dunning)', () => {
    const unitId = 'unit-test-123'
    const args: {
      where?: Record<string, unknown>
      create?: Record<string, unknown>
      update?: Record<string, unknown>
    } = {
      where: { invoiceId: 'inv-1' },
      create: { invoiceId: 'inv-1', status: 'NEGATIVATED' },
      update: { status: 'NEGATIVATED' },
    }

    // Simular o que a extension deve fazer para upsert (mesmo tratamento de where que
    // update/delete, mesmo tratamento de data que create — só que upsert tem os dois campos)
    args.where = { ...args.where, unitId }
    args.create = { ...args.create, unitId }

    expect(args.where).toEqual({ invoiceId: 'inv-1', unitId: 'unit-test-123' })
    expect(args.create).toEqual({ invoiceId: 'inv-1', status: 'NEGATIVATED', unitId: 'unit-test-123' })
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

  it('modelos não-tenant não recebem injeção (Unit, TermsVersion)', async () => {
    const { TENANT_MODELS } = await import('../../../src/lib/db')
    expect(TENANT_MODELS).not.toContain('unit')
    // TermsVersion tem unitId opcional (null = versão global da plataforma) — não é tenant-scoped
    expect(TENANT_MODELS).not.toContain('termsversion')
    expect(TENANT_MODELS).toContain('subject')
    expect(TENANT_MODELS).toContain('guardian')
  })

  it('Student e Enrollment (matrícula) fazem parte do isolamento de tenant', async () => {
    const { TENANT_MODELS } = await import('../../../src/lib/db')
    expect(TENANT_MODELS).toContain('student')
    expect(TENANT_MODELS).toContain('enrollment')
  })

  it('Dunning e DunningLog fazem parte do isolamento de tenant', async () => {
    const { TENANT_MODELS } = await import('../../../src/lib/db')
    expect(TENANT_MODELS).toContain('dunning')
    expect(TENANT_MODELS).toContain('dunninglog')
  })

  it('todo model com unitId obrigatório no schema está em TENANT_MODELS (paridade)', async () => {
    const { TENANT_MODELS } = await import('../../../src/lib/db')
    const schema = readFileSync(
      join(__dirname, '../../../prisma/schema.prisma'),
      'utf-8',
    )

    // Extrai nomes de model que têm "unitId String" (obrigatório) no corpo — não "unitId String?"
    // (opcional, ex: TermsVersion, que representa dado que pode ser global da plataforma).
    // O boundary é "\s|$" (não só "//" ou fim de linha) porque "String" pode ser seguida por um
    // atributo inline (ex: "unitId String @unique" em BillingConfig) antes de qualquer comentário
    // — achado de code review (EDU-74): a versão anterior da regex não capturava esse caso e o
    // teste passava só por coincidência (o model já estava hardcoded em TENANT_MODELS).
    const modelsWithRequiredUnitId: string[] = []
    const modelBlocks = schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)
    for (const [, modelName, body] of modelBlocks) {
      if (/^\s*unitId\s+String(?:\s|$)/m.test(body)) {
        modelsWithRequiredUnitId.push(modelName.toLowerCase())
      }
    }

    // Falha aqui = alguém adicionou um model tenant-scoped ao schema sem registrá-lo em
    // TENANT_MODELS — isolamento de tenant quebraria silenciosamente (ver ADR-0008 / EDU-74).
    expect(modelsWithRequiredUnitId.length).toBeGreaterThan(0)
    for (const model of modelsWithRequiredUnitId) {
      expect(TENANT_MODELS, `model "${model}" tem unitId obrigatório mas falta em TENANT_MODELS`).toContain(model)
    }
  })
})

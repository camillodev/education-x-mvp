import { prisma } from '../db'
import { getTermsByKind } from '../terms/content'

const CONTRACT_KIND = 'ESCOLA_RESPONSAVEL' as const

export class EmptyContractBodyError extends Error {
  readonly status = 422
  constructor() {
    super('O texto do contrato não pode ficar vazio')
    this.name = 'EmptyContractBodyError'
  }
}

export interface UnitContract {
  body: string
  version: string
  isCustom: boolean
}

export async function getUnitContract(unitId: string): Promise<UnitContract> {
  const custom = await prisma.termsVersion.findFirst({
    where: { unitId, kind: CONTRACT_KIND },
    orderBy: { createdAt: 'desc' },
  })

  if (custom) {
    return { body: custom.body, version: custom.version, isCustom: true }
  }

  const fallback = getTermsByKind(CONTRACT_KIND)
  return { body: fallback?.body ?? '', version: fallback?.version ?? '1.0', isCustom: false }
}

export async function saveUnitContract(unitId: string, body: string): Promise<UnitContract> {
  const trimmed = body.trim()
  if (!trimmed) throw new EmptyContractBodyError()

  const created = await prisma.termsVersion.create({
    data: {
      unitId,
      kind: CONTRACT_KIND,
      version: new Date().toISOString(),
      body: trimmed,
    },
  })

  return { body: created.body, version: created.version, isCustom: true }
}

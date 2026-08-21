import { prisma } from '../db'

const CONTRACT_KIND = 'ESCOLA_RESPONSAVEL' as const

export class EmptyContractBodyError extends Error {
  readonly status = 422
  constructor() {
    super('O texto do contrato não pode ficar vazio')
    this.name = 'EmptyContractBodyError'
  }
}

export class NoContractVersionError extends Error {
  readonly status = 500
  constructor() {
    super('Nenhuma versão de contrato disponível (nem custom, nem global)')
    this.name = 'NoContractVersionError'
  }
}

export interface UnitContract {
  id: string
  body: string
  version: string
  isCustom: boolean
}

// Toda TermsAcceptance precisa apontar pra uma TermsVersion real (FK obrigatória) —
// por isso o fallback busca a versão global no banco (seed-ESCOLA_RESPONSAVEL-*, unitId
// null) em vez do texto estático de TERMS_DOCUMENTS: garante um id de verdade pra referenciar.
export async function getUnitContract(unitId: string): Promise<UnitContract> {
  const custom = await prisma.termsVersion.findFirst({
    where: { unitId, kind: CONTRACT_KIND },
    orderBy: { createdAt: 'desc' },
  })
  if (custom) {
    return { id: custom.id, body: custom.body, version: custom.version, isCustom: true }
  }

  const global = await prisma.termsVersion.findFirst({
    where: { unitId: null, kind: CONTRACT_KIND },
    orderBy: { createdAt: 'desc' },
  })
  if (!global) throw new NoContractVersionError()

  return { id: global.id, body: global.body, version: global.version, isCustom: false }
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

  return { id: created.id, body: created.body, version: created.version, isCustom: true }
}

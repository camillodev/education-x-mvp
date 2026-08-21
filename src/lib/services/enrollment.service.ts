import { prisma, forUnit } from '../db'
import { encrypt } from '../crypto'
import { GuardianStepSchema, type GuardianStepInput } from '../validations/guardian'
import type { Guardian } from '@prisma/client'

export class InvalidEnrollmentLinkError extends Error {
  readonly status = 404
  constructor() {
    super('Link de matrícula inválido ou expirado')
    this.name = 'InvalidEnrollmentLinkError'
  }
}

export class GuardianOwnershipError extends Error {
  readonly status = 403
  constructor() {
    super('Guardian não pertence a esta unidade')
    this.name = 'GuardianOwnershipError'
  }
}

export interface EnrollmentLinkContext {
  unitId: string
  unitName: string
}

// Resolve o link público e estável de matrícula (/m/[token]) para a Unit correspondente.
// Nunca escreve no banco — tela B1 é 100% leitura.
export async function resolveEnrollmentLink(token: string): Promise<EnrollmentLinkContext> {
  const unit = await prisma.unit.findUnique({
    where: { enrollmentLinkToken: token },
    select: { id: true, name: true },
  })

  if (!unit) throw new InvalidEnrollmentLinkError()

  return { unitId: unit.id, unitName: unit.name }
}

// B2 — cria ou atualiza o Guardian do fluxo de matrícula em andamento.
// existingGuardianId vem do cookie de sessão de matrícula (httpOnly) — nunca de input
// direto do formulário. Se presente, precisa pertencer a esta unitId (forUnit já filtra);
// caso contrário, GuardianOwnershipError — nunca criamos silenciosamente pra outro tenant.
export async function submitGuardianStep(
  unitId: string,
  existingGuardianId: string | null,
  input: GuardianStepInput
): Promise<Guardian> {
  const data = GuardianStepSchema.parse(input)
  const db = forUnit(unitId)

  const [cpfEnc, emailEnc, phoneEnc] = await Promise.all([
    encrypt(data.cpf),
    encrypt(data.email),
    encrypt(data.phone),
  ])

  const guardianData = {
    unitId,
    name: data.name,
    cpfEnc,
    emailEnc,
    phoneEnc,
    type: data.type,
  }

  if (!existingGuardianId) {
    return db.guardian.create({ data: guardianData })
  }

  const existing = await db.guardian.findFirst({ where: { id: existingGuardianId } })
  if (!existing) throw new GuardianOwnershipError()

  return db.guardian.update({ where: { id: existingGuardianId }, data: guardianData })
}

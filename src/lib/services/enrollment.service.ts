import { prisma } from '../db'

export class InvalidEnrollmentLinkError extends Error {
  readonly status = 404
  constructor() {
    super('Link de matrícula inválido ou expirado')
    this.name = 'InvalidEnrollmentLinkError'
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

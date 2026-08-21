import { forUnit } from '../db'
import { decrypt } from '../crypto'
import { getAsaasClient } from '../integration/asaas/client'
import type { EnrollmentPlanValue } from '../validations/plan'

export class GuardianNotFoundError extends Error {
  readonly status = 404
  constructor() {
    super('Matrícula não encontrada nesta unidade')
    this.name = 'GuardianNotFoundError'
  }
}

// B8/EDU-15 — a escola aprova/recusa a matrícula da FAMÍLIA inteira (Guardian), não
// Enrollment por Enrollment: 1 aceite (EDU-13) já cobre todos os Enrollments de um
// Guardian, então aprovar/recusar precisa mover todos juntos — do contrário a escola
// poderia aprovar 1 matéria e deixar outra pendente sob o mesmo aceite, e a criação do
// customer Asaas dispararia mais de uma vez pro mesmo responsável.
export async function approveEnrollment(
  unitId: string,
  guardianId: string,
  asaasApiKey: string
): Promise<void> {
  const db = forUnit(unitId)
  const guardian = await db.guardian.findFirst({ where: { id: guardianId } })
  if (!guardian) throw new GuardianNotFoundError()

  let asaasCustomerId = guardian.asaasCustomerId

  if (!asaasCustomerId) {
    const cpf = await decrypt(guardian.cpfEnc!)
    const client = getAsaasClient(asaasApiKey)

    // Recuperação de escrita perdida: o customer pode já existir no Asaas de uma
    // tentativa anterior cujo asaasCustomerId não chegou a ser persistido no banco.
    const existing = await client.findCustomerByCpfCnpj(cpf)
    if (existing) {
      asaasCustomerId = existing.id
    } else {
      const created = await client.createCustomer({
        name: guardian.name,
        cpfCnpj: cpf,
        externalReference: guardian.id,
      })
      asaasCustomerId = created.id
    }

    await db.guardian.update({ where: { id: guardianId }, data: { asaasCustomerId } })
  }

  await db.enrollment.updateMany({
    where: { guardianId },
    data: { status: 'ACTIVE', startedAt: new Date() },
  })
}

export interface PendingEnrollmentGroup {
  guardianId: string
  guardianName: string
  plan: EnrollmentPlanValue
  students: string[]
  totalCents: number
}

// Lista agrupada por Guardian (1 linha por família pendente), não por Enrollment —
// mesma unidade de aprovação usada em approveEnrollment/rejectEnrollment.
export async function listPendingEnrollments(unitId: string): Promise<PendingEnrollmentGroup[]> {
  const db = forUnit(unitId)
  const enrollments = await db.enrollment.findMany({
    where: { status: 'PENDING_SCHOOL_APPROVAL' },
    include: { guardian: true, student: true, subject: true },
  })

  const groups = new Map<string, PendingEnrollmentGroup & { studentIds: Set<string> }>()
  for (const e of enrollments) {
    let group = groups.get(e.guardianId)
    if (!group) {
      group = {
        guardianId: e.guardianId,
        guardianName: e.guardian.name,
        plan: e.plan,
        students: [],
        totalCents: 0,
        studentIds: new Set(),
      }
      groups.set(e.guardianId, group)
    }
    group.totalCents += e.finalPriceCents
    if (!group.studentIds.has(e.studentId)) {
      group.studentIds.add(e.studentId)
      group.students.push(await decrypt(e.student.nameEnc))
    }
  }

  return [...groups.values()].map((group) => ({
    guardianId: group.guardianId,
    guardianName: group.guardianName,
    plan: group.plan,
    students: group.students,
    totalCents: group.totalCents,
  }))
}

export async function rejectEnrollment(unitId: string, guardianId: string): Promise<void> {
  const db = forUnit(unitId)
  await db.enrollment.updateMany({
    where: { guardianId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
}

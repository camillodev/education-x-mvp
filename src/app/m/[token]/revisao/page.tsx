import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { prisma } from '@/lib/db'
import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'
import { getUnitContract } from '@/lib/services/contract.service'
import { decrypt } from '@/lib/crypto'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { RevisaoForm, type StudentSummary } from './RevisaoForm'

export const dynamic = 'force-dynamic'

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function MatriculaRevisaoPage({ params }: Props) {
  const { token } = await params

  let unitId: string
  try {
    ;({ unitId } = await resolveEnrollmentLink(token))
  } catch {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-(--color-text)">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-(--color-text-subtle)">
          Fale com a secretaria da escola para receber um novo link.
        </p>
      </main>
    )
  }

  const cookieStore = await cookies()
  const guardianId = cookieStore.get(GUARDIAN_COOKIE)?.value
  if (!guardianId) {
    redirect(`/m/${token}/dados` as Route)
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { unitId, guardianId },
    include: { student: true, subject: true },
  })

  if (enrollments.length === 0) {
    redirect(`/m/${token}/plano` as Route)
  }

  const studentMap = new Map<string, StudentSummary>()
  for (const e of enrollments) {
    const name = await decrypt(e.student.nameEnc)
    const existing = studentMap.get(e.studentId)
    if (existing) {
      existing.subjectNames.push(e.subject.name)
    } else {
      studentMap.set(e.studentId, { name, subjectNames: [e.subject.name] })
    }
  }

  const totalCents = enrollments.reduce((sum, e) => sum + e.finalPriceCents, 0)
  const plan = enrollments[0].plan
  const billingConfig = await prisma.billingConfig.findUnique({ where: { unitId }, select: { dueDay: true } })
  const contract = await getUnitContract(unitId)

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <RevisaoForm
        token={token}
        students={[...studentMap.values()]}
        planLabel={PLAN_LABELS[plan] ?? plan}
        totalCents={totalCents}
        dueDay={billingConfig?.dueDay ?? 10}
        contractBody={contract.body}
      />
    </main>
  )
}

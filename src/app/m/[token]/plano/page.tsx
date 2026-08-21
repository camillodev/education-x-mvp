import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { prisma } from '@/lib/db'
import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'
import { availablePlans, priceCentsForPlan, type SubjectPricing } from '@/lib/validations/plan'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { STUDENTS_COOKIE, decodeStudentsCookie } from '../aluno/cookie'
import { PlanForm, type PlanCardData } from './PlanForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function MatriculaPlanoPage({ params }: Props) {
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
  const selection = decodeStudentsCookie(cookieStore.get(STUDENTS_COOKIE)?.value)
  if (!cookieStore.get(GUARDIAN_COOKIE)?.value || selection.length === 0) {
    redirect(`/m/${token}/dados` as Route)
  }

  const subjectIds = [...new Set(selection.flatMap((s) => s.subjectIds))]
  const subjects = (await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, priceCents: true, quarterlyPriceCents: true, semiannualPriceCents: true, annualPriceCents: true },
  })) satisfies SubjectPricing[]

  const plans = availablePlans(subjects)
  const totalSubjectSelections = selection.reduce((sum, s) => sum + s.subjectIds.length, 0)
  const subjectById = new Map(subjects.map((s) => [s.id, s]))

  const cards: PlanCardData[] = plans.map((plan) => {
    let totalCents = 0
    for (const item of selection) {
      for (const subjectId of item.subjectIds) {
        const subject = subjectById.get(subjectId)
        const price = subject ? priceCentsForPlan(subject, plan) : null
        totalCents += price ?? 0
      }
    }
    return { plan, totalCents }
  })

  const monthlyCard = cards.find((c) => c.plan === 'MONTHLY')

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <PlanForm
        token={token}
        cards={cards}
        monthlyTotalCents={monthlyCard?.totalCents ?? 0}
        studentCount={selection.length}
        subjectSelectionCount={totalSubjectSelections}
      />
    </main>
  )
}

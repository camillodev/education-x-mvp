import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { prisma } from '@/lib/db'
import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { StudentsForm } from './StudentsForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function MatriculaAlunoPage({ params }: Props) {
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
  if (!cookieStore.get(GUARDIAN_COOKIE)?.value) {
    redirect(`/m/${token}/dados` as Route)
  }

  const subjects = await prisma.subject.findMany({
    where: { unitId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <StudentsForm token={token} subjects={subjects} />
    </main>
  )
}

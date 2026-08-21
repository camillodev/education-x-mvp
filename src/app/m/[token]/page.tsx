import Link from 'next/link'
import type { Route } from 'next'
import { Card } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ prefilledStudentName?: string }>
}

export default async function MatriculaBoasVindasPage({ params, searchParams }: Props) {
  const { token } = await params
  const { prefilledStudentName } = await searchParams

  let context: Awaited<ReturnType<typeof resolveEnrollmentLink>> | null = null
  try {
    context = await resolveEnrollmentLink(token)
  } catch {
    context = null
  }

  if (!context) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-(--color-text)">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-(--color-text-subtle)">
          Fale com a secretaria da escola para receber um novo link.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Card className="p-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-primary)">
          Education X
        </span>
        <h1 className="mt-3 text-2xl font-bold text-(--color-text)">{context.unitName}</h1>
        {prefilledStudentName && (
          <p className="mt-2 text-sm text-(--color-text-subtle)">
            Matrícula de <strong>{prefilledStudentName}</strong>
          </p>
        )}
        <p className="mt-4 text-sm text-(--color-text-subtle)">
          Vamos matricular seu filho ou filha em poucos passos, direto pelo celular.
        </p>
        <Link
          href={`/m/${token}/dados` as Route}
          className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}
        >
          Começar matrícula
        </Link>
      </Card>
    </main>
  )
}

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { Card } from '@/components/ui/Card'
import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'
import { ACCEPTANCE_COOKIE } from '../revisao/cookie'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function MatriculaEnviadaPage({ params }: Props) {
  const { token } = await params

  try {
    await resolveEnrollmentLink(token)
  } catch {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold text-(--color-text)">Link inválido ou expirado</h1>
      </main>
    )
  }

  const cookieStore = await cookies()
  if (!cookieStore.get(ACCEPTANCE_COOKIE)?.value) {
    redirect(`/m/${token}` as Route)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Card className="p-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-primary)">
          Matrícula enviada
        </span>
        <h1 className="mt-3 text-2xl font-bold text-(--color-text)">Aguardando aprovação da escola</h1>
        <p className="mt-4 text-sm text-(--color-text-subtle)">
          Recebemos os dados da matrícula e o aceite do contrato. A escola vai analisar e confirmar em breve.
        </p>
      </Card>
    </main>
  )
}

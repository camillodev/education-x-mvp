import { resolveEnrollmentLink } from '@/lib/services/enrollment.service'
import { GuardianForm } from './GuardianForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function MatriculaDadosPage({ params }: Props) {
  const { token } = await params

  try {
    await resolveEnrollmentLink(token)
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <GuardianForm token={token} />
    </main>
  )
}

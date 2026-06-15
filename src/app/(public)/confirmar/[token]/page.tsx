import { prisma } from '@/lib/db'
import { TERMS_DOCUMENTS } from '@/lib/terms/content'
import { ConfirmActions } from './ConfirmActions'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ConfirmarPage({ params }: Props) {
  const { token } = await params

  const unit = await prisma.unit.findUnique({
    where: { confirmationToken: token },
    select: {
      name: true,
      responsibleName: true,
      confirmedAt: true,
      confirmationTokenExpiresAt: true,
    },
  })

  const expired =
    !unit ||
    !unit.confirmationTokenExpiresAt ||
    unit.confirmationTokenExpiresAt.getTime() < Date.now()

  if (!unit || expired) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-800">Link inválido ou expirado</h1>
        <p className="mt-2 text-sm text-gray-500">
          Este link de confirmação não é mais válido. Entre em contato com a Impact X para
          receber um novo.
        </p>
      </main>
    )
  }

  if (unit.confirmedAt) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-800">Cadastro já confirmado</h1>
        <p className="mt-2 text-sm text-gray-500">
          A {unit.name} já teve seus termos aceitos. Nada mais a fazer aqui.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6">
        <span className="text-sm font-semibold text-[var(--color-primary)]">Education X</span>
        <h1 className="mt-2 text-2xl font-semibold text-gray-800">
          Confirmar cadastro da {unit.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Olá, {unit.responsibleName}. Revise os termos abaixo e confirme para ativar a conta.
        </p>
      </header>

      <div className="space-y-4">
        {TERMS_DOCUMENTS.map((doc) => (
          <details key={doc.kind} className="rounded-md border border-gray-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              {titleFor(doc.kind)} (v{doc.version})
            </summary>
            <article className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {doc.body}
            </article>
          </details>
        ))}
      </div>

      <ConfirmActions token={token} />
    </main>
  )
}

function titleFor(kind: string): string {
  const map: Record<string, string> = {
    IX_ESCOLA: 'Termos de Uso — Impact X e Escola',
    ESCOLA_RESPONSAVEL: 'Termos — Escola e Responsável',
    PRIVACY: 'Política de Privacidade',
  }
  return map[kind] ?? kind
}

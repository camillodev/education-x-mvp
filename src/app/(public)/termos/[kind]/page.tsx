import { notFound } from 'next/navigation'
import { getTermsByKind } from '@/lib/terms/content'
import type { TermsKind } from '@prisma/client'

interface Props {
  params: Promise<{ kind: string }>
}

const VALID_KINDS: TermsKind[] = ['IX_ESCOLA', 'ESCOLA_RESPONSAVEL', 'PRIVACY']

export default async function TermosPage({ params }: Props) {
  const { kind } = await params

  const normalizedKind = kind.toUpperCase() as TermsKind
  if (!VALID_KINDS.includes(normalizedKind)) notFound()

  const doc = getTermsByKind(normalizedKind)
  if (!doc) notFound()

  const titles: Record<TermsKind, string> = {
    IX_ESCOLA: 'Termos de Uso — Impact X e Escola',
    ESCOLA_RESPONSAVEL: 'Termos de Uso — Escola e Responsável',
    PRIVACY: 'Política de Privacidade',
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-primary)]">
          {titles[normalizedKind]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Versão {doc.version}</p>
      </header>
      <article className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
        {doc.body}
      </article>
    </main>
  )
}

export function generateStaticParams() {
  return VALID_KINDS.map((kind) => ({ kind: kind.toLowerCase() }))
}

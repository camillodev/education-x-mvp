import { notFound } from 'next/navigation'
import { getTermsByKind } from '@/lib/terms/content'
import { IxEscolaTerms } from '@/components/terms/IxEscolaTerms'
import { EscolaResponsavelTerms } from '@/components/terms/EscolaResponsavelTerms'
import { PrivacyTerms } from '@/components/terms/PrivacyTerms'
import type { TermsKind } from '@prisma/client'

interface Props {
  params: Promise<{ kind: string }>
}

const VALID_KINDS: TermsKind[] = ['IX_ESCOLA', 'ESCOLA_RESPONSAVEL', 'PRIVACY']

const TERMS_BODY: Record<TermsKind, React.ComponentType> = {
  IX_ESCOLA: IxEscolaTerms,
  ESCOLA_RESPONSAVEL: EscolaResponsavelTerms,
  PRIVACY: PrivacyTerms,
}

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

  const TermsBody = TERMS_BODY[normalizedKind]

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-primary)]">
          {titles[normalizedKind]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Versão {doc.version}</p>
      </header>
      <article
        className="max-w-none text-sm leading-relaxed text-gray-700
          [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--color-primary)]
          [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900
          [&_p]:mb-4 [&_p]:first:mt-0
          [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-[lower-alpha] [&_ol]:pl-6
          [&_li]:mb-1
          [&_strong]:font-semibold [&_strong]:text-gray-900
          [&_hr]:my-8 [&_hr]:border-gray-200
          [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse
          [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold
          [&_td]:border [&_td]:border-gray-200 [&_td]:p-2"
      >
        <TermsBody />
      </article>
    </main>
  )
}

export function generateStaticParams() {
  return VALID_KINDS.map((kind) => ({ kind: kind.toLowerCase() }))
}

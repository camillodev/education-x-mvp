'use client'

import type { OnboardingState, DadosState, CobrancaState, PlanoState } from '@/hooks/use-onboarding'
import type { SubjectInput } from '@/lib/validations/unit'
import { formatBRL, maskCnpj } from '@/lib/format'
import { getPlan } from '@/lib/data/plans'
import { computeDiscountedCents } from '@/lib/pricing'

// Aceita OnboardingState ou qualquer estado compatível (ex: EditEscolaState)
type RevisaoCompatState = {
  dados: DadosState
  cobranca: CobrancaState
  plano: PlanoState
  subjects: SubjectInput[]
  status: OnboardingState['status']
  errorMsg?: string
}

interface Props {
  state: RevisaoCompatState
  onEditStep: (step: 1 | 2 | 3) => void
  onSubmit: () => void
  loadingSteps?: string[]
  submitLabel?: string
}

export function StepRevisao({ state, onEditStep, onSubmit, loadingSteps, submitLabel }: Props) {
  const isSubmitting = state.status === 'submitting'

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Escola cadastrada!</h2>
        <p className="max-w-md text-sm text-gray-500">
          Enviamos um e-mail para <strong>{state.dados.responsibleEmail}</strong> com o link de
          confirmação. A escola fica pendente até o responsável aceitar os termos. Só então a
          conta é ativada.
        </p>
        <a
          href="/onboarding"
          className="mt-2 rounded-md bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Cadastrar outra escola
        </a>
      </div>
    )
  }

  if (isSubmitting && loadingSteps) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-6 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        <div className="space-y-2 text-center">
          {loadingSteps.map((step, idx) => (
            <p key={idx} className="text-sm text-gray-500">
              {step}
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-primary)]">Revisão e envio</h2>
        <p className="mt-1 text-sm text-gray-500">
          Confira os dados. Ao enviar, a escola é criada como pendente e o responsável recebe um
          e-mail para confirmar e aceitar os termos.
        </p>
      </div>

      {/* Bloco: Dados */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="label">Dados da escola</h3>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Editar
          </button>
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">Nome</dt>
            <dd className="font-medium">{state.dados.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">CNPJ</dt>
            <dd className="font-medium">{state.dados.cnpj ? maskCnpj(state.dados.cnpj) : '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Endereço</dt>
            <dd className="font-medium">
              {state.dados.address}, {state.dados.number}
              {state.dados.complement ? ` — ${state.dados.complement}` : ''} ·{' '}
              {state.dados.neighborhood} · {state.dados.city} — {state.dados.state}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Responsável</dt>
            <dd className="font-medium">
              {state.dados.responsibleName} · {state.dados.responsibleEmail}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloco: Cobrança */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="label">Cobrança aos responsáveis</h3>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Editar
          </button>
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">Fechamento (cobrança + plano)</dt>
            <dd className="font-medium">Dia {state.cobranca.closingDay}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Vencimento</dt>
            <dd className="font-medium">Dia {state.cobranca.dueDay}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Multa</dt>
            <dd className="font-medium">{(state.cobranca.lateFeePercent / 100).toFixed(2)}%</dd>
          </div>
          <div>
            <dt className="text-gray-400">Juros</dt>
            <dd className="font-medium">{(state.cobranca.monthlyInterestBp / 100).toFixed(2)}% a.m.</dd>
          </div>
          <div>
            <dt className="text-gray-400">Taxa do cartão</dt>
            <dd className="font-medium">
              {state.cobranca.cardFeePayer === 'ESCOLA' ? 'Escola' : 'Responsável'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Taxa de negativação</dt>
            <dd className="font-medium">
              {state.cobranca.negativacaoFeePayer === 'ESCOLA' ? 'Escola' : 'Responsável'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloco: Plano */}
      {(() => {
        const plan = getPlan(state.plano.planId)
        if (!plan) return null
        const hasDiscount = state.plano.discountEnabled && state.plano.discountValue.trim() !== ''
        const { finalCents } = hasDiscount
          ? computeDiscountedCents(plan.priceCents, state.plano.discountType, state.plano.discountValue)
          : { finalCents: plan.priceCents }
        return (
          <div className="rounded-md border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="label">Plano da escola</h3>
              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Editar
              </button>
            </div>
            <dl className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-400">Plano</dt>
                <dd className="font-medium">
                  {plan.name}
                  {state.plano.isBeta && (
                    <span className="ml-2 rounded bg-[var(--color-primary-softer)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                      Beta
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Valor mensal</dt>
                <dd className="font-medium">
                  {hasDiscount ? (
                    <>
                      <span className="text-gray-400 line-through">{formatBRL(plan.priceCents)}</span>{' '}
                      <span className="font-semibold text-[var(--color-primary)]">
                        {formatBRL(finalCents)}
                      </span>
                    </>
                  ) : (
                    formatBRL(plan.priceCents)
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )
      })()}

      {/* Bloco: Matérias */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="label">
            Matérias ({state.subjects.length})
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Editar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-[var(--color-text-subtle)]">
                <th className="py-1.5 pr-2 text-left font-medium">Matéria</th>
                <th className="px-2 py-1.5 text-right font-medium">Mensal</th>
                <th className="px-2 py-1.5 text-right font-medium">Trimestral</th>
                <th className="px-2 py-1.5 text-right font-medium">Semestral</th>
                <th className="py-1.5 pl-2 text-right font-medium">Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.subjects.map((s, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2">
                    <span className="font-medium text-[var(--color-text)]">{s.name}</span>{' '}
                    <span className="text-xs text-gray-400">({s.nfseServiceCode})</span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{formatBRL(s.priceCents)}</td>
                  <td className="px-2 py-2 text-right text-[var(--color-text-subtle)]">
                    {s.quarterlyPriceCents ? formatBRL(s.quarterlyPriceCents) : '—'}
                  </td>
                  <td className="px-2 py-2 text-right text-[var(--color-text-subtle)]">
                    {s.semiannualPriceCents ? formatBRL(s.semiannualPriceCents) : '—'}
                  </td>
                  <td className="py-2 pl-2 text-right text-[var(--color-text-subtle)]">
                    {s.annualPriceCents ? formatBRL(s.annualPriceCents) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
            Valores por mês em cada plano de fidelidade.
          </p>
        </div>
      </div>

      {state.errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full rounded-md bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {isSubmitting ? 'Salvando...' : (submitLabel ?? 'Cadastrar e enviar confirmação')}
      </button>
    </div>
  )
}

'use client'

import type { OnboardingState } from '@/hooks/use-onboarding'

interface Props {
  state: OnboardingState
  onEditStep: (step: 1 | 2 | 3) => void
  onAcceptTerms: (accepted: boolean) => void
  onSubmit: () => void
  loadingSteps?: string[]
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function StepRevisao({ state, onEditStep, onAcceptTerms, onSubmit, loadingSteps }: Props) {
  const isSubmitting = state.status === 'submitting'

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Escola criada com sucesso!</h2>
        <p className="text-sm text-gray-500">
          A subconta Asaas foi provisionada e a escola está pronta para receber matrículas.
        </p>
        <a
          href="/dashboard"
          className="mt-2 rounded-md bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Ir para o dashboard
        </a>
      </div>
    )
  }

  if (isSubmitting && loadingSteps) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
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
      <h2 className="text-lg font-semibold text-gray-800">Revisão e confirmação</h2>

      {/* Bloco: Dados */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Dados da escola</h3>
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
            <dd className="font-medium">{state.dados.cnpj || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">E-mail</dt>
            <dd className="font-medium">{state.dados.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Telefone</dt>
            <dd className="font-medium">{state.dados.phone || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Endereço</dt>
            <dd className="font-medium">
              {state.dados.address}, {state.dados.city} — {state.dados.state}
            </dd>
          </div>
        </dl>
      </div>

      {/* Bloco: Cobrança */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Configuração de cobrança</h3>
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
            <dt className="text-gray-400">Vencimento</dt>
            <dd className="font-medium">Dia {state.cobranca.dueDay}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Fechamento</dt>
            <dd className="font-medium">Dia {state.cobranca.closingDay}</dd>
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
            <dt className="text-gray-400">Negativação SPC</dt>
            <dd className="font-medium">{state.cobranca.enablesSpc ? 'Sim' : 'Não'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Aceita cartão</dt>
            <dd className="font-medium">{state.cobranca.acceptsCard ? 'Sim' : 'Não'}</dd>
          </div>
        </dl>
      </div>

      {/* Bloco: Matérias */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
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
        <ul className="space-y-1 text-sm">
          {state.subjects.map((s, idx) => (
            <li key={idx} className="flex items-center justify-between">
              <span>
                {s.name}{' '}
                <span className="text-gray-400 text-xs">({s.nfseServiceCode})</span>
              </span>
              <span className="font-medium">{formatBRL(s.priceCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Aceite clickwrap */}
      <div className="rounded-md border border-[var(--color-primary)] bg-blue-50 p-4">
        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.termsAccepted}
            onChange={(e) => onAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            aria-label="Aceitar termos de uso"
          />
          <span>
            Li e aceito os{' '}
            <a
              href="/termos/ix_escola"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[var(--color-primary)]"
            >
              Termos de Uso IX↔Escola
            </a>
            , os{' '}
            <a
              href="/termos/escola_responsavel"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[var(--color-primary)]"
            >
              Termos Escola↔Responsável
            </a>{' '}
            e a{' '}
            <a
              href="/termos/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[var(--color-primary)]"
            >
              Política de Privacidade
            </a>
            . Entendo que a Impact X é operadora dos dados e que a escola é responsável pelo relacionamento com os responsáveis financeiros.
          </span>
        </label>
      </div>

      {state.errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!state.termsAccepted || isSubmitting}
        className="w-full rounded-md bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        aria-disabled={!state.termsAccepted || isSubmitting}
      >
        {isSubmitting ? 'Criando escola...' : 'Criar escola'}
      </button>
    </div>
  )
}

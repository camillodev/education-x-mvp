'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { Stepper } from '@/components/patterns/Stepper'
import { StepDados } from '@/components/onboarding/StepDados'
import { StepFinanceiro } from '@/components/onboarding/StepFinanceiro'
import { StepDocumentos } from '@/components/onboarding/StepDocumentos'
import { StepRevisao } from '@/components/onboarding/StepRevisao'
import { useToast } from '@/components/ui/toast'

const STEPS = [
  { label: 'Dados da escola', description: 'Identidade, endereço e responsável' },
  { label: 'Financeiro', description: 'Cobrança e plano da escola' },
  { label: 'Matérias', description: 'Disciplinas oferecidas pela escola' },
  { label: 'Revisão', description: 'Confirme os dados e envie' },
]

const LOADING_STEPS = [
  'Validando CNPJ...',
  'Criando subconta Asaas...',
  'Enviando e-mail de confirmação...',
]

export default function OnboardingPage() {
  const {
    state,
    goToStep,
    setDados,
    setCobranca,
    setPlano,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    canProceed,
  } = useOnboarding()

  const [loadingStepIdx, setLoadingStepIdx] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (state.status !== 'submitting') {
      setLoadingStepIdx(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1))
    }, 1500)
    return () => clearInterval(interval)
  }, [state.status])

  useEffect(() => {
    if (state.status === 'error' && state.errorMsg) {
      console.error('[onboarding] submit error:', state.errorMsg)
      toast(state.errorMsg, 'error')
    }
  }, [state.status, state.errorMsg, toast])

  function handleNext() {
    if (canProceed(state.step)) {
      goToStep((state.step + 1) as 1 | 2 | 3 | 4)
    }
  }

  function handleBack() {
    if (state.step > 1) {
      goToStep((state.step - 1) as 1 | 2 | 3 | 4)
    }
  }

  const activeLoadingSteps = LOADING_STEPS.slice(0, loadingStepIdx + 1)
  const isSubmittingOrSuccess = state.status === 'submitting' || state.status === 'success'

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border)] px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--color-primary)' }}
          >
            IX
          </div>
          <span className="font-semibold text-[var(--color-text)]">Education X</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {!isSubmittingOrSuccess ? (
            <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
              {/* Stepper vertical sticky (desktop) */}
              <aside className="hidden lg:block">
                <div className="sticky top-8">
                  <Stepper steps={STEPS} current={state.step} orientation="vertical" />
                </div>
              </aside>

              {/* Stepper horizontal (mobile) */}
              <div className="mb-6 lg:hidden">
                <Stepper steps={STEPS} current={state.step} orientation="horizontal" />
              </div>

              {/* Conteúdo do passo — max-width contido */}
              <div className="min-w-0 max-w-2xl">
                {state.step === 1 && (
                  <StepDados dados={state.dados} onChange={setDados} />
                )}

                {state.step === 2 && (
                  <StepFinanceiro
                    cobranca={state.cobranca}
                    plano={state.plano}
                    onCobrancaChange={setCobranca}
                    onPlanoChange={setPlano}
                  />
                )}

                {state.step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <p className="label">PASSO 3 DE 4</p>
                      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Matérias</h1>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                      <div className="label mb-4">MATÉRIAS</div>
                      <StepDocumentos
                        subjects={state.subjects}
                        onAddSubject={addSubject}
                        onRemoveSubject={removeSubject}
                        onUpdateSubject={updateSubject}
                      />
                    </div>
                  </div>
                )}

                {state.step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <p className="label">PASSO 4 DE 4</p>
                      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Revisão e envio</h1>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                      <div className="label mb-4">REVISÃO</div>
                      <StepRevisao
                        state={state}
                        onEditStep={(s) => goToStep(s)}
                        onSubmit={submit}
                        loadingSteps={activeLoadingSteps}
                      />
                    </div>
                  </div>
                )}

                {/* Nav desktop */}
                <div className="mt-6 hidden lg:flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={state.step === 1}
                    className="px-4 py-2 text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    ← Voltar
                  </button>

                  {state.step < 4 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceed(state.step)}
                      className="rounded-md px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Próximo →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Estado de submitting/success — centralizado */
            <div className="flex justify-center">
              <div className="w-full max-w-2xl bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
                <StepRevisao
                  state={state}
                  onEditStep={(s) => goToStep(s)}
                  onSubmit={submit}
                  loadingSteps={activeLoadingSteps}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Nav mobile sticky */}
      {!isSubmittingOrSuccess && (
        <div className="sticky bottom-0 bg-white border-t border-[var(--color-border)] px-4 py-3 flex justify-between lg:hidden">
          <button
            type="button"
            onClick={handleBack}
            disabled={state.step === 1}
            className="px-4 py-2 text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            ← Voltar
          </button>

          {state.step < 4 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed(state.step)}
              className="rounded-md px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
            >
              Próximo →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

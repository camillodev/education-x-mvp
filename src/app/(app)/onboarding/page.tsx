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

  // Ao trocar de passo, volta ao topo — senão o usuário fica no fim da página
  // anterior e parece que a etapa "começou do final".
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

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
    <div className="flex flex-col">
      {/* Cabeçalho do fluxo: título + stepper horizontal no topo.
          A navegação principal (sidebar) vem do AdminShell — aqui só o progresso. */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
          Onboarding de escola
        </p>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Nova escola</h1>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl">
          {!isSubmittingOrSuccess ? (
            <div className="flex flex-col">
              {/* Stepper horizontal no topo (desktop e mobile) — a sidebar ocupa a lateral */}
              <div className="mb-8 border-b border-[var(--color-border)] pb-6">
                <Stepper steps={STEPS} current={state.step} orientation="horizontal" />
              </div>

              {/* Conteúdo do passo */}
              <div className="min-w-0">
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

                {/* Navegação do wizard */}
                <div className="mt-6 flex justify-between">
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
    </div>
  )
}

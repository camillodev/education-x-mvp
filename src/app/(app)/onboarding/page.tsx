'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { Stepper } from '@/components/patterns/Stepper'
import { StepDados } from '@/components/onboarding/StepDados'
import { StepFinanceiro } from '@/components/onboarding/StepFinanceiro'
import { StepDocumentos } from '@/components/onboarding/StepDocumentos'
import { StepRevisao } from '@/components/onboarding/StepRevisao'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/Card'

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
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">
          Onboarding de escola
        </p>
        <h1 className="text-2xl font-bold text-(--color-text)">Nova escola</h1>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl">
          {!isSubmittingOrSuccess ? (
            <div className="flex flex-col">
              <div className="mb-8 border-b border-(--color-border) pb-6">
                <Stepper steps={STEPS} current={state.step} orientation="horizontal" />
              </div>

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
                      <h1 className="text-2xl font-semibold text-(--color-text)">Matérias</h1>
                    </div>
                    <Card className="p-6">
                      <div className="label mb-4">MATÉRIAS</div>
                      <StepDocumentos
                        subjects={state.subjects}
                        onAddSubject={addSubject}
                        onRemoveSubject={removeSubject}
                        onUpdateSubject={updateSubject}
                      />
                    </Card>
                  </div>
                )}

                {state.step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <p className="label">PASSO 4 DE 4</p>
                      <h1 className="text-2xl font-semibold text-(--color-text)">Revisão e envio</h1>
                    </div>
                    <Card className="p-6">
                      <div className="label mb-4">REVISÃO</div>
                      <StepRevisao
                        state={state}
                        onEditStep={(s) => goToStep(s)}
                        onSubmit={submit}
                        loadingSteps={activeLoadingSteps}
                      />
                    </Card>
                  </div>
                )}

                {/* Navegação do wizard */}
                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={handleBack}
                    disabled={state.step === 1}
                    iconLeft="arrow-left"
                  >
                    Voltar
                  </Button>

                  {state.step < 4 && (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      disabled={!canProceed(state.step)}
                      iconRight="arrow-right"
                    >
                      Próximo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Card className="w-full max-w-2xl p-6">
                <StepRevisao
                  state={state}
                  onEditStep={(s) => goToStep(s)}
                  onSubmit={submit}
                  loadingSteps={activeLoadingSteps}
                />
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

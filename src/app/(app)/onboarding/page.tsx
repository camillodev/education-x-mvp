'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { Stepper } from '@/components/patterns/Stepper'
import { StepDados } from '@/components/onboarding/StepDados'
import { StepCobranca } from '@/components/onboarding/StepCobranca'
import { StepDocumentos } from '@/components/onboarding/StepDocumentos'
import { StepRevisao } from '@/components/onboarding/StepRevisao'

const STEPS = [
  { label: 'Dados da escola' },
  { label: 'Cobrança' },
  { label: 'Matérias' },
  { label: 'Revisão' },
]

const LOADING_STEPS = [
  'Validando CNPJ...',
  'Criando subconta Asaas...',
  'Aplicando configurações...',
]

export default function OnboardingPage() {
  const {
    state,
    goToStep,
    setDados,
    setCobranca,
    addSubject,
    removeSubject,
    updateSubject,
    setTermsAccepted,
    setTermsVersionId,
    submit,
    canProceed,
  } = useOnboarding()

  const [loadingStepIdx, setLoadingStepIdx] = useState(0)

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
    // Fetch and set the active termsVersionId on mount
    fetch('/api/terms/active')
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setTermsVersionId(data.id)
      })
      .catch(() => {
        // termsVersionId stays empty; submit will be blocked until set
      })
  }, [setTermsVersionId])

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--color-primary)' }}
          >
            IX
          </div>
          <span className="font-semibold text-gray-800">Education X</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Stepper — oculto durante submitting/success */}
          {state.status !== 'submitting' && state.status !== 'success' && (
            <div className="mb-8">
              <Stepper steps={STEPS} current={state.step} />
            </div>
          )}

          {/* Card de passo */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {state.step === 1 && (
              <StepDados dados={state.dados} onChange={setDados} />
            )}

            {state.step === 2 && (
              <StepCobranca cobranca={state.cobranca} onChange={setCobranca} />
            )}

            {state.step === 3 && (
              <StepDocumentos
                subjects={state.subjects}
                onAddSubject={addSubject}
                onRemoveSubject={removeSubject}
                onUpdateSubject={updateSubject}
              />
            )}

            {state.step === 4 && (
              <StepRevisao
                state={state}
                onEditStep={(s) => goToStep(s)}
                onAcceptTerms={setTermsAccepted}
                onSubmit={submit}
                loadingSteps={activeLoadingSteps}
              />
            )}
          </div>

          {/* Navegação — oculta no passo 4 (StepRevisao tem seu próprio botão) */}
          {state.step < 4 && state.status !== 'submitting' && (
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={state.step === 1}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed(state.step)}
                className="rounded-md px-6 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)' }}
              >
                Próximo →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

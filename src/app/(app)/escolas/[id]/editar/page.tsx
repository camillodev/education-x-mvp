'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useEditEscola } from '@/hooks/use-edit-escola'
import { Stepper } from '@/components/patterns/Stepper'
import { StepDados } from '@/components/onboarding/StepDados'
import { StepFinanceiro } from '@/components/onboarding/StepFinanceiro'
import { StepDocumentos } from '@/components/onboarding/StepDocumentos'
import { StepRevisao } from '@/components/onboarding/StepRevisao'
import { useToast } from '@/components/ui/toast'
import type { SubjectInput, SubjectUpdateInput } from '@/lib/validations/unit'

const STEPS = [
  { label: 'Dados da escola', description: 'Identidade, endereço e responsável' },
  { label: 'Financeiro', description: 'Cobrança e plano da escola' },
  { label: 'Matérias', description: 'Disciplinas oferecidas pela escola' },
  { label: 'Revisão', description: 'Confirme os dados e salve' },
]

const LOADING_STEPS = [
  'Validando dados...',
  'Atualizando escola...',
  'Pronto!',
]

export default function EditarEscolaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const unitId = params.id

  const {
    state,
    loading,
    goToStep,
    setDados,
    setCobranca,
    setPlano,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    autoSave,
    canProceed,
  } = useEditEscola(unitId)

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
      console.error('[edit-escola] submit error:', state.errorMsg)
      toast(state.errorMsg, 'error')
    }
  }, [state.status, state.errorMsg, toast])

  useEffect(() => {
    if (state.status === 'success') {
      router.push('/escolas')
    }
  }, [state.status, router])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

  function handleNext() {
    void autoSave()
    goToStep((state.step + 1) as 1 | 2 | 3 | 4)
  }

  function handleBack() {
    if (state.step > 1) {
      void autoSave()
      goToStep((state.step - 1) as 1 | 2 | 3 | 4)
    }
  }

  function handleStepClick(step: number) {
    void autoSave()
    goToStep(step as 1 | 2 | 3 | 4)
  }

  const activeLoadingSteps = LOADING_STEPS.slice(0, loadingStepIdx + 1)
  const isSubmittingOrSuccess = state.status === 'submitting' || state.status === 'success'

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">Editar escola</p>
          <div className="mt-1 h-8 w-48 animate-pulse rounded bg-(--color-surface)" />
        </div>
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-(--color-surface)" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">
          Editar escola
        </p>
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold text-(--color-text)">{state.dados.name || 'Escola'}</h1>
          {state.lastSavedAt && (
            <span className="text-xs text-(--color-text-subtle)">
              Salvo às {state.lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl">
          {!isSubmittingOrSuccess ? (
            <div className="flex flex-col">
              <div className="mb-8 border-b border-[var(--color-border)] pb-6">
                <Stepper steps={STEPS} current={state.step} orientation="horizontal" onStepClick={handleStepClick} />
              </div>

              <div className="min-w-0">
                {state.step === 1 && (
                  <StepDados
                    dados={state.dados}
                    onChange={setDados}
                    readOnly={{ cnpj: true }}
                  />
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
                        subjects={state.subjects as SubjectInput[]}
                        onAddSubject={(s: SubjectInput) => addSubject({ ...s, isActive: true } as SubjectUpdateInput)}
                        onRemoveSubject={removeSubject}
                        onUpdateSubject={(i: number, s: Partial<SubjectInput>) => updateSubject(i, s)}
                      />
                    </div>
                  </div>
                )}

                {state.step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <p className="label">PASSO 4 DE 4</p>
                      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Revisão e salvamento</h1>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
                      <div className="label mb-4">REVISÃO</div>
                      <StepRevisao
                        state={{ ...state, subjects: state.subjects as SubjectInput[] }}
                        onEditStep={(s) => goToStep(s)}
                        onSubmit={submit}
                        loadingSteps={activeLoadingSteps}
                        submitLabel="Salvar alterações"
                      />
                    </div>
                  </div>
                )}

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
                      className="rounded-md px-6 py-2 text-sm font-semibold text-white transition-opacity"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Próximo →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
                <StepRevisao
                  state={{ ...state, subjects: state.subjects as SubjectInput[] }}
                  onEditStep={(s) => goToStep(s)}
                  onSubmit={submit}
                  loadingSteps={activeLoadingSteps}
                  submitLabel="Salvar alterações"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

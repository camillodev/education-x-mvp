'use client'

import { useActionState, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import { economyPercent, type EnrollmentPlanValue } from '@/lib/validations/plan'
import { submitPlanStepAction, type PlanStepFormState } from './actions'

export interface PlanCardData {
  plan: EnrollmentPlanValue
  totalCents: number
}

const PLAN_LABELS: Record<EnrollmentPlanValue, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
}

interface Props {
  token: string
  cards: PlanCardData[]
  monthlyTotalCents: number
  studentCount: number
  subjectSelectionCount: number
}

const INITIAL_STATE: PlanStepFormState = {}

export function PlanForm({ token, cards, monthlyTotalCents, studentCount, subjectSelectionCount }: Props) {
  const action = submitPlanStepAction.bind(null, token)
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const [selected, setSelected] = useState<EnrollmentPlanValue | null>(null)

  const selectedCard = cards.find((c) => c.plan === selected)

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">Escolha o plano</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 3 de 4</p>

      <form action={formAction} className="mt-5 flex flex-col gap-3">
        <input type="hidden" name="plan" value={selected ?? ''} />

        {cards.map((card) => {
          const economy = card.plan === 'MONTHLY' ? 0 : economyPercent(monthlyTotalCents, card.totalCents)
          const isSelected = selected === card.plan
          return (
            <button
              key={card.plan}
              type="button"
              onClick={() => setSelected(card.plan)}
              className={`flex items-center justify-between rounded-(--radius-lg) border-[1.5px] px-4 py-3 text-left transition-colors ${
                isSelected
                  ? 'border-(--color-primary) bg-(--color-primary-softer)'
                  : 'border-(--color-border-input) hover:border-(--color-primary)'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-(--color-text)">{PLAN_LABELS[card.plan]}</p>
                {economy > 0 && (
                  <p className="text-xs text-(--color-primary)">Economize {economy}% vs. mensal</p>
                )}
              </div>
              <p className="text-base font-bold text-(--color-text)">
                {formatBRL(card.totalCents)}
                <span className="text-xs font-normal text-(--color-text-subtle)"> /mês</span>
              </p>
            </button>
          )
        })}

        <div className="mt-2 rounded-(--radius-lg) bg-(--color-bg) p-3 text-center text-sm text-(--color-text-subtle)">
          {studentCount} aluno{studentCount !== 1 ? 's' : ''} × {subjectSelectionCount} matéria
          {subjectSelectionCount !== 1 ? 's' : ''} = {selectedCard ? formatBRL(selectedCard.totalCents) : '—'} /mês
        </div>

        {state.error && <p className="text-sm text-(--color-danger)">{state.error}</p>}

        <Button type="submit" size="lg" disabled={pending || !selected} className="mt-2 w-full">
          {pending ? 'Salvando…' : 'Continuar'}
        </Button>
      </form>
    </Card>
  )
}

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepFinancial } from '@/components/onboarding/StepFinancial'
import type { BillingState, PlanState } from '@/hooks/use-onboarding'

const billing: BillingState = {
  dueDay: 10,
  closingDay: 5,
  lateFeePercent: 200,
  monthlyInterestBp: 100,
  cardFeePayer: 'ESCOLA',
  negativacaoFeePayer: 'ESCOLA',
  municipalRegistration: '',
}
const plan: PlanState = {
  planId: 'basico',
  isBeta: false,
  discountEnabled: false,
  discountType: 'PERCENT',
  discountValue: '',
}

function renderStep(dueDayLocked?: boolean) {
  render(
    <StepFinancial
      cobranca={billing}
      plano={plan}
      onCobrancaChange={() => {}}
      onPlanoChange={() => {}}
      dueDayLocked={dueDayLocked}
    />
  )
}

describe('StepFinancial dueDay', () => {
  it('is editable while the school is being created', () => {
    renderStep()
    expect(screen.getByLabelText(/dia de vencimento do boleto/i)).toBeEnabled()
  })

  it('is read-only once the school exists, with the reason shown', () => {
    renderStep(true)
    expect(screen.getByLabelText(/dia de vencimento do boleto/i)).toHaveAttribute('readonly')
    expect(screen.getByText(/não pode ser alterado/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepRevisao } from '@/components/onboarding/StepRevisao'
import type { OnboardingState } from '@/hooks/use-onboarding'

const baseState: OnboardingState = {
  step: 4,
  dados: {
    name: 'Kumon Camargos',
    cnpj: '12345678000195',
    email: 'contato@escola.com',
    phone: '31999990000',
    cep: '30130000',
    address: 'Rua das Flores, 123',
    complement: '',
    city: 'Belo Horizonte',
    state: 'MG',
    isFranchise: false,
    franchiseParent: '',
  },
  cobranca: {
    dueDay: 10,
    closingDay: 5,
    lateFeePercent: 200,
    monthlyInterestBp: 100,
    enablesSpc: false,
    autoBilling: true,
    acceptsCard: false,
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '12345',
  },
  subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000 }],
  termsAccepted: false,
  termsVersionId: 'clxxxxxxxxxxxxxxxxxx',
  status: 'idle',
}

function renderRevisao(state: Partial<OnboardingState> = {}) {
  const merged = { ...baseState, ...state }
  const onEditStep = vi.fn()
  const onAcceptTerms = vi.fn()
  const onSubmit = vi.fn()

  render(
    <StepRevisao
      state={merged}
      onEditStep={onEditStep}
      onAcceptTerms={onAcceptTerms}
      onSubmit={onSubmit}
    />
  )

  return { onEditStep, onAcceptTerms, onSubmit }
}

describe('StepRevisao', () => {
  it('submit button is disabled when terms not accepted', () => {
    renderRevisao({ termsAccepted: false })
    const btn = screen.getByRole('button', { name: /criar escola/i })
    expect(btn).toBeDisabled()
  })

  it('submit button is enabled when terms accepted', () => {
    renderRevisao({ termsAccepted: true })
    const btn = screen.getByRole('button', { name: /criar escola/i })
    expect(btn).not.toBeDisabled()
  })

  it('clicking submit calls onSubmit when terms accepted', () => {
    const { onSubmit } = renderRevisao({ termsAccepted: true })
    fireEvent.click(screen.getByRole('button', { name: /criar escola/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('clicking "Editar" on dados block calls onEditStep(1)', () => {
    const { onEditStep } = renderRevisao()
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    fireEvent.click(editButtons[0])
    expect(onEditStep).toHaveBeenCalledWith(1)
  })

  it('shows subject name and price in the review list', () => {
    renderRevisao()
    expect(screen.getByText('Matemática')).toBeInTheDocument()
    // Price formatted as BRL (may include NBSP)
    expect(screen.getByText(/350/)).toBeInTheDocument()
  })

  it('shows success screen when status is success', () => {
    renderRevisao({ status: 'success' })
    expect(screen.getByText(/escola criada com sucesso/i)).toBeInTheDocument()
  })

  it('shows error message when errorMsg is set', () => {
    renderRevisao({ status: 'error', errorMsg: 'CNPJ já cadastrado' })
    expect(screen.getByText('CNPJ já cadastrado')).toBeInTheDocument()
  })
})

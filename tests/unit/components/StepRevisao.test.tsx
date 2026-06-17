import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepRevisao } from '@/components/onboarding/StepRevisao'
import type { OnboardingState } from '@/hooks/use-onboarding'

const baseState: OnboardingState = {
  step: 4,
  dados: {
    name: 'Kumon Camargos',
    cnpj: '11222333000181',
    legalName: 'Kumon Camargos LTDA',
    tradeName: 'Kumon Camargos',
    cnpjStatus: 'ATIVA',
    email: 'contato@escola.com',
    phone: '31999990000',
    cep: '30130000',
    address: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    complement: '',
    city: 'Belo Horizonte',
    state: 'MG',
    isFranchise: false,
    franchiseParent: '',
    responsibleName: 'Maria Pimenta',
    responsibleCpf: '11144477735',
    responsibleEmail: 'maria@escola.com',
    responsiblePhone: '31988887777',
  },
  cobranca: {
    dueDay: 10,
    closingDay: 25,
    lateFeePercent: 200,
    monthlyInterestBp: 100,
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '12345',
  },
  plano: {
    planId: 'basico',
    isBeta: false,
    discountEnabled: false,
    discountType: 'PERCENT',
    discountValue: '',
  },
  subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000 }],
  status: 'idle',
}

function renderRevisao(state: Partial<OnboardingState> = {}) {
  const merged = { ...baseState, ...state }
  const onEditStep = vi.fn()
  const onSubmit = vi.fn()

  render(<StepRevisao state={merged} onEditStep={onEditStep} onSubmit={onSubmit} />)

  return { onEditStep, onSubmit }
}

describe('StepRevisao', () => {
  it('submit button enabled (aceite é via link depois, não aqui)', () => {
    renderRevisao()
    const btn = screen.getByRole('button', { name: /cadastrar e enviar/i })
    expect(btn).not.toBeDisabled()
  })

  it('clicking submit calls onSubmit', () => {
    const { onSubmit } = renderRevisao()
    fireEvent.click(screen.getByRole('button', { name: /cadastrar e enviar/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('clicking "Editar" on dados block calls onEditStep(1)', () => {
    const { onEditStep } = renderRevisao()
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    fireEvent.click(editButtons[0])
    expect(onEditStep).toHaveBeenCalledWith(1)
  })

  it('mostra o responsável na revisão', () => {
    renderRevisao()
    expect(screen.getByText(/Maria Pimenta/)).toBeInTheDocument()
    expect(screen.getByText(/maria@escola\.com/)).toBeInTheDocument()
  })

  it('shows subject name and price in the review list', () => {
    renderRevisao()
    expect(screen.getByText('Matemática')).toBeInTheDocument()
    expect(screen.getByText(/350/)).toBeInTheDocument()
  })

  it('success screen mentions e-mail de confirmação enviado', () => {
    renderRevisao({ status: 'success' })
    expect(screen.getByText(/escola cadastrada/i)).toBeInTheDocument()
    expect(screen.getByText(/link de confirmação/i)).toBeInTheDocument()
  })

  it('shows error message when errorMsg is set', () => {
    renderRevisao({ status: 'error', errorMsg: 'CNPJ já cadastrado' })
    expect(screen.getByText('CNPJ já cadastrado')).toBeInTheDocument()
  })
})

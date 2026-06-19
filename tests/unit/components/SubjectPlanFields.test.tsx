import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubjectPlanFields } from '@/components/onboarding/SubjectPlanFields'
import type { SubjectInput } from '@/lib/validations/unit'

const subject: SubjectInput = {
  name: 'Matemática',
  nfseServiceCode: '8.01',
  priceCents: 45000, // R$ 450 mensal (base)
  quarterlyPriceCents: 43000, // -4%
  semiannualPriceCents: 40000, // -11%
  annualPriceCents: 38000, // -16% → melhor preço
}

describe('SubjectPlanFields', () => {
  it('mostra o badge "base" no plano mensal e desconto nos demais', () => {
    render(<SubjectPlanFields subject={subject} onChange={vi.fn()} />)
    expect(screen.getByText('base')).toBeInTheDocument()
    expect(screen.getByText('−4%')).toBeInTheDocument()
    expect(screen.getByText('−11%')).toBeInTheDocument()
    expect(screen.getByText('−16%')).toBeInTheDocument()
  })

  it('marca o plano de maior desconto como "Melhor preço"', () => {
    render(<SubjectPlanFields subject={subject} onChange={vi.fn()} />)
    // só um "Melhor preço" — o anual (maior desconto)
    expect(screen.getAllByText('Melhor preço')).toHaveLength(1)
  })

  it('exibe o card-resumo com a economia vs. mensal', () => {
    render(<SubjectPlanFields subject={subject} onChange={vi.fn()} />)
    // economia = 45000 - 38000 = 7000 cents = R$ 70,00/mês
    expect(screen.getByText(/Economia de/)).toHaveTextContent('R$ 70,00')
    expect(screen.getByText(/Plano mais econômico/)).toHaveTextContent('Anual')
  })

  it('não mostra desconto quando só o mensal está preenchido', () => {
    const onlyMonthly: SubjectInput = {
      name: 'X',
      nfseServiceCode: '8.01',
      priceCents: 45000,
      annualPriceCents: 45000, // igual ao mensal → 0%
    }
    render(<SubjectPlanFields subject={onlyMonthly} onChange={vi.fn()} />)
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument()
    expect(screen.queryByText('Melhor preço')).not.toBeInTheDocument()
  })

  it('propaga a mudança de valor pelo onChange', () => {
    const onChange = vi.fn()
    render(<SubjectPlanFields subject={subject} onChange={onChange} />)
    const mensal = screen.getByLabelText('Valor mensal do plano Mensal')
    fireEvent.change(mensal, { target: { value: '500,00' } })
    expect(onChange).toHaveBeenCalledWith({ priceCents: 50000 })
  })
})

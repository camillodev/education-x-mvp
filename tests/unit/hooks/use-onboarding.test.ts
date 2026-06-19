import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnboarding, canProceedFromStep } from '@/hooks/use-onboarding'

// ─── canProceedFromStep (pure logic, no mocks needed) ────────────────────────

const baseState = {
  step: 1 as const,
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
    cardFeePayer: 'RESPONSAVEL' as const,
    negativacaoFeePayer: 'RESPONSAVEL' as const,
    municipalRegistration: '12345',
  },
  plano: {
    planId: 'basico' as const,
    isBeta: false,
    discountEnabled: false,
    discountType: 'PERCENT' as const,
    discountValue: '',
  },
  subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000, annualPriceCents: 30000 }],
  status: 'idle' as const,
}

describe('canProceedFromStep', () => {
  it('step 1 valid when all dados filled', () => {
    expect(canProceedFromStep(baseState, 1)).toBe(true)
  })

  it('step 1 invalid when name too short', () => {
    const state = { ...baseState, dados: { ...baseState.dados, name: 'A' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when cnpj not 14 digits', () => {
    const state = { ...baseState, dados: { ...baseState.dados, cnpj: '1234' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when cnpj has 14 digits but invalid check digit', () => {
    const state = { ...baseState, dados: { ...baseState.dados, cnpj: '11222333000199' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when phone DDD is invalid', () => {
    const state = { ...baseState, dados: { ...baseState.dados, phone: '20999990000' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when number is missing', () => {
    const state = { ...baseState, dados: { ...baseState.dados, number: '' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when neighborhood is missing', () => {
    const state = { ...baseState, dados: { ...baseState.dados, neighborhood: '' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 2 valid when billing configured', () => {
    expect(canProceedFromStep(baseState, 2)).toBe(true)
  })

  it('step 2 invalid when dueDay out of range', () => {
    const state = { ...baseState, cobranca: { ...baseState.cobranca, dueDay: 30 } }
    expect(canProceedFromStep(state, 2)).toBe(false)
  })

  it('step 2 invalid when municipalRegistration empty', () => {
    const state = { ...baseState, cobranca: { ...baseState.cobranca, municipalRegistration: '' } }
    expect(canProceedFromStep(state, 2)).toBe(false)
  })

  it('step 2 (financeiro) valid by default — planId e cobrança têm defaults', () => {
    expect(canProceedFromStep(baseState, 2)).toBe(true)
  })

  it('step 2 (financeiro) invalid quando desconto ligado sem valor', () => {
    const state = {
      ...baseState,
      plano: { ...baseState.plano, discountEnabled: true, discountValue: '' },
    }
    expect(canProceedFromStep(state, 2)).toBe(false)
  })

  it('step 2 (financeiro) valid com desconto percentual válido', () => {
    const state = {
      ...baseState,
      plano: { ...baseState.plano, discountEnabled: true, discountType: 'PERCENT' as const, discountValue: '10' },
    }
    expect(canProceedFromStep(state, 2)).toBe(true)
  })

  it('step 2 (financeiro) invalid quando desconto >= preço (100%)', () => {
    const state = {
      ...baseState,
      plano: { ...baseState.plano, discountEnabled: true, discountType: 'PERCENT' as const, discountValue: '100' },
    }
    expect(canProceedFromStep(state, 2)).toBe(false)
  })

  it('step 3 valid when at least one subject', () => {
    expect(canProceedFromStep(baseState, 3)).toBe(true)
  })

  it('step 3 invalid when no subjects', () => {
    const state = { ...baseState, subjects: [] }
    expect(canProceedFromStep(state, 3)).toBe(false)
  })

  it('step 1 invalid when responsible CPF is invalid', () => {
    const state = { ...baseState, dados: { ...baseState.dados, responsibleCpf: '11144477700' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })

  it('step 1 invalid when responsible email is invalid', () => {
    const state = { ...baseState, dados: { ...baseState.dados, responsibleEmail: 'x' } }
    expect(canProceedFromStep(state, 1)).toBe(false)
  })
})

// ─── useOnboarding hook (submit flow) ────────────────────────────────────────

describe('useOnboarding submit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('status becomes success on 201', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'unit_123' }),
    }))

    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.setDados(baseState.dados)
      result.current.setCobranca(baseState.cobranca)
    })
    act(() => {
      result.current.addSubject(baseState.subjects[0])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('success')
    expect(result.current.state.createdUnitId).toBe('unit_123')
  })

  it('errorMsg de 409 usa a mensagem (pt-BR) do backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'CNPJ já cadastrado.', code: 'DUPLICATE_CNPJ' }),
    }))

    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.setDados(baseState.dados)
      result.current.setCobranca(baseState.cobranca)
    })
    act(() => {
      result.current.addSubject(baseState.subjects[0])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.state.errorMsg).toMatch(/CNPJ já cadastrado/i)
  })

  it('errorMsg de 502 é user-friendly e NÃO vaza "Asaas"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ code: 'ASAAS_PROVISION' }),
    }))

    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.setDados(baseState.dados)
      result.current.setCobranca(baseState.cobranca)
    })
    act(() => {
      result.current.addSubject(baseState.subjects[0])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.state.errorMsg).not.toContain('Asaas')
    expect(result.current.state.errorMsg).toMatch(/pagamento|provision/i)
  })
})

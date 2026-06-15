import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnboarding, canProceedFromStep } from '@/hooks/use-onboarding'

// ─── canProceedFromStep (pure logic, no mocks needed) ────────────────────────

const baseState = {
  step: 1 as const,
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
    cardFeePayer: 'RESPONSAVEL' as const,
    negativacaoFeePayer: 'RESPONSAVEL' as const,
    municipalRegistration: '12345',
  },
  subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 35000 }],
  termsAccepted: true,
  termsVersionId: 'clxxxxxxxxxxxxxxxxxx',
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

  it('step 3 valid when at least one subject', () => {
    expect(canProceedFromStep(baseState, 3)).toBe(true)
  })

  it('step 3 invalid when no subjects', () => {
    const state = { ...baseState, subjects: [] }
    expect(canProceedFromStep(state, 3)).toBe(false)
  })

  it('step 4 valid when terms accepted and version set', () => {
    expect(canProceedFromStep(baseState, 4)).toBe(true)
  })

  it('step 4 invalid when terms not accepted', () => {
    const state = { ...baseState, termsAccepted: false }
    expect(canProceedFromStep(state, 4)).toBe(false)
  })

  it('step 4 invalid when termsVersionId empty', () => {
    const state = { ...baseState, termsVersionId: '' }
    expect(canProceedFromStep(state, 4)).toBe(false)
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
    act(() => {
      result.current.setTermsAccepted(true)
      result.current.setTermsVersionId('clxxxxxxxxxxxxxxxxxx')
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('success')
    expect(result.current.state.createdUnitId).toBe('unit_123')
  })

  it('errorMsg is "CNPJ já cadastrado" on 409', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'CNPJ already exists' }),
    }))

    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.setDados(baseState.dados)
      result.current.setCobranca(baseState.cobranca)
    })
    act(() => {
      result.current.addSubject(baseState.subjects[0])
    })
    act(() => {
      result.current.setTermsAccepted(true)
      result.current.setTermsVersionId('clxxxxxxxxxxxxxxxxxx')
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.state.errorMsg).toBe('CNPJ já cadastrado')
  })

  it('errorMsg on 502 (Asaas failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
    }))

    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.setDados(baseState.dados)
      result.current.setCobranca(baseState.cobranca)
    })
    act(() => {
      result.current.addSubject(baseState.subjects[0])
    })
    act(() => {
      result.current.setTermsAccepted(true)
      result.current.setTermsVersionId('clxxxxxxxxxxxxxxxxxx')
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.state.errorMsg).toContain('Asaas')
  })
})

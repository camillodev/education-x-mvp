'use client'

import { useReducer, useCallback } from 'react'
import type { CreateSchoolInput, SubjectInput } from '@/lib/validations/unit'

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface DadosState {
  name: string
  cnpj: string
  email: string
  phone: string
  cep: string
  address: string
  complement: string
  city: string
  state: string
  isFranchise: boolean
  franchiseParent: string
}

export interface CobrancaState {
  dueDay: number
  closingDay: number
  lateFeePercent: number // basis points
  monthlyInterestBp: number // basis points
  enablesSpc: boolean
  autoBilling: boolean
  acceptsCard: boolean
  cardFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  negativacaoFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  municipalRegistration: string
}

export interface OnboardingState {
  step: 1 | 2 | 3 | 4
  dados: DadosState
  cobranca: CobrancaState
  subjects: SubjectInput[]
  termsAccepted: boolean
  termsVersionId: string
  status: 'idle' | 'submitting' | 'success' | 'error'
  errorMsg?: string
  createdUnitId?: string
}

const initialState: OnboardingState = {
  step: 1,
  dados: {
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    cep: '',
    address: '',
    complement: '',
    city: '',
    state: '',
    isFranchise: false,
    franchiseParent: '',
  },
  cobranca: {
    dueDay: 10,
    closingDay: 5,
    lateFeePercent: 200, // 2%
    monthlyInterestBp: 100, // 1% a.m.
    enablesSpc: false,
    autoBilling: true,
    acceptsCard: false,
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '',
  },
  subjects: [],
  termsAccepted: false,
  termsVersionId: '',
  status: 'idle',
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'SET_DADOS'; dados: Partial<DadosState> }
  | { type: 'SET_COBRANCA'; cobranca: Partial<CobrancaState> }
  | { type: 'ADD_SUBJECT'; subject: SubjectInput }
  | { type: 'REMOVE_SUBJECT'; index: number }
  | { type: 'UPDATE_SUBJECT'; index: number; subject: Partial<SubjectInput> }
  | { type: 'SET_TERMS_ACCEPTED'; accepted: boolean }
  | { type: 'SET_TERMS_VERSION_ID'; id: string }
  | { type: 'SET_STATUS'; status: OnboardingState['status']; errorMsg?: string }
  | { type: 'SET_CREATED_UNIT'; unitId: string }
  | { type: 'RESET' }

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_DADOS':
      return { ...state, dados: { ...state.dados, ...action.dados } }
    case 'SET_COBRANCA':
      return { ...state, cobranca: { ...state.cobranca, ...action.cobranca } }
    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.subject] }
    case 'REMOVE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.filter((_, i) => i !== action.index),
      }
    case 'UPDATE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.map((s, i) =>
          i === action.index ? { ...s, ...action.subject } : s
        ),
      }
    case 'SET_TERMS_ACCEPTED':
      return { ...state, termsAccepted: action.accepted }
    case 'SET_TERMS_VERSION_ID':
      return { ...state, termsVersionId: action.id }
    case 'SET_STATUS':
      return { ...state, status: action.status, errorMsg: action.errorMsg }
    case 'SET_CREATED_UNIT':
      return { ...state, createdUnitId: action.unitId }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ─── Validação por passo ──────────────────────────────────────────────────────

export function canProceedFromStep(state: OnboardingState, step: number): boolean {
  switch (step) {
    case 1: {
      const d = state.dados
      return (
        d.name.length >= 2 &&
        /^\d{14}$/.test(d.cnpj) &&
        d.email.includes('@') &&
        d.phone.length >= 10 &&
        d.cep.length === 8 &&
        d.address.length >= 5 &&
        d.city.length >= 2 &&
        d.state.length === 2
      )
    }
    case 2: {
      const b = state.cobranca
      return (
        b.dueDay >= 1 &&
        b.dueDay <= 28 &&
        b.closingDay >= 1 &&
        b.closingDay <= 28 &&
        b.municipalRegistration.length >= 1
      )
    }
    case 3:
      return state.subjects.length >= 1
    case 4:
      return state.termsAccepted && state.termsVersionId.length > 0
    default:
      return false
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useOnboarding() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    dispatch({ type: 'SET_STEP', step })
  }, [])

  const setDados = useCallback((dados: Partial<DadosState>) => {
    dispatch({ type: 'SET_DADOS', dados })
  }, [])

  const setCobranca = useCallback((cobranca: Partial<CobrancaState>) => {
    dispatch({ type: 'SET_COBRANCA', cobranca })
  }, [])

  const addSubject = useCallback((subject: SubjectInput) => {
    dispatch({ type: 'ADD_SUBJECT', subject })
  }, [])

  const removeSubject = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_SUBJECT', index })
  }, [])

  const updateSubject = useCallback((index: number, subject: Partial<SubjectInput>) => {
    dispatch({ type: 'UPDATE_SUBJECT', index, subject })
  }, [])

  const setTermsAccepted = useCallback((accepted: boolean) => {
    dispatch({ type: 'SET_TERMS_ACCEPTED', accepted })
  }, [])

  const setTermsVersionId = useCallback((id: string) => {
    dispatch({ type: 'SET_TERMS_VERSION_ID', id })
  }, [])

  const submit = useCallback(async () => {
    if (!canProceedFromStep(state, 4)) return

    dispatch({ type: 'SET_STATUS', status: 'submitting' })

    const payload: CreateSchoolInput = {
      name: state.dados.name,
      cnpj: state.dados.cnpj.replace(/\D/g, ''),
      email: state.dados.email,
      phone: state.dados.phone.replace(/\D/g, ''),
      cep: state.dados.cep.replace(/\D/g, ''),
      address: state.dados.address,
      complement: state.dados.complement || undefined,
      city: state.dados.city,
      state: state.dados.state,
      isFranchise: state.dados.isFranchise,
      franchiseParent: state.dados.franchiseParent || undefined,
      billing: {
        dueDay: state.cobranca.dueDay,
        closingDay: state.cobranca.closingDay,
        lateFeePercent: state.cobranca.lateFeePercent,
        monthlyInterestBp: state.cobranca.monthlyInterestBp,
        enablesSpc: state.cobranca.enablesSpc,
        autoBilling: state.cobranca.autoBilling,
        acceptsCard: state.cobranca.acceptsCard,
        cardFeePayer: state.cobranca.cardFeePayer,
        negativacaoFeePayer: state.cobranca.negativacaoFeePayer,
        municipalRegistration: state.cobranca.municipalRegistration,
      },
      subjects: state.subjects,
      termsVersionId: state.termsVersionId,
    }

    try {
      const res = await fetch('/api/setup/escola', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const unit = await res.json()
        dispatch({ type: 'SET_CREATED_UNIT', unitId: unit.id })
        dispatch({ type: 'SET_STATUS', status: 'success' })
        return
      }

      const err = await res.json().catch(() => ({}))

      if (res.status === 409) {
        dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: 'CNPJ já cadastrado' })
      } else if (res.status === 502) {
        dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: 'Falha ao criar subconta Asaas. Tente novamente.' })
      } else {
        dispatch({
          type: 'SET_STATUS',
          status: 'error',
          errorMsg: err?.error ?? 'Erro ao criar escola',
        })
      }
    } catch {
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: 'Erro de conexão. Tente novamente.' })
    }
  }, [state])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
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
    reset,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}

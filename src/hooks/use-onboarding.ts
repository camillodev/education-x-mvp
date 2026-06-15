'use client'

import { useReducer, useCallback } from 'react'
import type { CreateSchoolInput, SubjectInput } from '@/lib/validations/unit'
import { isValidCnpj, isValidCpf, isValidBrPhone } from '@/lib/validations/br-documents'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface DadosState {
  name: string
  cnpj: string
  email: string
  phone: string
  cep: string
  address: string
  number: string
  neighborhood: string
  complement: string
  city: string
  state: string
  isFranchise: boolean
  franchiseParent: string
  // Responsável da unidade (recebe o e-mail de aceite)
  responsibleName: string
  responsibleCpf: string
  responsibleEmail: string
  responsiblePhone: string
}

export interface CobrancaState {
  dueDay: number
  closingDay: number
  lateFeePercent: number // basis points
  monthlyInterestBp: number // basis points
  cardFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  negativacaoFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  municipalRegistration: string
}

export interface OnboardingState {
  step: 1 | 2 | 3 | 4
  dados: DadosState
  cobranca: CobrancaState
  subjects: SubjectInput[]
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
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    isFranchise: false,
    franchiseParent: '',
    responsibleName: '',
    responsibleCpf: '',
    responsibleEmail: '',
    responsiblePhone: '',
  },
  cobranca: {
    dueDay: 25,
    closingDay: 25,
    lateFeePercent: 200, // 2%
    monthlyInterestBp: 100, // 1% a.m.
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '',
  },
  subjects: [],
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
        isValidCnpj(d.cnpj) &&
        EMAIL_RE.test(d.email) &&
        isValidBrPhone(d.phone) &&
        d.cep.length === 8 &&
        d.address.length >= 5 &&
        d.number.length >= 1 &&
        d.neighborhood.length >= 2 &&
        d.city.length >= 2 &&
        d.state.length === 2 &&
        // Responsável
        d.responsibleName.length >= 3 &&
        isValidCpf(d.responsibleCpf) &&
        EMAIL_RE.test(d.responsibleEmail) &&
        isValidBrPhone(d.responsiblePhone)
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
      // Passo de revisão — eu (admin) só envio; a escola aceita depois via link.
      return true
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

  const submit = useCallback(async () => {
    if (!canProceedFromStep(state, 1) || !canProceedFromStep(state, 3)) return

    dispatch({ type: 'SET_STATUS', status: 'submitting' })

    const payload: CreateSchoolInput = {
      name: state.dados.name,
      cnpj: state.dados.cnpj.replace(/\D/g, ''),
      email: state.dados.email,
      phone: state.dados.phone.replace(/\D/g, ''),
      cep: state.dados.cep.replace(/\D/g, ''),
      address: state.dados.address,
      number: state.dados.number,
      neighborhood: state.dados.neighborhood,
      complement: state.dados.complement || undefined,
      city: state.dados.city,
      state: state.dados.state,
      isFranchise: state.dados.isFranchise,
      franchiseParent: state.dados.franchiseParent || undefined,
      responsibleName: state.dados.responsibleName,
      responsibleCpf: state.dados.responsibleCpf.replace(/\D/g, ''),
      responsibleEmail: state.dados.responsibleEmail,
      responsiblePhone: state.dados.responsiblePhone.replace(/\D/g, ''),
      billing: {
        dueDay: state.cobranca.dueDay,
        closingDay: state.cobranca.closingDay,
        lateFeePercent: state.cobranca.lateFeePercent,
        monthlyInterestBp: state.cobranca.monthlyInterestBp,
        cardFeePayer: state.cobranca.cardFeePayer,
        negativacaoFeePayer: state.cobranca.negativacaoFeePayer,
        municipalRegistration: state.cobranca.municipalRegistration,
      },
      subjects: state.subjects,
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
        dispatch({
          type: 'SET_STATUS',
          status: 'error',
          errorMsg: 'Falha ao criar subconta Asaas. Tente novamente.',
        })
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
    submit,
    reset,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}

'use client'

import { useReducer, useCallback } from 'react'
import type { CreateSchoolInput, SubjectInput } from '@/lib/validations/unit'
import { isValidCnpj, isValidCpf, isValidBrMobile } from '@/lib/validations/br-documents'
import { getPlan, type SchoolPlanId } from '@/lib/data/plans'
import { computeDiscountedCents, parsePtBrNumber, type DiscountType } from '@/lib/pricing'
import { mapSubmitError, type ApiErrorBody } from '@/lib/onboarding/submit-error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface DadosState {
  name: string
  cnpj: string
  legalName: string // razão social (BrasilAPI)
  tradeName: string // nome fantasia
  cnpjStatus: string // situação cadastral
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

export interface PlanoState {
  planId: SchoolPlanId
  isBeta: boolean
  discountEnabled: boolean
  discountType: DiscountType
  discountValue: string // raw input (pt-BR)
}

export type WizardStep = 1 | 2 | 3 | 4

export interface OnboardingState {
  step: WizardStep
  dados: DadosState
  cobranca: CobrancaState
  plano: PlanoState
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
    legalName: '',
    tradeName: '',
    cnpjStatus: '',
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
    dueDay: 10,
    closingDay: 25,
    lateFeePercent: 200, // 2%
    monthlyInterestBp: 100, // 1% a.m.
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '',
  },
  plano: {
    planId: 'basico',
    isBeta: false,
    discountEnabled: false,
    discountType: 'PERCENT',
    discountValue: '',
  },
  subjects: [],
  status: 'idle',
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_DADOS'; dados: Partial<DadosState> }
  | { type: 'SET_COBRANCA'; cobranca: Partial<CobrancaState> }
  | { type: 'SET_PLANO'; plano: Partial<PlanoState> }
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
    case 'SET_PLANO':
      return { ...state, plano: { ...state.plano, ...action.plano } }
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

// ── Validações por seção (reutilizadas pelos passos agrupados) ──
function isDadosValid(state: OnboardingState): boolean {
  const d = state.dados
  return (
    d.name.length >= 2 &&
    isValidCnpj(d.cnpj) &&
    EMAIL_RE.test(d.email) &&
    isValidBrMobile(d.phone) &&
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
    isValidBrMobile(d.responsiblePhone)
  )
}

function isCobrancaValid(state: OnboardingState): boolean {
  const b = state.cobranca
  return (
    b.dueDay >= 1 &&
    b.dueDay <= 28 &&
    b.closingDay >= 1 &&
    b.closingDay <= 28 &&
    b.municipalRegistration.length >= 1
  )
}

function isPlanoValid(state: OnboardingState): boolean {
  // planId sempre tem default; se há desconto, precisa de valor válido ≤ preço.
  const p = state.plano
  if (!p.discountEnabled) return true
  const plan = getPlan(p.planId)
  if (!plan) return false
  const n = parsePtBrNumber(p.discountValue)
  if (n <= 0) return false
  const { finalCents } = computeDiscountedCents(plan.priceCents, p.discountType, p.discountValue)
  // Precisa sobrar algo a pagar (desconto não pode zerar) e ser menor que o cheio.
  return finalCents > 0 && finalCents < plan.priceCents
}

export function canProceedFromStep(state: OnboardingState, step: number): boolean {
  switch (step) {
    // Passo 1 — Dados da escola (identidade, contato, endereço, responsável)
    case 1:
      return isDadosValid(state)
    // Passo 2 — Financeiro (cobrança + plano fundidos no mesmo passo)
    case 2:
      return isCobrancaValid(state) && isPlanoValid(state)
    // Passo 3 — Matérias (≥1 matéria)
    case 3:
      return state.subjects.length >= 1
    // Passo 4 — Revisão (não bloqueia navegação)
    case 4:
      return true
    default:
      return false
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useOnboarding() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_STEP', step })
  }, [])

  const setDados = useCallback((dados: Partial<DadosState>) => {
    dispatch({ type: 'SET_DADOS', dados })
  }, [])

  const setCobranca = useCallback((cobranca: Partial<CobrancaState>) => {
    dispatch({ type: 'SET_COBRANCA', cobranca })
  }, [])

  const setPlano = useCallback((plano: Partial<PlanoState>) => {
    dispatch({ type: 'SET_PLANO', plano })
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
    if (
      !canProceedFromStep(state, 1) ||
      !canProceedFromStep(state, 2) ||
      !canProceedFromStep(state, 3)
    )
      return

    dispatch({ type: 'SET_STATUS', status: 'submitting' })

    // Converte o desconto do plano para o formato persistido (bp ou cents).
    const plan = getPlan(state.plano.planId)!
    const discountValueNum = parsePtBrNumber(state.plano.discountValue)
    const planPayload = {
      planId: state.plano.planId,
      isBeta: state.plano.isBeta,
      ...(state.plano.discountEnabled && discountValueNum > 0
        ? state.plano.discountType === 'PERCENT'
          ? {
              discountType: 'PERCENT' as const,
              discountValueBp: Math.round(Math.min(discountValueNum, 100) * 100),
            }
          : {
              discountType: 'FIXED' as const,
              discountValueCents: Math.min(Math.round(discountValueNum * 100), plan.priceCents),
            }
        : {}),
    }

    const payload: CreateSchoolInput = {
      name: state.dados.name,
      cnpj: state.dados.cnpj.replace(/\D/g, ''),
      legalName: state.dados.legalName || undefined,
      tradeName: state.dados.tradeName || undefined,
      cnpjStatus: state.dados.cnpjStatus || undefined,
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
      plan: planPayload,
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

      const body = (await res.json().catch(() => null)) as ApiErrorBody | null
      const errorMsg = mapSubmitError(res.status, body)
      // Log estruturado pra observabilidade — o erro nunca mais é silencioso.
      console.error('[onboarding] submit failed:', {
        status: res.status,
        code: body?.code,
        error: body?.error,
      })
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg })
    } catch (err) {
      console.error('[onboarding] submit network error:', err)
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: mapSubmitError(0, null) })
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
    setPlano,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    reset,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}

'use client'

import { useReducer, useCallback } from 'react'
import type { CreateSchoolInput, SubjectInput } from '@/lib/validations/unit'
import { isValidCnpj, isValidBrMobile } from '@/lib/validations/br-documents'
import { getPlan, type SchoolPlanId } from '@/lib/data/plans'
import { computeDiscountedCents, parsePtBrNumber, type DiscountType } from '@/lib/pricing'
import { mapSubmitError, type ApiErrorBody } from '@/lib/onboarding/submit-error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface DetailsState {
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
  responsibleEmail: string
  responsiblePhone: string
}

export interface BillingState {
  dueDay: number
  closingDay: number
  lateFeePercent: number // basis points
  monthlyInterestBp: number // basis points
  cardFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  negativacaoFeePayer: 'RESPONSAVEL' | 'ESCOLA'
  municipalRegistration: string
}

export interface PlanState {
  planId: SchoolPlanId
  isBeta: boolean
  discountEnabled: boolean
  discountType: DiscountType
  discountValue: string // raw input (pt-BR)
}

export type WizardStep = 1 | 2 | 3 | 4

export interface OnboardingState {
  step: WizardStep
  details: DetailsState
  billing: BillingState
  plan: PlanState
  subjects: SubjectInput[]
  status: 'idle' | 'submitting' | 'success' | 'error'
  errorMsg?: string
  createdUnitId?: string
}

const initialState: OnboardingState = {
  step: 1,
  details: {
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
    responsibleEmail: '',
    responsiblePhone: '',
  },
  billing: {
    dueDay: 10,
    closingDay: 25,
    lateFeePercent: 200, // 2%
    monthlyInterestBp: 100, // 1% a.m.
    cardFeePayer: 'RESPONSAVEL',
    negativacaoFeePayer: 'RESPONSAVEL',
    municipalRegistration: '',
  },
  plan: {
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
  | { type: 'SET_DETAILS'; details: Partial<DetailsState> }
  | { type: 'SET_BILLING'; billing: Partial<BillingState> }
  | { type: 'SET_PLAN'; plan: Partial<PlanState> }
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
    case 'SET_DETAILS':
      return { ...state, details: { ...state.details, ...action.details } }
    case 'SET_BILLING':
      return { ...state, billing: { ...state.billing, ...action.billing } }
    case 'SET_PLAN':
      return { ...state, plan: { ...state.plan, ...action.plan } }
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
function isDetailsValid(state: OnboardingState): boolean {
  const d = state.details
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
    EMAIL_RE.test(d.responsibleEmail) &&
    isValidBrMobile(d.responsiblePhone)
  )
}

function isBillingValid(state: OnboardingState): boolean {
  const b = state.billing
  return (
    b.dueDay >= 1 &&
    b.dueDay <= 28 &&
    b.closingDay >= 1 &&
    b.closingDay <= 28 &&
    b.municipalRegistration.length >= 1
  )
}

function isPlanValid(state: OnboardingState): boolean {
  // planId sempre tem default; se há desconto, precisa de valor válido ≤ preço.
  const p = state.plan
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
      return isDetailsValid(state)
    // Passo 2 — Financeiro (cobrança + plano fundidos no mesmo passo)
    case 2:
      return isBillingValid(state) && isPlanValid(state)
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

  const setDetails = useCallback((details: Partial<DetailsState>) => {
    dispatch({ type: 'SET_DETAILS', details })
  }, [])

  const setBilling = useCallback((billing: Partial<BillingState>) => {
    dispatch({ type: 'SET_BILLING', billing })
  }, [])

  const setPlan = useCallback((plan: Partial<PlanState>) => {
    dispatch({ type: 'SET_PLAN', plan })
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
    const plan = getPlan(state.plan.planId)!
    const discountValueNum = parsePtBrNumber(state.plan.discountValue)
    const planPayload = {
      planId: state.plan.planId,
      isBeta: state.plan.isBeta,
      ...(state.plan.discountEnabled && discountValueNum > 0
        ? state.plan.discountType === 'PERCENT'
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
      name: state.details.name,
      cnpj: state.details.cnpj.replace(/\D/g, ''),
      legalName: state.details.legalName || undefined,
      tradeName: state.details.tradeName || undefined,
      cnpjStatus: state.details.cnpjStatus || undefined,
      email: state.details.email,
      phone: state.details.phone.replace(/\D/g, ''),
      cep: state.details.cep.replace(/\D/g, ''),
      address: state.details.address,
      number: state.details.number,
      neighborhood: state.details.neighborhood,
      complement: state.details.complement || undefined,
      city: state.details.city,
      state: state.details.state,
      isFranchise: state.details.isFranchise,
      franchiseParent: state.details.franchiseParent || undefined,
      responsibleName: state.details.responsibleName,
      responsibleEmail: state.details.responsibleEmail,
      responsiblePhone: state.details.responsiblePhone.replace(/\D/g, ''),
      billing: {
        dueDay: state.billing.dueDay,
        closingDay: state.billing.closingDay,
        lateFeePercent: state.billing.lateFeePercent,
        monthlyInterestBp: state.billing.monthlyInterestBp,
        cardFeePayer: state.billing.cardFeePayer,
        negativacaoFeePayer: state.billing.negativacaoFeePayer,
        municipalRegistration: state.billing.municipalRegistration,
      },
      plan: planPayload,
      subjects: state.subjects,
    }

    try {
      const res = await fetch('/api/setup/unit', {
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
    setDetails,
    setBilling,
    setPlan,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    reset,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}

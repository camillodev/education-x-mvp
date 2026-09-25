'use client'

import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import type { SubjectUpdateInput } from '@/lib/validations/unit'
import { isValidCnpj, isValidBrMobile } from '@/lib/validations/br-documents'
import { getPlan, type SchoolPlanId } from '@/lib/data/plans'
import { computeDiscountedCents, parsePtBrNumber, type DiscountType } from '@/lib/pricing'
import { mapSubmitError, type ApiErrorBody } from '@/lib/onboarding/submit-error'
import type {
  DetailsState,
  BillingState,
  PlanState,
  WizardStep,
} from '@/hooks/use-onboarding'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface EditSchoolState {
  step: WizardStep
  details: DetailsState
  billing: BillingState
  plan: PlanState
  subjects: SubjectUpdateInput[]
  status: 'idle' | 'submitting' | 'success' | 'error'
  errorMsg?: string
  lastSavedAt: Date | null
}

const emptyDetails: DetailsState = {
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
}

const emptyBilling: BillingState = {
  dueDay: 10,
  closingDay: 25,
  lateFeePercent: 200,
  monthlyInterestBp: 100,
  cardFeePayer: 'RESPONSAVEL',
  negativacaoFeePayer: 'RESPONSAVEL',
  municipalRegistration: '',
}

const emptyPlan: PlanState = {
  planId: 'basico',
  isBeta: false,
  discountEnabled: false,
  discountType: 'PERCENT',
  discountValue: '',
}

const initialState: EditSchoolState = {
  step: 1,
  details: emptyDetails,
  billing: emptyBilling,
  plan: emptyPlan,
  subjects: [],
  status: 'idle',
  lastSavedAt: null,
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; state: EditSchoolState }
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_DETAILS'; details: Partial<DetailsState> }
  | { type: 'SET_BILLING'; billing: Partial<BillingState> }
  | { type: 'SET_PLAN'; plan: Partial<PlanState> }
  | { type: 'ADD_SUBJECT'; subject: SubjectUpdateInput }
  | { type: 'REMOVE_SUBJECT'; index: number }
  | { type: 'UPDATE_SUBJECT'; index: number; subject: Partial<SubjectUpdateInput> }
  | { type: 'SET_STATUS'; status: EditSchoolState['status']; errorMsg?: string }
  | { type: 'SET_LAST_SAVED'; at: Date }

function reducer(state: EditSchoolState, action: Action): EditSchoolState {
  switch (action.type) {
    case 'LOAD':
      return action.state
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
      return { ...state, subjects: state.subjects.filter((_, i) => i !== action.index) }
    case 'UPDATE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.map((s, i) =>
          i === action.index ? { ...s, ...action.subject } : s
        ),
      }
    case 'SET_STATUS':
      return { ...state, status: action.status, errorMsg: action.errorMsg }
    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.at }
    default:
      return state
  }
}

// ─── Validação ────────────────────────────────────────────────────────────────

function isDetailsValid(state: EditSchoolState): boolean {
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
    d.responsibleName.length >= 3 &&
    EMAIL_RE.test(d.responsibleEmail) &&
    isValidBrMobile(d.responsiblePhone)
  )
}

function isBillingValid(state: EditSchoolState): boolean {
  const b = state.billing
  return (
    b.dueDay >= 1 &&
    b.dueDay <= 28 &&
    b.closingDay >= 1 &&
    b.closingDay <= 28 &&
    b.municipalRegistration.length >= 1
  )
}

function isPlanValid(state: EditSchoolState): boolean {
  const p = state.plan
  if (!p.discountEnabled) return true
  const plan = getPlan(p.planId)
  if (!plan) return false
  const n = parsePtBrNumber(p.discountValue)
  if (n <= 0) return false
  const { finalCents } = computeDiscountedCents(plan.priceCents, p.discountType, p.discountValue)
  return finalCents > 0 && finalCents < plan.priceCents
}

export function canProceedFromStep(state: EditSchoolState, step: number): boolean {
  switch (step) {
    case 1: return isDetailsValid(state)
    case 2: return isBillingValid(state) && isPlanValid(state)
    case 3: return state.subjects.length >= 1
    case 4: return true
    default: return false
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useEditSchool(unitId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!unitId) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/schools/${unitId}`)
      .then((r) => r.json())
      .then((u: Record<string, unknown>) => {
        if (cancelled) return
        const bc = u.billingConfig as Record<string, unknown> | null | undefined
        const subj = (u.subjects as Record<string, unknown>[] | undefined) ?? []
        const pl = u.planId as SchoolPlanId ?? 'basico'

        const loaded: EditSchoolState = {
          step: 1,
          details: {
            name: (u.name as string) ?? '',
            cnpj: (u.cnpj as string) ?? '',
            legalName: (u.legalName as string) ?? '',
            tradeName: (u.tradeName as string) ?? '',
            cnpjStatus: (u.cnpjStatus as string) ?? '',
            email: (u.email as string) ?? '',
            phone: (u.phone as string) ?? '',
            cep: (u.cep as string) ?? '',
            address: (u.address as string) ?? '',
            number: (u.number as string) ?? '',
            neighborhood: (u.neighborhood as string) ?? '',
            complement: (u.complement as string) ?? '',
            city: (u.city as string) ?? '',
            state: (u.state as string) ?? '',
            isFranchise: (u.isFranchise as boolean) ?? false,
            franchiseParent: (u.franchiseParent as string) ?? '',
            responsibleName: (u.responsibleName as string) ?? '',
            responsibleEmail: (u.responsibleEmail as string) ?? '',
            responsiblePhone: (u.responsiblePhone as string) ?? '',
          },
          billing: {
            dueDay: (bc?.dueDay as number) ?? 10,
            closingDay: (bc?.closingDay as number) ?? 25,
            lateFeePercent: (bc?.lateFeePercent as number) ?? 200,
            monthlyInterestBp: (bc?.monthlyInterestBp as number) ?? 100,
            cardFeePayer: (bc?.cardFeePayer as BillingState['cardFeePayer']) ?? 'RESPONSAVEL',
            negativacaoFeePayer: (bc?.negativacaoFeePayer as BillingState['negativacaoFeePayer']) ?? 'RESPONSAVEL',
            municipalRegistration: (bc?.municipalRegistration as string) ?? '',
          },
          plan: {
            planId: pl,
            isBeta: (u.isBeta as boolean) ?? false,
            discountEnabled: false,
            discountType: 'PERCENT' as DiscountType,
            discountValue: '',
          },
          subjects: subj.map((s) => ({
            name: (s.name as string) ?? '',
            nfseServiceCode: (s.nfseServiceCode as string) ?? '',
            priceCents: (s.priceCents as number) ?? 0,
            quarterlyPriceCents: s.quarterlyPriceCents as number | undefined,
            semiannualPriceCents: s.semiannualPriceCents as number | undefined,
            annualPriceCents: (s.annualPriceCents as number) ?? 0,
            isActive: (s.isActive as boolean) ?? true,
          })),
          status: 'idle',
          lastSavedAt: null,
        }
        dispatch({ type: 'LOAD', state: loaded })
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[edit-escola] load error:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [unitId])

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

  const addSubject = useCallback((subject: SubjectUpdateInput) => {
    dispatch({ type: 'ADD_SUBJECT', subject })
  }, [])

  const removeSubject = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_SUBJECT', index })
  }, [])

  const updateSubject = useCallback((index: number, subject: Partial<SubjectUpdateInput>) => {
    dispatch({ type: 'UPDATE_SUBJECT', index, subject })
  }, [])

  const submit = useCallback(async () => {
    if (
      !canProceedFromStep(state, 1) ||
      !canProceedFromStep(state, 2) ||
      !canProceedFromStep(state, 3)
    ) return

    dispatch({ type: 'SET_STATUS', status: 'submitting' })

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

    // cnpj é imutável — nunca enviado no PATCH
    const payload = {
      name: state.details.name,
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
      const res = await fetch(`/api/schools/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        dispatch({ type: 'SET_STATUS', status: 'success' })
        return
      }

      const body = (await res.json().catch(() => null)) as ApiErrorBody | null
      const errorMsg = mapSubmitError(res.status, body)
      console.error('[edit-school] submit failed:', { status: res.status, code: body?.code })
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg })
    } catch (err) {
      console.error('[edit-school] submit network error:', err)
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: mapSubmitError(0, null) })
    }
  }, [state, unitId])

  const autoSave = useCallback(async () => {
    const s = stateRef.current
    if (!canProceedFromStep(s, s.step)) return
    if (s.status === 'submitting') return

    const plan = getPlan(s.plan.planId)!
    const discountValueNum = parsePtBrNumber(s.plan.discountValue)
    const planPayload = {
      planId: s.plan.planId,
      isBeta: s.plan.isBeta,
      ...(s.plan.discountEnabled && discountValueNum > 0
        ? s.plan.discountType === 'PERCENT'
          ? { discountType: 'PERCENT' as const, discountValueBp: Math.round(Math.min(discountValueNum, 100) * 100) }
          : { discountType: 'FIXED' as const, discountValueCents: Math.min(Math.round(discountValueNum * 100), plan.priceCents) }
        : {}),
    }

    const payload = {
      name: s.details.name,
      legalName: s.details.legalName || undefined,
      tradeName: s.details.tradeName || undefined,
      cnpjStatus: s.details.cnpjStatus || undefined,
      email: s.details.email,
      phone: s.details.phone.replace(/\D/g, ''),
      cep: s.details.cep.replace(/\D/g, ''),
      address: s.details.address,
      number: s.details.number,
      neighborhood: s.details.neighborhood,
      complement: s.details.complement || undefined,
      city: s.details.city,
      state: s.details.state,
      isFranchise: s.details.isFranchise,
      franchiseParent: s.details.franchiseParent || undefined,
      responsibleName: s.details.responsibleName,
      responsibleEmail: s.details.responsibleEmail,
      responsiblePhone: s.details.responsiblePhone.replace(/\D/g, ''),
      billing: {
        dueDay: s.billing.dueDay,
        closingDay: s.billing.closingDay,
        lateFeePercent: s.billing.lateFeePercent,
        monthlyInterestBp: s.billing.monthlyInterestBp,
        cardFeePayer: s.billing.cardFeePayer,
        negativacaoFeePayer: s.billing.negativacaoFeePayer,
        municipalRegistration: s.billing.municipalRegistration,
      },
      plan: planPayload,
      subjects: s.subjects,
    }

    try {
      const res = await fetch(`/api/schools/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        dispatch({ type: 'SET_LAST_SAVED', at: new Date() })
      } else {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null
        toast(mapSubmitError(res.status, body), 'error')
      }
    } catch {
      toast(mapSubmitError(0, null), 'error')
    }
  }, [unitId, toast])

  return {
    state,
    loading,
    goToStep,
    setDetails,
    setBilling,
    setPlan,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    autoSave,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}


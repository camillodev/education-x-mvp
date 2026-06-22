'use client'

import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import type { SubjectUpdateInput } from '@/lib/validations/unit'
import { isValidCnpj, isValidBrMobile } from '@/lib/validations/br-documents'
import { getPlan, type SchoolPlanId } from '@/lib/data/plans'
import { computeDiscountedCents, parsePtBrNumber, type DiscountType } from '@/lib/pricing'
import { mapSubmitError, type ApiErrorBody } from '@/lib/onboarding/submit-error'
import type {
  DadosState,
  CobrancaState,
  PlanoState,
  WizardStep,
} from '@/hooks/use-onboarding'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface EditEscolaState {
  step: WizardStep
  dados: DadosState
  cobranca: CobrancaState
  plano: PlanoState
  subjects: SubjectUpdateInput[]
  status: 'idle' | 'submitting' | 'success' | 'error'
  errorMsg?: string
  lastSavedAt: Date | null
}

const emptyDados: DadosState = {
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

const emptyCobranca: CobrancaState = {
  dueDay: 10,
  closingDay: 25,
  lateFeePercent: 200,
  monthlyInterestBp: 100,
  cardFeePayer: 'RESPONSAVEL',
  negativacaoFeePayer: 'RESPONSAVEL',
  municipalRegistration: '',
}

const emptyPlano: PlanoState = {
  planId: 'basico',
  isBeta: false,
  discountEnabled: false,
  discountType: 'PERCENT',
  discountValue: '',
}

const initialState: EditEscolaState = {
  step: 1,
  dados: emptyDados,
  cobranca: emptyCobranca,
  plano: emptyPlano,
  subjects: [],
  status: 'idle',
  lastSavedAt: null,
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; state: EditEscolaState }
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_DADOS'; dados: Partial<DadosState> }
  | { type: 'SET_COBRANCA'; cobranca: Partial<CobrancaState> }
  | { type: 'SET_PLANO'; plano: Partial<PlanoState> }
  | { type: 'ADD_SUBJECT'; subject: SubjectUpdateInput }
  | { type: 'REMOVE_SUBJECT'; index: number }
  | { type: 'UPDATE_SUBJECT'; index: number; subject: Partial<SubjectUpdateInput> }
  | { type: 'SET_STATUS'; status: EditEscolaState['status']; errorMsg?: string }
  | { type: 'SET_LAST_SAVED'; at: Date }

function reducer(state: EditEscolaState, action: Action): EditEscolaState {
  switch (action.type) {
    case 'LOAD':
      return action.state
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

function isDadosValid(state: EditEscolaState): boolean {
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
    d.responsibleName.length >= 3 &&
    EMAIL_RE.test(d.responsibleEmail) &&
    isValidBrMobile(d.responsiblePhone)
  )
}

function isCobrancaValid(state: EditEscolaState): boolean {
  const b = state.cobranca
  return (
    b.dueDay >= 1 &&
    b.dueDay <= 28 &&
    b.closingDay >= 1 &&
    b.closingDay <= 28 &&
    b.municipalRegistration.length >= 1
  )
}

function isPlanoValid(state: EditEscolaState): boolean {
  const p = state.plano
  if (!p.discountEnabled) return true
  const plan = getPlan(p.planId)
  if (!plan) return false
  const n = parsePtBrNumber(p.discountValue)
  if (n <= 0) return false
  const { finalCents } = computeDiscountedCents(plan.priceCents, p.discountType, p.discountValue)
  return finalCents > 0 && finalCents < plan.priceCents
}

export function canProceedFromStep(state: EditEscolaState, step: number): boolean {
  switch (step) {
    case 1: return isDadosValid(state)
    case 2: return isCobrancaValid(state) && isPlanoValid(state)
    case 3: return state.subjects.length >= 1
    case 4: return true
    default: return false
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useEditEscola(unitId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!unitId) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/escolas/${unitId}`)
      .then((r) => r.json())
      .then((u: Record<string, unknown>) => {
        if (cancelled) return
        const bc = u.billingConfig as Record<string, unknown> | null | undefined
        const subj = (u.subjects as Record<string, unknown>[] | undefined) ?? []
        const pl = u.planId as SchoolPlanId ?? 'basico'

        const loaded: EditEscolaState = {
          step: 1,
          dados: {
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
          cobranca: {
            dueDay: (bc?.dueDay as number) ?? 10,
            closingDay: (bc?.closingDay as number) ?? 25,
            lateFeePercent: (bc?.lateFeePercent as number) ?? 200,
            monthlyInterestBp: (bc?.monthlyInterestBp as number) ?? 100,
            cardFeePayer: (bc?.cardFeePayer as CobrancaState['cardFeePayer']) ?? 'RESPONSAVEL',
            negativacaoFeePayer: (bc?.negativacaoFeePayer as CobrancaState['negativacaoFeePayer']) ?? 'RESPONSAVEL',
            municipalRegistration: (bc?.municipalRegistration as string) ?? '',
          },
          plano: {
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

  const setDados = useCallback((dados: Partial<DadosState>) => {
    dispatch({ type: 'SET_DADOS', dados })
  }, [])

  const setCobranca = useCallback((cobranca: Partial<CobrancaState>) => {
    dispatch({ type: 'SET_COBRANCA', cobranca })
  }, [])

  const setPlano = useCallback((plano: Partial<PlanoState>) => {
    dispatch({ type: 'SET_PLANO', plano })
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

    // cnpj é imutável — nunca enviado no PATCH
    const payload = {
      name: state.dados.name,
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
      const res = await fetch(`/api/escolas/${unitId}`, {
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
      console.error('[edit-escola] submit failed:', { status: res.status, code: body?.code })
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg })
    } catch (err) {
      console.error('[edit-escola] submit network error:', err)
      dispatch({ type: 'SET_STATUS', status: 'error', errorMsg: mapSubmitError(0, null) })
    }
  }, [state, unitId])

  const autoSave = useCallback(async () => {
    const s = stateRef.current
    if (!canProceedFromStep(s, s.step)) return
    if (s.status === 'submitting') return

    const plan = getPlan(s.plano.planId)!
    const discountValueNum = parsePtBrNumber(s.plano.discountValue)
    const planPayload = {
      planId: s.plano.planId,
      isBeta: s.plano.isBeta,
      ...(s.plano.discountEnabled && discountValueNum > 0
        ? s.plano.discountType === 'PERCENT'
          ? { discountType: 'PERCENT' as const, discountValueBp: Math.round(Math.min(discountValueNum, 100) * 100) }
          : { discountType: 'FIXED' as const, discountValueCents: Math.min(Math.round(discountValueNum * 100), plan.priceCents) }
        : {}),
    }

    const payload = {
      name: s.dados.name,
      legalName: s.dados.legalName || undefined,
      tradeName: s.dados.tradeName || undefined,
      cnpjStatus: s.dados.cnpjStatus || undefined,
      email: s.dados.email,
      phone: s.dados.phone.replace(/\D/g, ''),
      cep: s.dados.cep.replace(/\D/g, ''),
      address: s.dados.address,
      number: s.dados.number,
      neighborhood: s.dados.neighborhood,
      complement: s.dados.complement || undefined,
      city: s.dados.city,
      state: s.dados.state,
      isFranchise: s.dados.isFranchise,
      franchiseParent: s.dados.franchiseParent || undefined,
      responsibleName: s.dados.responsibleName,
      responsibleEmail: s.dados.responsibleEmail,
      responsiblePhone: s.dados.responsiblePhone.replace(/\D/g, ''),
      billing: {
        dueDay: s.cobranca.dueDay,
        closingDay: s.cobranca.closingDay,
        lateFeePercent: s.cobranca.lateFeePercent,
        monthlyInterestBp: s.cobranca.monthlyInterestBp,
        cardFeePayer: s.cobranca.cardFeePayer,
        negativacaoFeePayer: s.cobranca.negativacaoFeePayer,
        municipalRegistration: s.cobranca.municipalRegistration,
      },
      plan: planPayload,
      subjects: s.subjects,
    }

    try {
      const res = await fetch(`/api/escolas/${unitId}`, {
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
    setDados,
    setCobranca,
    setPlano,
    addSubject,
    removeSubject,
    updateSubject,
    submit,
    autoSave,
    canProceed: (step: number) => canProceedFromStep(state, step),
  }
}


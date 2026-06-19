import type { OnboardingState } from './use-onboarding'

/**
 * Persistência local do rascunho do onboarding (cumpre a promessa da UI:
 * "Tudo é salvo como rascunho automaticamente").
 *
 * Só os campos do FORMULÁRIO são persistidos — campos voláteis (status, errorMsg,
 * createdUnitId) ficam de fora, pra um reload não restaurar um estado de erro/sucesso.
 *
 * Resiliente: localStorage pode não existir (SSR) ou lançar (modo privado/quota).
 * Nunca quebra o app — em qualquer falha, age como "sem rascunho".
 */

export const DRAFT_KEY = 'edx:onboarding:draft'

/** Subconjunto persistível do estado — só o que o usuário preencheu. */
export type DraftState = Pick<
  OnboardingState,
  'step' | 'dados' | 'cobranca' | 'plano' | 'subjects'
>

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function saveDraft(state: DraftState): void {
  const storage = getStorage()
  if (!storage) return
  const draft: DraftState = {
    step: state.step,
    dados: state.dados,
    cobranca: state.cobranca,
    plano: state.plano,
    subjects: state.subjects,
  }
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // quota/modo privado — ignora, persistência é best-effort.
  }
}

export function loadDraft(): DraftState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DraftState
  } catch {
    return null
  }
}

export function clearDraft(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(DRAFT_KEY)
  } catch {
    // ignora
  }
}

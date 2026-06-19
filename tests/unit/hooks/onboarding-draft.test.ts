import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadDraft,
  saveDraft,
  clearDraft,
  DRAFT_KEY,
  type DraftState,
} from '../../../src/hooks/onboarding-draft'

// jsdom já fornece localStorage; limpa entre testes.
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

// Amostra com campos parciais — o roundtrip save/load não valida o shape completo,
// só precisa preservar o que foi gravado. Cast pra DraftState mantém o teste enxuto.
const sample = {
  step: 2,
  dados: { name: 'Escola Teste', cnpj: '11222333000181' },
  cobranca: { dueDay: 10 },
  plano: { planId: 'basico' },
  subjects: [
    { name: 'Matemática', nfseServiceCode: '8.01', priceCents: 45000, annualPriceCents: 38000 },
  ],
} as unknown as DraftState

describe('onboarding-draft (persistência localStorage)', () => {
  it('saveDraft grava e loadDraft recupera o mesmo estado', () => {
    saveDraft(sample)
    expect(loadDraft()).toEqual(sample)
  })

  it('loadDraft retorna null quando não há rascunho', () => {
    expect(loadDraft()).toBeNull()
  })

  it('clearDraft remove o rascunho', () => {
    saveDraft(sample)
    clearDraft()
    expect(loadDraft()).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('NÃO persiste campos voláteis (status/errorMsg/createdUnitId)', () => {
    // saveDraft recebe o estado completo do wizard; só os campos do formulário devem ir.
    saveDraft({
      ...sample,
      // @ts-expect-error — campos voláteis não fazem parte de DraftState, mas testamos o runtime
      status: 'submitting',
      errorMsg: 'erro',
      createdUnitId: 'unit-1',
    })
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY)!)
    expect(raw.status).toBeUndefined()
    expect(raw.errorMsg).toBeUndefined()
    expect(raw.createdUnitId).toBeUndefined()
  })

  it('loadDraft retorna null se o JSON estiver corrompido (não quebra)', () => {
    localStorage.setItem(DRAFT_KEY, '{ não é json válido')
    expect(loadDraft()).toBeNull()
  })

  it('é resiliente a localStorage indisponível (SSR / modo privado)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    // não deve lançar
    expect(() => saveDraft(sample)).not.toThrow()
  })
})

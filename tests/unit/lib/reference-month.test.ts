import { describe, it, expect } from 'vitest'
import { currentReferenceMonth } from '@/lib/reference-month'

describe('currentReferenceMonth', () => {
  it('retorna "YYYY-MM" em UTC para uma data explícita', () => {
    expect(currentReferenceMonth(new Date('2026-03-15T10:00:00Z'))).toBe('2026-03')
  })

  it('preenche mês de 1 dígito com zero à esquerda', () => {
    expect(currentReferenceMonth(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01')
  })

  it('usa o ano com 4 dígitos', () => {
    expect(currentReferenceMonth(new Date('2026-11-30T23:59:59Z'))).toBe('2026-11')
  })

  it('usa UTC, não o fuso local do processo (31/dez 23h UTC não vira jan no rótulo)', () => {
    expect(currentReferenceMonth(new Date('2026-12-31T23:00:00Z'))).toBe('2026-12')
  })

  it('sem argumento, usa a data atual e retorna no formato YYYY-MM', () => {
    expect(currentReferenceMonth()).toMatch(/^\d{4}-\d{2}$/)
  })
})

import { describe, it, expect } from 'vitest'
import { computeDiscountedCents, parsePtBrNumber } from '../../src/lib/pricing'

describe('parsePtBrNumber', () => {
  it('parseia inteiro', () => {
    expect(parsePtBrNumber('10')).toBe(10)
  })
  it('parseia decimal com vírgula', () => {
    expect(parsePtBrNumber('10,5')).toBe(10.5)
  })
  it('parseia com separador de milhar', () => {
    expect(parsePtBrNumber('1.234,56')).toBe(1234.56)
  })
  it('retorna 0 para vazio/inválido', () => {
    expect(parsePtBrNumber('')).toBe(0)
    expect(parsePtBrNumber('abc')).toBe(0)
  })
})

describe('computeDiscountedCents — PERCENT', () => {
  it('10% sobre 49900 = 4990 desconto, 44910 final', () => {
    expect(computeDiscountedCents(49900, 'PERCENT', '10')).toEqual({
      discountCents: 4990,
      finalCents: 44910,
    })
  })
  it('arredonda corretamente (5% sobre 39900 = 1995)', () => {
    expect(computeDiscountedCents(39900, 'PERCENT', '5')).toEqual({
      discountCents: 1995,
      finalCents: 37905,
    })
  })
  it('clampa percentual acima de 100% no preço total', () => {
    expect(computeDiscountedCents(49900, 'PERCENT', '150')).toEqual({
      discountCents: 49900,
      finalCents: 0,
    })
  })
})

describe('computeDiscountedCents — FIXED', () => {
  it('R$ 50 sobre 49900 = 5000 desconto, 44900 final', () => {
    expect(computeDiscountedCents(49900, 'FIXED', '50')).toEqual({
      discountCents: 5000,
      finalCents: 44900,
    })
  })
  it('R$ com centavos (49,90 = 4990)', () => {
    expect(computeDiscountedCents(49900, 'FIXED', '49,90')).toEqual({
      discountCents: 4990,
      finalCents: 44910,
    })
  })
  it('desconto fixo nunca passa do preço', () => {
    expect(computeDiscountedCents(39900, 'FIXED', '500')).toEqual({
      discountCents: 39900,
      finalCents: 0,
    })
  })
})

describe('computeDiscountedCents — edge cases', () => {
  it('valor zero não desconta', () => {
    expect(computeDiscountedCents(49900, 'PERCENT', '0')).toEqual({
      discountCents: 0,
      finalCents: 49900,
    })
  })
  it('valor vazio não desconta', () => {
    expect(computeDiscountedCents(49900, 'FIXED', '')).toEqual({
      discountCents: 0,
      finalCents: 49900,
    })
  })
})

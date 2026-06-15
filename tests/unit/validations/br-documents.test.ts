import { describe, it, expect } from 'vitest'
import { isValidCnpj, isValidBrPhone } from '../../../src/lib/validations/br-documents'

describe('isValidCnpj', () => {
  it('aceita CNPJ válido (dígitos verificadores corretos)', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCnpj('11222333000199')).toBe(false)
  })

  it('rejeita sequência de dígitos iguais (00000000000000)', () => {
    expect(isValidCnpj('00000000000000')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
  })

  it('rejeita CNPJ com menos de 14 dígitos', () => {
    expect(isValidCnpj('1122233300')).toBe(false)
  })

  it('rejeita CNPJ com pontuação ou letras', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(false)
    expect(isValidCnpj('1122233300018A')).toBe(false)
  })
})

describe('isValidBrPhone', () => {
  it('aceita celular válido (11 dígitos, DDD válido, nono dígito)', () => {
    expect(isValidBrPhone('31999990000')).toBe(true)
  })

  it('aceita fixo válido (10 dígitos, DDD válido)', () => {
    expect(isValidBrPhone('3133334444')).toBe(true)
  })

  it('rejeita DDD inexistente (20)', () => {
    expect(isValidBrPhone('20999990000')).toBe(false)
  })

  it('rejeita celular de 11 dígitos sem o nono dígito 9', () => {
    expect(isValidBrPhone('31888880000')).toBe(false)
  })

  it('rejeita telefone com menos de 10 dígitos', () => {
    expect(isValidBrPhone('319999')).toBe(false)
  })

  it('rejeita telefone com pontuação', () => {
    expect(isValidBrPhone('(31) 99999-0000')).toBe(false)
  })
})

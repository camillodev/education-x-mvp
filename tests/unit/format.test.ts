import { describe, it, expect } from 'vitest'
import { maskCnpjTail } from '@/lib/format'

describe('maskCnpjTail', () => {
  it('mostra bullets + últimos 5 dígitos de um CNPJ de 14 dígitos', () => {
    expect(maskCnpjTail('11222333000190')).toBe('•••• 00190')
  })

  it('ignora máscara/pontuação no input', () => {
    expect(maskCnpjTail('11.222.333/0001-90')).toBe('•••• 00190')
  })

  it('lida com menos de 5 dígitos sem quebrar', () => {
    expect(maskCnpjTail('123')).toBe('•••• 123')
  })
})

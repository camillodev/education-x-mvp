import { describe, it, expect } from 'vitest'
import { GuardianStepSchema } from '@/lib/validations/guardian'

const validInput = {
  name: 'Maria da Silva',
  cpf: '111.444.777-35',
  email: 'maria@example.com',
  phone: '(31) 98888-7777',
  type: 'MOTHER' as const,
}

describe('GuardianStepSchema', () => {
  it('aceita input válido e normaliza cpf/phone (só dígitos)', () => {
    const result = GuardianStepSchema.parse(validInput)
    expect(result.cpf).toBe('11144477735')
    expect(result.phone).toBe('31988887777')
    expect(result.name).toBe('Maria da Silva')
  })

  it('rejeita nome sem sobrenome (sem espaço)', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, name: 'Maria' })).toThrow()
  })

  it('rejeita nome vazio', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, name: '' })).toThrow()
  })

  it('rejeita CPF inválido (dígito verificador errado)', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, cpf: '111.444.777-36' })).toThrow()
  })

  it('rejeita email sem formato válido', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, email: 'nao-e-email' })).toThrow()
  })

  it('rejeita celular sem DDD válido ou sem o 9', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, phone: '3138887777' })).toThrow()
  })

  it('rejeita type fora do enum', () => {
    expect(() => GuardianStepSchema.parse({ ...validInput, type: 'AVO' })).toThrow()
  })
})

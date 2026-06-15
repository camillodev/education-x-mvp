import { describe, it, expect } from 'vitest'
import { CreateSchoolSchema } from '../../../src/lib/validations/unit'

const validInput = {
  name: 'Kumon Camargos',
  cnpj: '11222333000181',
  email: 'contato@kumon.com',
  phone: '31999990000',
  cep: '30350540',
  address: 'Rua das Flores',
  number: '123',
  neighborhood: 'Centro',
  complement: 'Sala 2',
  city: 'Belo Horizonte',
  state: 'MG',
  isFranchise: true,
  franchiseParent: 'Kumon Brasil',
  responsibleName: 'Maria Pimenta',
  responsibleCpf: '11144477735',
  responsibleEmail: 'maria@kumon.com',
  responsiblePhone: '31988887777',
  billing: {
    dueDay: 25,
    closingDay: 25,
    lateFeePercent: 200,
    monthlyInterestBp: 100,
    cardFeePayer: 'RESPONSAVEL' as const,
    negativacaoFeePayer: 'RESPONSAVEL' as const,
    municipalRegistration: '1234567',
  },
  subjects: [
    {
      name: 'Matemática',
      nfseServiceCode: '8.01',
      priceCents: 35000,
    },
  ],
}

describe('CreateSchoolSchema', () => {
  it('aceita input válido completo', () => {
    const result = CreateSchoolSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejeita CNPJ com menos de 14 dígitos', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, cnpj: '1234567800' })
    expect(result.success).toBe(false)
  })

  it('rejeita CNPJ com letras', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, cnpj: '1234567800019A' })
    expect(result.success).toBe(false)
  })

  it('rejeita CNPJ com pontuação (espera só dígitos)', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, cnpj: '12.345.678/0001-99' })
    expect(result.success).toBe(false)
  })

  it('rejeita subjects vazio', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, subjects: [] })
    expect(result.success).toBe(false)
  })

  it('rejeita dueDay = 0', () => {
    const result = CreateSchoolSchema.safeParse({
      ...validInput,
      billing: { ...validInput.billing, dueDay: 0 },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita dueDay = 29', () => {
    const result = CreateSchoolSchema.safeParse({
      ...validInput,
      billing: { ...validInput.billing, dueDay: 29 },
    })
    expect(result.success).toBe(false)
  })

  it('aceita dueDay = 1 e dueDay = 28 (limites)', () => {
    expect(CreateSchoolSchema.safeParse({ ...validInput, billing: { ...validInput.billing, dueDay: 1 } }).success).toBe(true)
    expect(CreateSchoolSchema.safeParse({ ...validInput, billing: { ...validInput.billing, dueDay: 28 } }).success).toBe(true)
  })

  it('rejeita subject com priceCents = 0', () => {
    const result = CreateSchoolSchema.safeParse({
      ...validInput,
      subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita subject com priceCents negativo', () => {
    const result = CreateSchoolSchema.safeParse({
      ...validInput,
      subjects: [{ name: 'Matemática', nfseServiceCode: '8.01', priceCents: -100 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, email: 'nao-e-email' })
    expect(result.success).toBe(false)
  })

  it('rejeita state com mais de 2 chars', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, state: 'MGX' })
    expect(result.success).toBe(false)
  })

  it('aceita sem franchiseParent quando isFranchise = false', () => {
    const result = CreateSchoolSchema.safeParse({
      ...validInput,
      isFranchise: false,
      franchiseParent: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita CNPJ com 14 dígitos mas DV inválido', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, cnpj: '11222333000199' })
    expect(result.success).toBe(false)
  })

  it('rejeita telefone com DDD inexistente', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, phone: '20999990000' })
    expect(result.success).toBe(false)
  })

  it('rejeita sem número do endereço', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, number: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita sem bairro', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, neighborhood: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita CPF do responsável inválido', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, responsibleCpf: '11144477700' })
    expect(result.success).toBe(false)
  })

  it('rejeita e-mail do responsável inválido', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, responsibleEmail: 'nao-email' })
    expect(result.success).toBe(false)
  })

  it('rejeita sem nome do responsável', () => {
    const result = CreateSchoolSchema.safeParse({ ...validInput, responsibleName: '' })
    expect(result.success).toBe(false)
  })
})

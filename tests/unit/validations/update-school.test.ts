import { describe, it, expect } from 'vitest'
import { UpdateSchoolSchema } from '@/lib/validations/unit'

const validUpdate = {
  name: 'Escola Atualizada',
  legalName: 'Razão LTDA',
  email: 'novo@escola.com',
  phone: '31999990000',
  cep: '30350540',
  address: 'Rua Nova',
  number: '99',
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'MG',
  isFranchise: false,
  responsibleName: 'Maria Silva',
  responsibleEmail: 'maria@escola.com',
  responsiblePhone: '31988887777',
  billing: {
    dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 100,
    cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'ESCOLA',
    municipalRegistration: '12345',
  },
  plan: { planId: 'basico', isBeta: false },
  subjects: [{
    name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000,
    annualPriceCents: 300000, isActive: true,
  }],
}

describe('UpdateSchoolSchema', () => {
  it('aceita um update válido sem cnpj', () => {
    expect(UpdateSchoolSchema.safeParse(validUpdate).success).toBe(true)
  })

  it('rejeita se cnpj estiver presente (read-only)', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, cnpj: '11222333000181' })
    expect(r.success).toBe(false)
  })

  it('rejeita name vazio', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, name: '' })
    expect(r.success).toBe(false)
  })

  it('exige ao menos 1 matéria', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, subjects: [] })
    expect(r.success).toBe(false)
  })
})

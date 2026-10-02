import { describe, it, expect } from 'vitest'
import { mapSubmitError } from '../../../src/lib/onboarding/submit-error'

describe('mapSubmitError', () => {
  it('status 0 → mensagem de rede', () => {
    expect(mapSubmitError(0, null)).toMatch(/conexão/i)
  })

  it('401 → sessão expirada', () => {
    expect(mapSubmitError(401, { error: 'Sessão expirada.', code: 'UNAUTHORIZED' })).toMatch(
      /sessão/i
    )
  })

  it('403 → sem permissão (usa mensagem do backend)', () => {
    const msg = mapSubmitError(403, {
      error: 'Você não tem permissão para cadastrar escolas.',
      code: 'FORBIDDEN',
    })
    expect(msg).toMatch(/permissão/i)
  })

  it('400 com fieldErrors → mostra o campo inválido', () => {
    const msg = mapSubmitError(400, {
      error: 'Dados inválidos.',
      code: 'VALIDATION',
      issues: { formErrors: [], fieldErrors: { cnpj: ['CNPJ inválido (dígito verificador)'] } },
    })
    expect(msg).toMatch(/CNPJ inválido/i)
  })

  it('400 sem issues → mensagem genérica de validação', () => {
    expect(mapSubmitError(400, { error: 'Dados inválidos.' })).toMatch(/inválid/i)
  })

  it('409 → CNPJ já cadastrado', () => {
    expect(mapSubmitError(409, { error: 'CNPJ já cadastrado.', code: 'DUPLICATE_CNPJ' })).toMatch(
      /CNPJ já cadastrado/i
    )
  })

  it('502 → falha de provisionamento', () => {
    expect(mapSubmitError(502, { code: 'ASAAS_PROVISION' })).toMatch(/provision|pagamento/i)
  })

  it('500 → fallback amigável mencionando suporte', () => {
    expect(mapSubmitError(500, null)).toMatch(/suporte/i)
  })

  it('status desconhecido → fallback', () => {
    expect(mapSubmitError(418, null)).toBeTruthy()
  })
})

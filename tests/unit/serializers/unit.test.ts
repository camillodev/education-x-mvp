import { describe, it, expect } from 'vitest'
import { toSafeUnit } from '@/lib/serializers/unit'

describe('toSafeUnit', () => {
  it('remove todos os 6 campos sensíveis', () => {
    const input = {
      id: '1',
      name: 'Escola',
      responsibleCpfEnc: 'SENTINEL_CPF_ENC',
      asaasApiKeyEnc: 'SENTINEL_ASAAS_KEY',
      asaasWalletId: 'SENTINEL_WALLET_ID',
      asaasAccountId: 'SENTINEL_ACCOUNT_ID',
      confirmationToken: 'SENTINEL_CONF_TOKEN',
      confirmationTokenExpiresAt: 'SENTINEL_CONF_TOKEN_EXP',
    }
    const result = toSafeUnit(input)
    expect(result).not.toHaveProperty('responsibleCpfEnc')
    expect(result).not.toHaveProperty('asaasApiKeyEnc')
    expect(result).not.toHaveProperty('asaasWalletId')
    expect(result).not.toHaveProperty('asaasAccountId')
    expect(result).not.toHaveProperty('confirmationToken')
    expect(result).not.toHaveProperty('confirmationTokenExpiresAt')
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('SENTINEL_CPF_ENC')
    expect(serialized).not.toContain('SENTINEL_ASAAS_KEY')
    expect(serialized).not.toContain('SENTINEL_WALLET_ID')
    expect(serialized).not.toContain('SENTINEL_ACCOUNT_ID')
    expect(serialized).not.toContain('SENTINEL_CONF_TOKEN')
    expect(serialized).not.toContain('SENTINEL_CONF_TOKEN_EXP')
  })

  it('preserva campos não-sensíveis', () => {
    const input = {
      id: '42',
      name: 'Escola Teste',
      email: 'escola@teste.com',
      city: 'BH',
      state: 'MG',
      status: 'ACTIVE',
      responsibleCpfEnc: 'SENTINEL_CPF_ENC',
      asaasApiKeyEnc: 'SENTINEL_ASAAS_KEY',
      asaasWalletId: 'SENTINEL_WALLET_ID',
      asaasAccountId: 'SENTINEL_ACCOUNT_ID',
      confirmationToken: 'SENTINEL_CONF_TOKEN',
      confirmationTokenExpiresAt: 'SENTINEL_CONF_TOKEN_EXP',
    }
    const result = toSafeUnit(input)
    expect(result).toHaveProperty('id', '42')
    expect(result).toHaveProperty('name', 'Escola Teste')
    expect(result).toHaveProperty('email', 'escola@teste.com')
    expect(result).toHaveProperty('city', 'BH')
    expect(result).toHaveProperty('state', 'MG')
    expect(result).toHaveProperty('status', 'ACTIVE')
  })

  it('preserva relações como billingConfig e subjects', () => {
    const input = {
      id: '1',
      name: 'Escola',
      responsibleCpfEnc: 'SENTINEL_CPF_ENC',
      asaasApiKeyEnc: 'SENTINEL_ASAAS_KEY',
      asaasWalletId: 'SENTINEL_WALLET_ID',
      asaasAccountId: 'SENTINEL_ACCOUNT_ID',
      confirmationToken: 'SENTINEL_CONF_TOKEN',
      confirmationTokenExpiresAt: 'SENTINEL_CONF_TOKEN_EXP',
      billingConfig: { id: 'b1', dueDay: 10 },
      subjects: [{ id: 's1', name: 'Matemática' }],
    }
    const result = toSafeUnit(input)
    expect(result).toHaveProperty('billingConfig')
    expect(result.billingConfig).toEqual({ id: 'b1', dueDay: 10 })
    expect(result).toHaveProperty('subjects')
    expect(result.subjects).toHaveLength(1)
  })

  it('funciona com objeto sem campos sensíveis (noop seguro)', () => {
    const input = { id: '1', name: 'Escola', city: 'SP' }
    const result = toSafeUnit(input)
    expect(result).toEqual({ id: '1', name: 'Escola', city: 'SP' })
  })
})

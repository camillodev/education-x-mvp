import { describe, it, expect } from 'vitest'
import { timingSafeStringEqual, timingSafeBearerEqual } from '@/lib/auth/timing-safe'

describe('timingSafeStringEqual', () => {
  it('retorna true para strings iguais', () => {
    expect(timingSafeStringEqual('segredo-123', 'segredo-123')).toBe(true)
  })

  it('retorna false para strings diferentes de mesmo tamanho', () => {
    expect(timingSafeStringEqual('segredo-123', 'segredo-456')).toBe(false)
  })

  it('retorna false para strings de tamanhos diferentes, sem lançar exceção', () => {
    expect(timingSafeStringEqual('curto', 'um-valor-bem-mais-longo')).toBe(false)
  })

  it('retorna false quando a for null', () => {
    expect(timingSafeStringEqual(null, 'segredo')).toBe(false)
  })

  it('retorna false quando a for undefined', () => {
    expect(timingSafeStringEqual(undefined, 'segredo')).toBe(false)
  })

  it('retorna false quando a for string vazia', () => {
    expect(timingSafeStringEqual('', 'segredo')).toBe(false)
  })

  it('retorna false quando b for string vazia', () => {
    expect(timingSafeStringEqual('segredo', '')).toBe(false)
  })
})

describe('timingSafeBearerEqual', () => {
  it('retorna true quando header é "Bearer <secret>" com o secret correto', () => {
    expect(timingSafeBearerEqual('Bearer token-correto', 'token-correto')).toBe(true)
  })

  it('retorna false quando o token do Bearer está errado', () => {
    expect(timingSafeBearerEqual('Bearer token-errado', 'token-correto')).toBe(false)
  })

  it('retorna false quando o header não tem o prefixo "Bearer "', () => {
    expect(timingSafeBearerEqual('token-correto', 'token-correto')).toBe(false)
  })

  it('retorna false quando o header é null', () => {
    expect(timingSafeBearerEqual(null, 'token-correto')).toBe(false)
  })
})

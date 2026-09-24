import { describe, it, expect } from 'vitest'
import { landingPathForRole, SIGN_IN_ROUTE, SIGN_IN_INVALID_SESSION_ROUTE } from '../../../src/lib/auth/auth'

describe('landingPathForRole', () => {
  it('retorna /escolas para admin', () => {
    expect(landingPathForRole('admin')).toBe('/escolas')
  })

  it('retorna /painel/dashboard para orientador', () => {
    expect(landingPathForRole('orientador')).toBe('/painel/dashboard')
  })
})

describe('rotas de sign-in', () => {
  it('SIGN_IN_ROUTE aponta para /sign-in', () => {
    expect(SIGN_IN_ROUTE).toBe('/sign-in')
  })

  it('SIGN_IN_INVALID_SESSION_ROUTE aponta para /sign-in com error=invalid_session', () => {
    expect(SIGN_IN_INVALID_SESSION_ROUTE).toBe('/sign-in?error=invalid_session')
  })
})

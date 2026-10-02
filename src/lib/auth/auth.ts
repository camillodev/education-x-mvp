import type { Route } from 'next'

export const SIGN_IN_ROUTE = '/sign-in' as Route
export const SIGN_IN_INVALID_SESSION_ROUTE = '/sign-in?error=invalid_session' as Route

export function landingPathForRole(role: 'admin' | 'orientador'): Route {
  return role === 'admin' ? ('/escolas' as Route) : ('/painel/dashboard' as Route)
}

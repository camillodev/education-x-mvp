import { auth } from '@clerk/nextjs/server'

export interface UnitContext {
  userId: string
  unitId: string
  role: 'admin' | 'orientador'
}

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor() {
    super('Não autenticado')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(msg = 'Acesso negado') {
    super(msg)
    this.name = 'ForbiddenError'
  }
}

/**
 * Lê userId, role e unitId dos sessionClaims do Clerk.
 * unitId SEMPRE vem da sessão — nunca de parâmetro HTTP.
 * Throws UnauthorizedError se não autenticado.
 * Throws ForbiddenError se role inválido ou unitId ausente para orientador.
 */
/**
 * Dev-only auth bypass for local Playwright validation of protected screens.
 * Active ONLY when DISABLE_CLERK=true AND not in production. Returns a fake
 * context with the role from DEV_USER_ROLE (default admin).
 * Hard-gated by NODE_ENV so it can never leak to prod.
 */
function devBypassContext(): UnitContext | null {
  if (process.env.NODE_ENV === 'production') return null
  if (process.env.DISABLE_CLERK !== 'true') return null

  const role = process.env.DEV_USER_ROLE === 'orientador' ? 'orientador' : 'admin'
  return {
    userId: 'dev-user',
    unitId: role === 'admin' ? '__admin__' : (process.env.DEV_UNIT_ID ?? 'dev-unit'),
    role,
  }
}

export async function getUnitContext(): Promise<UnitContext> {
  const bypass = devBypassContext()
  if (bypass) return bypass

  const { userId, sessionClaims } = await auth()

  if (!userId) throw new UnauthorizedError()

  const meta = (sessionClaims?.publicMetadata ?? {}) as {
    role?: string
    unitId?: string
  }

  const role = meta.role

  if (role !== 'admin' && role !== 'orientador') {
    throw new ForbiddenError('Role não autorizado')
  }

  if (role === 'orientador' && !meta.unitId) {
    throw new ForbiddenError('unitId ausente na sessão do orientadorqueado')
  }

  return {
    userId,
    unitId: role === 'admin' ? '__admin__' : meta.unitId!,
    role: role as 'admin' | 'orientador',
  }
}

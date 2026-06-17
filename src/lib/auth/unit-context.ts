import { auth } from '@clerk/nextjs/server'

export interface UnitContext {
  userId: string
  unitId: string
  role: 'admin_ix' | 'fran'
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
 * Throws ForbiddenError se role inválido ou unitId ausente para fran.
 */
/**
 * Dev-only auth bypass for local Playwright validation of protected screens.
 * Active ONLY when DISABLE_CLERK=true AND not in production. Returns a fake
 * context with the role from DEV_USER_ROLE (default admin_ix).
 * Hard-gated by NODE_ENV so it can never leak to prod.
 */
function devBypassContext(): UnitContext | null {
  if (process.env.NODE_ENV === 'production') return null
  if (process.env.DISABLE_CLERK !== 'true') return null

  const role = process.env.DEV_USER_ROLE === 'fran' ? 'fran' : 'admin_ix'
  return {
    userId: 'dev-user',
    unitId: role === 'admin_ix' ? '__admin__' : (process.env.DEV_UNIT_ID ?? 'dev-unit'),
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

  if (role !== 'admin_ix' && role !== 'fran') {
    throw new ForbiddenError('Role não autorizado')
  }

  if (role === 'fran' && !meta.unitId) {
    throw new ForbiddenError('unitId ausente na sessão do franqueado')
  }

  return {
    userId,
    unitId: role === 'admin_ix' ? '__admin__' : meta.unitId!,
    role: role as 'admin_ix' | 'fran',
  }
}

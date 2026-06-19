import { auth, currentUser } from '@clerk/nextjs/server'

type RoleMeta = { role?: string; unitId?: string }

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
 * Resolve role/unitId do usuário.
 *
 * Fonte primária: `sessionClaims.metadata` — o custom claim do Clerk
 * (`{ "metadata": "{{user.public_metadata}}" }`), que trafega no JWT sem
 * network call. Fallback: `currentUser().publicMetadata` — cobre sessões
 * antigas emitidas antes do claim ser configurado. (O session token NÃO
 * inclui publicMetadata por padrão, por isso não lemos sessionClaims.publicMetadata.)
 */
async function resolveRoleMeta(
  sessionClaims: { metadata?: RoleMeta } | null | undefined
): Promise<RoleMeta> {
  const fromClaim = sessionClaims?.metadata
  if (fromClaim?.role) return fromClaim

  // Fallback: claim ausente (sessão pré-configuração). Busca no Clerk.
  const user = await currentUser()
  return (user?.publicMetadata ?? {}) as RoleMeta
}

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

  const meta = await resolveRoleMeta(sessionClaims)
  const role = meta.role

  if (role !== 'admin' && role !== 'orientador') {
    throw new ForbiddenError('Role não autorizado')
  }

  if (role === 'orientador' && !meta.unitId) {
    throw new ForbiddenError('unitId ausente na sessão do orientador')
  }

  return {
    userId,
    unitId: role === 'admin' ? '__admin__' : meta.unitId!,
    role: role as 'admin' | 'orientador',
  }
}

/**
 * Exige que o usuário autenticado seja admin. Reusa toda a resolução de
 * role/unit do getUnitContext. Throws Unauthorized/ForbiddenError.
 */
export async function requireAdmin(): Promise<UnitContext> {
  const ctx = await getUnitContext()
  if (ctx.role !== 'admin') {
    throw new ForbiddenError('Apenas administradores podem executar esta ação')
  }
  return ctx
}

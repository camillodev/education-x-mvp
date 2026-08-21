import { NextResponse } from 'next/server'
import { requireAdmin, getUnitContext, UnauthorizedError, ForbiddenError, type UnitContext } from '@/lib/auth/unit-context'
import { handleError } from '@/lib/errors/handle'

function authErrorResponse(err: unknown, route: string): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json(
      { error: 'Você não tem permissão para esta ação.', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }
  const h = handleError(err, { route })
  return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
}

/**
 * Guard compartilhado para rotas admin-only.
 * Retorna null se o usuário é admin; caso contrário retorna a NextResponse de erro (401/403/500).
 */
export async function guardAdmin(route: string): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
    return authErrorResponse(err, route)
  }
}

/**
 * Guard compartilhado para rotas orientador-only (painel da escola).
 * Retorna o UnitContext se o usuário é orientador; caso contrário a NextResponse de erro (401/403/500).
 */
export async function guardOrientador(route: string): Promise<UnitContext | NextResponse> {
  try {
    const ctx = await getUnitContext()
    if (ctx.role !== 'orientador') {
      return NextResponse.json(
        { error: 'Apenas a escola pode executar esta ação.', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    return ctx
  } catch (err) {
    return authErrorResponse(err, route)
  }
}

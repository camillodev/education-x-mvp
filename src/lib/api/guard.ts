import { NextResponse } from 'next/server'
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/auth/unit-context'
import { handleError } from '@/lib/errors/handle'

/**
 * Guard compartilhado para rotas admin-only.
 * Retorna null se o usuário é admin; caso contrário retorna a NextResponse de erro (401/403/500).
 */
export async function guardAdmin(route: string): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
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
}

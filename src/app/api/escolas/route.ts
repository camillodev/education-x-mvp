import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/auth/unit-context'
import { handleError } from '@/lib/errors/handle'

// Admin-only. Usa prisma cru (NÃO forUnit): o admin tem unitId='__admin__' e
// forUnit filtraria a lista pra vazio.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Você não tem permissão para ver as escolas.', code: 'FORBIDDEN' }, { status: 403 })
    }
    const h = handleError(err, { route: 'GET /api/escolas' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }

  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, cnpj: true, city: true, state: true,
        status: true, createdAt: true,
        _count: { select: { subjects: true } },
      },
    })
    const list = units.map((u) => ({
      id: u.id, name: u.name, cnpj: u.cnpj, city: u.city, state: u.state,
      status: u.status, createdAt: u.createdAt, subjectCount: u._count.subjects,
    }))
    return NextResponse.json(list, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'GET /api/escolas' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

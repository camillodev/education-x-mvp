import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse } from '@/lib/errors/handle'
import { guardAdmin } from '@/lib/api/guard'

// Admin-only. Usa prisma cru (NÃO forUnit): o admin tem unitId='__admin__' e
// forUnit filtraria a lista pra vazio.
export async function GET(req: NextRequest) {
  const denied = await guardAdmin('GET /api/escolas')
  if (denied) return denied

  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, cnpj: true, city: true, state: true,
        status: true, createdAt: true, franchiseParent: true,
        _count: { select: { subjects: true } },
      },
    })
    const list = units.map((u) => ({
      id: u.id, name: u.name, cnpj: u.cnpj, city: u.city, state: u.state,
      status: u.status, createdAt: u.createdAt, franchiseParent: u.franchiseParent, subjectCount: u._count.subjects,
    }))
    return NextResponse.json(list, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/escolas', exposeDetail: true })
  }
}

import { NextResponse } from 'next/server'
import { listPendingEnrollments } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'

export async function GET() {
  const ctx = await guardOrientador('GET /api/matriculas/pendentes')
  if (ctx instanceof NextResponse) return ctx

  try {
    const list = await listPendingEnrollments(ctx.unitId)
    return NextResponse.json(list, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/matriculas/pendentes' })
  }
}

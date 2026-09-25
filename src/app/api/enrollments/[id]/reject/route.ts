import { NextResponse } from 'next/server'
import { rejectEnrollment } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardAdvisor } from '@/lib/api/guard'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await guardAdvisor('POST /api/enrollments/[id]/reject')
  if (ctx instanceof NextResponse) return ctx

  const { id: guardianId } = await params

  try {
    await rejectEnrollment(ctx.unitId, guardianId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/reject', unitId: ctx.unitId })
  }
}

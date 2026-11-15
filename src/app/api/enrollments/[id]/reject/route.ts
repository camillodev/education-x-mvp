import { NextResponse } from 'next/server'
import { rejectEnrollment } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSchoolAdmin()
    const { id: guardianId } = await params

    await rejectEnrollment(ctx.unitId, guardianId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/reject' })
  }
}

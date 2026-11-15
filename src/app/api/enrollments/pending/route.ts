import { NextResponse } from 'next/server'
import { listPendingEnrollments } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'

export async function GET() {
  let unitId: string | undefined
  try {
    const ctx = await requireSchoolAdmin()
    unitId = ctx.unitId
    const list = await listPendingEnrollments(ctx.unitId)
    return NextResponse.json(list, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/enrollments/pending', unitId })
  }
}

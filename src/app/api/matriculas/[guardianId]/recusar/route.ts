import { NextResponse } from 'next/server'
import { rejectEnrollment } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ guardianId: string }> }
) {
  const ctx = await guardOrientador('POST /api/matriculas/[guardianId]/recusar')
  if (ctx instanceof NextResponse) return ctx

  const { guardianId } = await params

  try {
    await rejectEnrollment(ctx.unitId, guardianId)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/matriculas/[guardianId]/recusar', unitId: ctx.unitId })
  }
}

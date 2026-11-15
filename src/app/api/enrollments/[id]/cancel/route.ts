import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { cancelActiveEnrollment } from '@/lib/services/subscription.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSchoolAdmin()
    const { id: enrollmentId } = await params

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    const asaasApiKey = unit?.asaasApiKeyEnc ? await decrypt(unit.asaasApiKeyEnc) : ''

    await cancelActiveEnrollment(ctx.unitId, enrollmentId, asaasApiKey)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/cancel' })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { cancelActiveEnrollment } from '@/lib/services/subscription.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardAdvisor } from '@/lib/api/guard'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await guardAdvisor('POST /api/enrollments/[id]/cancel')
  if (ctx instanceof NextResponse) return ctx

  const { id: enrollmentId } = await params

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    const asaasApiKey = unit?.asaasApiKeyEnc ? await decrypt(unit.asaasApiKeyEnc) : ''

    await cancelActiveEnrollment(ctx.unitId, enrollmentId, asaasApiKey)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/cancel', unitId: ctx.unitId })
  }
}

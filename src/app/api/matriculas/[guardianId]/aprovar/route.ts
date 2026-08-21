import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { approveEnrollment } from '@/lib/services/approval.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ guardianId: string }> }
) {
  const ctx = await guardOrientador('POST /api/matriculas/[guardianId]/aprovar')
  if (ctx instanceof NextResponse) return ctx

  const { guardianId } = await params

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    const asaasApiKey = unit?.asaasApiKeyEnc ? await decrypt(unit.asaasApiKeyEnc) : ''

    await approveEnrollment(ctx.unitId, guardianId, asaasApiKey)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/matriculas/[guardianId]/aprovar', unitId: ctx.unitId })
  }
}

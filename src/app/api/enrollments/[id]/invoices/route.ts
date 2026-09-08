import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { emitInvoice, MissingAsaasKeyError } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'
import { EmitInvoiceBodySchema } from '@/lib/validations/billing'
import { currentReferenceMonth } from '@/lib/reference-month'

// RN-17 — emissão avulsa: mesmo emitInvoice usado pelo cron, idempotente por mês.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await guardOrientador('POST /api/enrollments/[id]/invoices')
  if (ctx instanceof NextResponse) return ctx

  const { id: enrollmentId } = await params

  try {
    const rawBody = await req.json().catch(() => ({}))
    const { referenceMonth = currentReferenceMonth() } = EmitInvoiceBodySchema.parse(rawBody)

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    if (!unit?.asaasApiKeyEnc) throw new MissingAsaasKeyError()
    const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)

    const invoice = await emitInvoice(ctx.unitId, enrollmentId, referenceMonth, asaasApiKey)
    return NextResponse.json({ invoice }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/invoices', unitId: ctx.unitId })
  }
}

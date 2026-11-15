import { NextResponse } from 'next/server'
import { emitInvoice, resolveUnitAsaasKey } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'
import { EmitInvoiceBodySchema } from '@/lib/validations/billing'
import { currentReferenceMonth } from '@/lib/reference-month'

// RN-17 — emissão avulsa: mesmo emitInvoice usado pelo cron, idempotente por mês.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let unitId: string | undefined
  try {
    const ctx = await requireSchoolAdmin()
    unitId = ctx.unitId
    const { id: enrollmentId } = await params

    const rawBody = await req.json().catch(() => ({}))
    const { referenceMonth = currentReferenceMonth() } = EmitInvoiceBodySchema.parse(rawBody)

    const asaasApiKey = await resolveUnitAsaasKey(ctx.unitId)
    const invoice = await emitInvoice(ctx.unitId, enrollmentId, referenceMonth, asaasApiKey)
    return NextResponse.json({ invoice }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/enrollments/[id]/invoices', unitId })
  }
}

import { NextResponse } from 'next/server'
import { emitBatchInvoices, resolveUnitAsaasKey } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'
import { EmitBatchBodySchema } from '@/lib/validations/billing'
import { currentReferenceMonth } from '@/lib/reference-month'

// RN-18 — emissão em lote por matéria: mesma idempotência de emitInvoice,
// resposta agrega { emitted, skipped, errors }.
export async function POST(req: Request) {
  let unitId: string | undefined
  try {
    const ctx = await requireSchoolAdmin()
    unitId = ctx.unitId
    const rawBody = await req.json().catch(() => ({}))
    const { subjectId, referenceMonth = currentReferenceMonth() } = EmitBatchBodySchema.parse(rawBody)

    const asaasApiKey = await resolveUnitAsaasKey(ctx.unitId)
    const result = await emitBatchInvoices(ctx.unitId, subjectId, referenceMonth, asaasApiKey)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/billing/batch', unitId })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { emitBatchInvoices, MissingAsaasKeyError } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'
import { EmitBatchBodySchema } from '@/lib/validations/billing'
import { currentReferenceMonth } from '@/lib/reference-month'

// RN-18/RN-19 — emissão em lote por matéria: mesma idempotência/BLOCKED de emitInvoice,
// resposta agrega { emitted, skipped, blocked, errors }.
export async function POST(req: Request) {
  const ctx = await guardOrientador('POST /api/billing/batch')
  if (ctx instanceof NextResponse) return ctx

  try {
    const rawBody = await req.json().catch(() => ({}))
    const { subjectId, referenceMonth = currentReferenceMonth() } = EmitBatchBodySchema.parse(rawBody)

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    if (!unit?.asaasApiKeyEnc) throw new MissingAsaasKeyError()
    const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)

    const result = await emitBatchInvoices(ctx.unitId, subjectId, referenceMonth, asaasApiKey)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/billing/batch', unitId: ctx.unitId })
  }
}

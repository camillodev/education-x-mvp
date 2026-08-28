import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { emitBatchInvoices } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'
import { EmitBatchBodySchema } from '@/lib/validations/billing'

function currentReferenceMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

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
    const asaasApiKey = unit?.asaasApiKeyEnc ? await decrypt(unit.asaasApiKeyEnc) : ''

    const result = await emitBatchInvoices(ctx.unitId, subjectId, referenceMonth, asaasApiKey)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/billing/batch', unitId: ctx.unitId })
  }
}

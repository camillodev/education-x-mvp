import { NextResponse } from 'next/server'
import { prisma, forUnit } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { emitInvoice, MissingAsaasKeyError } from '@/lib/services/billing.service'
import { InvoiceNotFoundError } from '@/lib/services/invoice-detail.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'

type RouteCtx = { params: Promise<{ id: string }> }

// EDU-28 — botão "Reemitir" no detalhe: reusa emitInvoice, que já re-tenta Invoice ERROR (RN-13).
export async function POST(_req: Request, { params }: RouteCtx) {
  const ctx = await guardOrientador('POST /api/invoices/[id]/retry')
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params

  try {
    const existing = await forUnit(ctx.unitId).invoice.findUnique({ where: { id } })
    if (!existing) throw new InvoiceNotFoundError()

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    if (!unit?.asaasApiKeyEnc) throw new MissingAsaasKeyError()
    const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)

    const invoice = await emitInvoice(ctx.unitId, existing.enrollmentId, existing.referenceMonth, asaasApiKey)
    return NextResponse.json({ invoice }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/invoices/[id]/retry', unitId: ctx.unitId })
  }
}

import { NextResponse } from 'next/server'
import { prisma, forUnit } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getAsaasClient } from '@/lib/integration/asaas/client'
import { MissingAsaasKeyError } from '@/lib/services/billing.service'
import { InvoiceNotFoundError } from '@/lib/services/invoice-detail.service'
import { errorResponse } from '@/lib/errors/handle'
import { guardOrientador } from '@/lib/api/guard'

type RouteCtx = { params: Promise<{ id: string }> }

// EDU-28 — QR PIX é lazy (I/O de terceiro não cacheável): só busca quando a pessoa pede pra pagar por PIX.
export async function GET(_req: Request, { params }: RouteCtx) {
  const ctx = await guardOrientador('GET /api/invoices/[id]/pix')
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params

  try {
    const invoice = await forUnit(ctx.unitId).invoice.findUnique({ where: { id } })
    if (!invoice?.asaasPaymentId) throw new InvoiceNotFoundError()

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    if (!unit?.asaasApiKeyEnc) throw new MissingAsaasKeyError()
    const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)

    const client = getAsaasClient(asaasApiKey)
    const pix = await client.getPixQrCode(invoice.asaasPaymentId)
    return NextResponse.json({ pix }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/invoices/[id]/pix', unitId: ctx.unitId })
  }
}

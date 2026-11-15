import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getInvoiceDetail, cancelInvoice, InvoiceNotFoundError } from '@/lib/services/invoice-detail.service'
import { MissingAsaasKeyError } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireSchoolAdmin()
    const { id } = await params

    const invoice = await getInvoiceDetail(ctx.unitId, id)
    if (!invoice) throw new InvoiceNotFoundError()
    return NextResponse.json({ invoice }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/invoices/[id]' })
  }
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireSchoolAdmin()
    const { id } = await params

    const unit = await prisma.unit.findUnique({
      where: { id: ctx.unitId },
      select: { asaasApiKeyEnc: true },
    })
    if (!unit?.asaasApiKeyEnc) throw new MissingAsaasKeyError()
    const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)

    const invoice = await cancelInvoice(ctx.unitId, id, asaasApiKey)
    return NextResponse.json({ invoice }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'DELETE /api/invoices/[id]' })
  }
}

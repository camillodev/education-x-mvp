import { NextResponse } from 'next/server'
import { listInvoices } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { requireSchoolAdmin } from '@/lib/auth/unit-context'
import { ListInvoicesQuerySchema } from '@/lib/validations/billing'

// EDU-27 — US-F2-06: lista de cobranças da Unit, com paginação e filtros de status/mês.
export async function GET(req: Request) {
  try {
    const ctx = await requireSchoolAdmin()
    const { searchParams } = new URL(req.url)
    const filters = ListInvoicesQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      referenceMonth: searchParams.get('referenceMonth') ?? undefined,
    })

    const result = await listInvoices(ctx.unitId, filters)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/invoices' })
  }
}

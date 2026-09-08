import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateSchool } from '@/lib/services/onboarding.service'
import { UpdateSchoolSchema } from '@/lib/validations/unit'
import { errorResponse } from '@/lib/errors/handle'
import { guardAdmin } from '@/lib/api/guard'
import { toSafeUnit, toSafeBillingConfig } from '@/lib/serializers/unit'

type RouteCtx = { params: Promise<{ unitId: string }> }

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin('GET /api/escolas/[unitId]')
  if (denied) return denied
  const { unitId } = await params

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { billingConfig: true, subjects: { orderBy: { createdAt: 'asc' } } },
    })
    if (!unit) {
      return NextResponse.json({ error: 'Escola não encontrada.', code: 'NOT_FOUND' }, { status: 404 })
    }
    const safe = toSafeUnit(unit as unknown as Record<string, unknown>)
    const payload =
      safe.billingConfig != null
        ? { ...safe, billingConfig: toSafeBillingConfig(safe.billingConfig as Record<string, unknown>) }
        : safe
    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/escolas/[unitId]', unitId, exposeDetail: true })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin('PATCH /api/escolas/[unitId]')
  if (denied) return denied
  const { unitId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.', code: 'INVALID_BODY' }, { status: 400 })
  }

  const parsed = UpdateSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos. Confira os campos destacados.', code: 'VALIDATION', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const updated = await updateSchool(unitId, parsed.data)
    return NextResponse.json(toSafeUnit(updated as unknown as Record<string, unknown>), { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'PATCH /api/escolas/[unitId]', unitId, exposeDetail: true })
  }
}

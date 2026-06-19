import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/auth/unit-context'
import { updateSchool } from '@/lib/services/onboarding.service'
import { UpdateSchoolSchema } from '@/lib/validations/unit'
import { handleError } from '@/lib/errors/handle'

type RouteCtx = { params: Promise<{ unitId: string }> }

async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Você não tem permissão para esta ação.', code: 'FORBIDDEN' }, { status: 403 })
    }
    const h = handleError(err, { route: 'auth /api/escolas/[unitId]' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin()
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
    // Nunca expor PII criptografada no payload.
    const { responsibleCpfEnc: _omit, asaasApiKeyEnc: _omit2, ...safe } = unit
    return NextResponse.json(safe, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'GET /api/escolas/[unitId]', unitId })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin()
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
    return NextResponse.json(updated, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'PATCH /api/escolas/[unitId]', unitId })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

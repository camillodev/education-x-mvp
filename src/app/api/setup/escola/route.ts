import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  createSchool,
  DuplicateCnpjError,
  AsaasProvisionError,
  InvalidPlanError,
} from '@/lib/services/onboarding.service'
import { CreateSchoolSchema } from '@/lib/validations/unit'
import {
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth/unit-context'

export async function POST(req: NextRequest) {
  // RBAC: apenas admin pode criar escolas.
  // requireAdmin() resolve o role via custom session claim (fallback currentUser),
  // e respeita o dev bypass (DISABLE_CLERK=true fora de prod) internamente.
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { error: 'Você não tem permissão para cadastrar escolas.', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
    console.error('[POST /api/setup/escola] Auth error:', err)
    return NextResponse.json(
      { error: 'Falha na autenticação.', code: 'AUTH_ERROR' },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido.', code: 'INVALID_BODY' },
      { status: 400 }
    )
  }

  // Validar schema
  const parsed = CreateSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos. Confira os campos destacados.',
        code: 'VALIDATION',
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  // Base URL para montar o link de confirmação enviado por e-mail
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  try {
    const unit = await createSchool(parsed.data, baseUrl)
    return NextResponse.json(unit, { status: 201 })
  } catch (err) {
    if (err instanceof DuplicateCnpjError) {
      return NextResponse.json(
        { error: err.message, code: 'DUPLICATE_CNPJ' },
        { status: 409 }
      )
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos.', code: 'VALIDATION', issues: err.flatten() },
        { status: 400 }
      )
    }
    if (err instanceof InvalidPlanError) {
      return NextResponse.json(
        { error: err.message, code: 'INVALID_PLAN' },
        { status: 400 }
      )
    }
    if (err instanceof AsaasProvisionError) {
      console.error('[POST /api/setup/escola] Asaas error:', err)
      return NextResponse.json(
        { error: 'Falha ao provisionar subconta de pagamento.', code: 'ASAAS_PROVISION' },
        { status: 502 }
      )
    }
    console.error('[POST /api/setup/escola] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Erro inesperado ao cadastrar escola.', code: 'INTERNAL' },
      { status: 500 }
    )
  }
}

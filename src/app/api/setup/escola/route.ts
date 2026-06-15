import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'
import {
  createSchool,
  DuplicateCnpjError,
  AsaasProvisionError,
} from '@/lib/services/onboarding.service'
import { CreateSchoolSchema } from '@/lib/validations/unit'

export async function POST(req: NextRequest) {
  // RBAC: apenas admin_ix pode criar escolas
  const { sessionClaims } = await auth()
  const meta = sessionClaims?.publicMetadata as { role?: string } | undefined
  if (meta?.role !== 'admin_ix') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Validar schema
  const parsed = CreateSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Base URL para montar o link de confirmação enviado por e-mail
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  try {
    const unit = await createSchool(parsed.data, baseUrl)
    return NextResponse.json(unit, { status: 201 })
  } catch (err) {
    if (err instanceof DuplicateCnpjError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', issues: err.flatten() }, { status: 400 })
    }
    if (err instanceof AsaasProvisionError) {
      console.error('[POST /api/setup/escola] Asaas error:', err)
      return NextResponse.json({ error: 'Falha ao provisionar subconta Asaas' }, { status: 502 })
    }
    console.error('[POST /api/setup/escola] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

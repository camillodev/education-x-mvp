import { NextRequest, NextResponse } from 'next/server'
import {
  confirmSchool,
  InvalidConfirmationTokenError,
  AlreadyConfirmedError,
  NoTermsVersionError,
} from '@/lib/services/onboarding.service'

// Public route (no Clerk auth) — the token in the URL proves the recipient.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'

  try {
    await confirmSchool(token, ip)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    if (err instanceof InvalidConfirmationTokenError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof AlreadyConfirmedError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof NoTermsVersionError) {
      console.error('[POST /api/confirmar] Terms não seedados:', err)
      return NextResponse.json(
        { error: 'Configuração pendente. Tente novamente em instantes.' },
        { status: 503 }
      )
    }
    console.error('[POST /api/confirmar] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

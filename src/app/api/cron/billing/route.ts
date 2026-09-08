import { NextResponse } from 'next/server'
import { emitDueInvoicesForActiveUnits } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { timingSafeBearerEqual } from '@/lib/auth/timing-safe'
import { currentReferenceMonth } from '@/lib/reference-month'

// Cron diário (Vercel Cron, vercel.json roda "0 11 * * *"). Seleção de Units elegíveis e
// orquestração por RN-13 vivem em emitDueInvoicesForActiveUnits (billing.service.ts) — a
// rota só autentica e delega (achado de code review: lógica de negócio não pertence aqui).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[GET /api/cron/billing] CRON_SECRET ausente na env')
    return NextResponse.json({ error: 'CRON_SECRET não configurado.', code: 'CONFIG_MISSING' }, { status: 500 })
  }

  if (!timingSafeBearerEqual(req.headers.get('Authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const referenceMonth = currentReferenceMonth()

  try {
    const results = await emitDueInvoicesForActiveUnits(referenceMonth)
    return NextResponse.json({ referenceMonth, results }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/cron/billing' })
  }
}

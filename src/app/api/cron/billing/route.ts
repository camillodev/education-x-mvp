import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { emitUnitInvoices } from '@/lib/services/billing.service'
import { errorResponse } from '@/lib/errors/handle'
import { timingSafeBearerEqual } from '@/lib/auth/timing-safe'
import { currentReferenceMonth } from '@/lib/reference-month'

type UnitResult =
  | { unitId: string; ok: true; emitted: number; skipped: number; blocked: number; errors: number }
  | { unitId: string; ok: false; error: string }

// Cron diário (Vercel Cron, vercel.json roda "0 11 * * *"). Cada Unit só é processada quando
// o dia corrente já alcançou o closingDay da própria régua — isso é o que dá o retry de
// D+1/D+2 de uma Invoice ERROR (RN-13): o cron passa todo dia pela mesma Unit depois do
// closingDay, e emitUnitInvoices → emitInvoice já sabe reaproveitar/re-tentar o que ficou ERROR.
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
  const results: UnitResult[] = []

  try {
    const units = await prisma.unit.findMany({
      where: { status: 'ACTIVE', billingConfig: { autoBilling: true } },
      select: { id: true, asaasApiKeyEnc: true, billingConfig: { select: { closingDay: true } } },
    })

    const today = new Date().getUTCDate()

    for (const unit of units) {
      if (!unit.billingConfig) continue
      if (today < unit.billingConfig.closingDay) continue

      if (!unit.asaasApiKeyEnc) {
        results.push({ unitId: unit.id, ok: false, error: 'sem asaasApiKeyEnc' })
        continue
      }

      try {
        const asaasApiKey = await decrypt(unit.asaasApiKeyEnc)
        const r = await emitUnitInvoices(unit.id, referenceMonth, asaasApiKey)
        results.push({ unitId: unit.id, ok: true, emitted: r.emitted, skipped: r.skipped, blocked: r.blocked, errors: r.errors })
      } catch (err) {
        console.error(`[GET /api/cron/billing] unit=${unit.id}`, err)
        results.push({ unitId: unit.id, ok: false, error: err instanceof Error ? err.message : 'erro desconhecido' })
      }
    }

    return NextResponse.json({ referenceMonth, results }, { status: 200 })
  } catch (err) {
    return errorResponse(err, { route: 'GET /api/cron/billing' })
  }
}

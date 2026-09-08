import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { processPaymentEvent } from '@/lib/services/webhook.service'
import { timingSafeStringEqual } from '@/lib/auth/timing-safe'
import { ASAAS_PAYMENT_STATUSES } from '@/lib/integration/asaas/types'

// Webhook público da Asaas — sem sessão Clerk (rota registrada em src/middleware.ts).
// Autenticado por header `asaas-access-token` (token cru, sem "Bearer "), comparado contra
// ASAAS_WEBHOOK_TOKEN em tempo constante. Nunca cachear (regra .claude/rules/infra.md).
export const dynamic = 'force-dynamic'

// `status` é derivado de src/lib/integration/asaas/types.ts (fonte única dos enums Asaas) para
// não duplicar a lista manualmente. `billingType` fica solto (z.string()) de propósito: o
// service não lê esse campo, e a Asaas avisa na própria doc que pode adicionar valores novos —
// um enum estrito aqui rejeitaria (200 handled:false, sem log) um pagamento real só por um
// billingType desconhecido que nem é usado.
const asaasWebhookPayloadSchema = z.object({
  id: z.string(),
  event: z.string(),
  dateCreated: z.string().optional(),
  payment: z.object({
    id: z.string(),
    status: z.enum(ASAAS_PAYMENT_STATUSES),
    value: z.number(),
    paymentDate: z.string().optional(),
    clientPaymentDate: z.string().optional(),
    externalReference: z.string().optional(),
    billingType: z.string(),
  }),
})

export async function POST(req: NextRequest) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  if (!webhookToken) {
    // Detalhe da causa (env var ausente) só no log do servidor — a resposta ao chamador não
    // autenticado é genérica, para não criar um oráculo de estado (500 = env ausente vs
    // 401 = token errado) nem nomear configuração interna (achado de security review, EDU-26).
    console.error('[POST /api/webhook] ASAAS_WEBHOOK_TOKEN ausente na env')
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }

  if (!timingSafeStringEqual(req.headers.get('asaas-access-token'), webhookToken)) {
    return NextResponse.json({ error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Payload malformado (JSON inválido ou shape inesperado) nunca pode resultar em 5xx — a
  // Asaas reenvia em loop e pausa a fila de webhooks após 15 falhas consecutivas. Erro real de
  // infraestrutura (processPaymentEvent lançando) é diferente e deve propagar como 500 para
  // permitir reentrega.
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ received: true, handled: false }, { status: 200 })
  }

  const parsed = asaasWebhookPayloadSchema.safeParse(rawBody)
  if (!parsed.success) {
    // Log só com o id do evento (se presente no body malformado) e a lista de campos que
    // falharam — nunca o payload inteiro (PII de responsável/aluno pode estar em campos que
    // nem chegamos a mapear). Sem isso, um evento real descartado por payload inesperado
    // (ex.: Asaas adicionando campo novo obrigatório) é invisível — 200 pro Asaas, silêncio
    // pro nosso lado, dinheiro recebido nunca reconciliado.
    const rawId =
      typeof rawBody === 'object' && rawBody !== null && 'id' in rawBody
        ? String((rawBody as Record<string, unknown>).id)
        : 'desconhecido'
    console.error(
      `[POST /api/webhook] payload rejeitado pela validação — eventId=${rawId}`,
      parsed.error.flatten().fieldErrors
    )
    return NextResponse.json({ received: true, handled: false }, { status: 200 })
  }

  const result = await processPaymentEvent(parsed.data)

  return NextResponse.json({ received: true, handled: result.handled }, { status: 200 })
}

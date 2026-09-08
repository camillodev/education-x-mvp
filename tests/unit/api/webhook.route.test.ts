import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock factory-only — webhook.service.ts importa @/lib/db e @prisma/client no escopo do
// módulo; importActual (estilo setup-escola) carregaria isso de verdade. Sem mock de prisma
// necessário aqui, só o service.
const processPaymentEvent = vi.fn()
vi.mock('@/lib/services/webhook.service', () => ({
  processPaymentEvent: (...a: unknown[]) => processPaymentEvent(...a),
}))

import * as route from '@/app/api/webhook/route'

const ENV_KEY = 'ASAAS_WEBHOOK_TOKEN'
const FAKE_WEBHOOK_SECRET = 'test-webhook-fake-value'

const validPayload = {
  id: 'evt_123',
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_123',
    status: 'RECEIVED',
    value: 350,
    billingType: 'PIX',
  },
}

function postRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://app.educationx.com/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const ORIGINAL_ENV = process.env[ENV_KEY]

beforeEach(() => {
  processPaymentEvent.mockReset()
  process.env[ENV_KEY] = FAKE_WEBHOOK_SECRET
})

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env[ENV_KEY]
  else process.env[ENV_KEY] = ORIGINAL_ENV
})

describe('POST /api/webhook — auth', () => {
  it('sem header asaas-access-token → 401, processPaymentEvent nunca chamado', async () => {
    const res = await route.POST(postRequest(validPayload))

    expect(res.status).toBe(401)
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })

  it('header asaas-access-token incorreto → 401, processPaymentEvent nunca chamado', async () => {
    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': 'token-errado' })
    )

    expect(res.status).toBe(401)
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })

  // Teste crítico: token correto enviado CRU (sem "Bearer "), como o Asaas realmente envia.
  // Se a implementação usar timingSafeBearerEqual por engano (exige prefixo "Bearer "), este
  // teste falha porque a comparação rejeitaria o token cru — sinal de que a função errada foi
  // usada. Por isso assertamos delegação + handled, não só status 200 (payload malformado
  // também retorna 200, então status sozinho não discrimina o bug).
  it('token correto CRU (sem prefixo Bearer) em asaas-access-token → 200 e delega ao service', async () => {
    processPaymentEvent.mockResolvedValue({ handled: true })

    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(processPaymentEvent).toHaveBeenCalledOnce()
    expect(json.handled).toBe(true)
  })

  // O valor de ENV_KEY precisa ser lido DENTRO do handler (não capturado no escopo do módulo)
  // — só assim a mutação de process.env no beforeEach tem efeito. Cobre ausente (delete) e
  // vazia ('') como casos distintos, ambos devem ser 500 (nunca 200 sem token configurado).
  // Nota: timingSafeStringEqual(a, '') já retorna false por si só (b vazio) — se a implementação
  // pular o guard explícito de env ausente/vazia, o resultado observado seria 401, não 500.
  // Por isso a assertion é toBe(500) exato, não apenas "not 200".
  it('env do token ausente (delete) → 500, processPaymentEvent nunca chamado', async () => {
    delete process.env[ENV_KEY]

    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': 'qualquer-coisa' })
    )

    expect(res.status).toBe(500)
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })

  it('env do token vazia ("") → 500, processPaymentEvent nunca chamado', async () => {
    process.env[ENV_KEY] = ''

    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': 'qualquer-coisa' })
    )

    expect(res.status).toBe(500)
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhook — body malformado (nunca 500, Asaas reenvia até pausar fila)', () => {
  it('JSON inválido no body → 200 com { received: true, handled: false }, service não chamado', async () => {
    const res = await route.POST(
      postRequest('not json{', { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ received: true, handled: false })
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })

  it('JSON válido mas faltando campo obrigatório (payment.id) → 200 com handled:false, service não chamado', async () => {
    const { payment, ...rest } = validPayload
    const { id: _omit, ...paymentWithoutId } = payment
    const invalidPayload = { ...rest, payment: paymentWithoutId }

    const res = await route.POST(
      postRequest(invalidPayload, { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ received: true, handled: false })
    expect(processPaymentEvent).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhook — billingType desconhecido não é motivo de rejeição', () => {
  // Achado de code review (EDU-26, item 3): billingType é solto (z.string()) de propósito — o
  // service não lê esse campo, e a Asaas pode adicionar valores novos sem aviso. Um enum
  // estrito rejeitaria (200 handled:false, silenciosamente) um pagamento real só por causa de
  // um billingType desconhecido que nunca é usado. Este teste fixa esse comportamento.
  it('payload com billingType desconhecido (não PIX/BOLETO/CREDIT_CARD/UNDEFINED) ainda é validado e delegado ao service', async () => {
    processPaymentEvent.mockResolvedValue({ handled: true })
    const payloadComBillingTypeNovo = {
      ...validPayload,
      payment: { ...validPayload.payment, billingType: 'CRYPTO_FUTURO' },
    }

    const res = await route.POST(
      postRequest(payloadComBillingTypeNovo, { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ received: true, handled: true })
    expect(processPaymentEvent).toHaveBeenCalledWith(payloadComBillingTypeNovo)
  })
})

describe('POST /api/webhook — delegação ao service', () => {
  it('payload válido, processPaymentEvent resolve handled:true → 200 com { received: true, handled: true }', async () => {
    processPaymentEvent.mockResolvedValue({ handled: true })

    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ received: true, handled: true })
    expect(processPaymentEvent).toHaveBeenCalledWith(validPayload)
  })

  it('payload válido, processPaymentEvent resolve handled:false (evento desconhecido) → ainda 200, não erro', async () => {
    processPaymentEvent.mockResolvedValue({ handled: false })

    const res = await route.POST(
      postRequest(validPayload, { 'asaas-access-token': FAKE_WEBHOOK_SECRET })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ received: true, handled: false })
  })

  // Achado de code review (EDU-26, item 4): diferente de payload malformado (sempre 200, pra
  // não fazer o Asaas reenviar em loop), um erro REAL de infraestrutura dentro do service
  // (banco fora do ar, etc.) precisa propagar como 500 — é o único jeito do Asaas saber que
  // deve reentregar. Um try/catch adicionado por engano ao redor da chamada converteria isso
  // em 200 silencioso sem quebrar nenhum outro teste; este fixa o comportamento esperado.
  it('processPaymentEvent lança erro real (ex: banco fora do ar) → propaga, NÃO vira 200 silencioso', async () => {
    processPaymentEvent.mockRejectedValue(new Error('conexão com banco falhou'))

    await expect(
      route.POST(postRequest(validPayload, { 'asaas-access-token': FAKE_WEBHOOK_SECRET }))
    ).rejects.toThrow('conexão com banco falhou')
  })
})

describe('POST /api/webhook — config da rota', () => {
  it('exporta dynamic = "force-dynamic"', () => {
    expect(route.dynamic).toBe('force-dynamic')
  })
})

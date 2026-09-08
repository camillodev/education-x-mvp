# Asaas — Contrato do webhook de eventos de pagamento

> Confirmado via MCP `asaas` (docs.asaas.com/mcp) em 03/set/2026 contra a documentação oficial: `webhook-para-cobrancas`, `como-implementar-idempotencia-em-webhooks`, `receba-eventos-do-asaas-no-seu-endpoint-de-webhook`. Payload de exemplo é o mesmo publicado na doc oficial, não inventado.

## Envelope do evento

Cada notificação chega via `POST` para a URL cadastrada, com o `id` do **evento** (não do payment) e o objeto `payment` relacionado:

```json
{
  "id": "evt_05b708f961d739ea7eba7e4db318f621&368604920",
  "event": "PAYMENT_RECEIVED",
  "dateCreated": "2024-06-12 16:45:03",
  "account": { "id": "47ed0d25-f9fb-4b35-b23a-d8895caf92b7", "ownerId": null },
  "payment": {
    "object": "payment",
    "id": "pay_080225913252",
    "customer": "cus_G7Dvo4iphUNk",
    "value": 100,
    "netValue": 94.51,
    "dueDate": "2021-01-01",
    "paymentDate": "2021-01-01",
    "clientPaymentDate": "2021-01-01",
    "status": "RECEIVED",
    "billingType": "CREDIT_CARD",
    "externalReference": "056984",
    "invoiceUrl": "https://www.asaas.com/i/080225913252",
    "bankSlipUrl": null,
    "...": "campos adicionais variam por billingType — ver doc oficial"
  }
}
```

**Campos que este projeto de fato consome** (`src/lib/integration/asaas/types.ts` → `AsaasWebhookPayload`):

| Campo | Uso |
|---|---|
| `id` | Chave de idempotência do **evento** — grava em `Payment.webhookEventId @unique`. Nunca usar `payment.id` pra isso (é o pagamento, não o evento; o mesmo `payment.id` recebe múltiplos eventos ao longo do ciclo). |
| `event` | Roteamento (`PAYMENT_RECEIVED` / `PAYMENT_OVERDUE`; qualquer outro → `handled: false`, não é erro). |
| `dateCreated` | Fallback de `paidAt` só quando `payment.paymentDate` está ausente. |
| `payment.id` | `= Invoice.asaasPaymentId` — chave primária de resolução da Invoice. |
| `payment.externalReference` | `= Invoice.idempotencyKey` (`enrollmentId:referenceMonth`) — fallback de resolução quando `asaasPaymentId` ainda não estava gravado na Invoice. |
| `payment.value` | **Em reais**, não centavos — convertido na borda (`Math.round(value * 100)`). |
| `payment.paymentDate` | Date-only (`"YYYY-MM-DD"`) — vira `paidAt` (UTC midnight). |
| `payment.status` | Gravado em `Payment.asaasStatus` (informativo, não usado em lógica de roteamento — quem decide é `event`, não `payment.status`). |

## Eventos tratados nesta versão (EDU-26)

| Evento | Efeito | Idempotência |
|---|---|---|
| `PAYMENT_RECEIVED` | `Invoice.status → PAID` (de qualquer status anterior — `PENDING`, `ERROR`, `OVERDUE`) + cria `Payment`. | `Payment.webhookEventId @unique`; reentrega do mesmo `id` reaplica o status (idempotente), não duplica `Payment`. |
| `PAYMENT_OVERDUE` | `Invoice.status → OVERDUE`, **só se ainda `PENDING`**. | Idempotente por natureza — não cria registro, reaplicar o mesmo status é no-op. Não rebaixa uma Invoice já `PAID` (reentrega fora de ordem não pode desfazer um pagamento reconciliado). |
| Qualquer outro | `200 { received: true, handled: false }`. Nunca 4xx/5xx (a Asaas reenvia em loop e pausa a fila após 15 falhas consecutivas). | N/A |

## Decisões fechadas (não re-discutir sem novo contexto)

- **`PAYMENT_RECEIVED`, não `PAYMENT_CONFIRMED`, dispara PAID** — único evento que cobre boleto, PIX e cartão de forma consistente (`CONFIRMED` existe só pra cartão/boleto, indicando "pago mas saldo ainda não disponível"; `RECEIVED` é "valor já na conta").
- **Rota `POST /api/webhook`** (singular, sem `/asaas`) — já cadastrada assim no painel Asaas.
- **Token global** via `ASAAS_WEBHOOK_TOKEN` (env var), header `asaas-access-token`, comparado via `timingSafeStringEqual` (token **cru**, sem prefixo `Bearer`). Não é por-Unit — `BillingConfig.asaasWebhookTokenEnc` existe no schema mas não é usado neste fluxo.
- **`unitId` nunca em query/param** — resolvido internamente a partir da `Invoice` encontrada (por `asaasPaymentId` ou `externalReference`), via client Prisma **base** (não `forUnit`), porque o `unitId` não é conhecido antes desse lookup.

## Não implementado nesta versão (fora de escopo do EDU-26)

`PAYMENT_DUNNING_REQUESTED`, `PAYMENT_DUNNING_RECEIVED`, chargeback, split, `PAYMENT_DELETED`/`PAYMENT_RESTORED` — ficam para F3 (negativação) e além, estendendo o mesmo roteador (`processPaymentEvent`) com novos `case`, conforme contrato já registrado em `.specs/mvp-03-cobranca-automatica.md` §5b'.

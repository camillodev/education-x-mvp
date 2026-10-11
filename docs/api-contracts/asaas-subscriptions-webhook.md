# Asaas — `PAYMENT_CREATED` de ciclos de subscription

> Fonte: documentação oficial (`faq-assinaturas`, `webhook-para-cobrancas`) e OpenAPI via MCP `asaas`, consultados em 10/out/2026. Envelope e campos comuns: ver `asaas-webhook-payment-events.md`.

## O que a doc oficial afirma

| Pergunta | Resposta |
|---|---|
| `PAYMENT_CREATED` dispara para cobrança gerada por subscription? | Sim. O evento carrega o campo `payment.subscription`. |
| Quando `payment.subscription` vem preenchido? | Só quando a cobrança pertence a uma assinatura. Cobrança avulsa não traz o campo. |
| `externalReference` serve de chave por ciclo? | Não. É fixo por subscription (herdado na criação); cada ciclo precisa de chave própria. |
| Chave de resolução do ciclo | `payment.id` (único por cobrança gerada). |
| Antecedência de geração | Por **conta** (40 dias padrão, 14 ou 7). Sem campo em `POST /subscriptions`. Onde configurar: a doc não diz. |
| Campo `account` na raiz | Identifica a conta emissora; candidato a checagem extra de tenant. |

## Campos consumidos pelo handler de `PAYMENT_CREATED`

| Campo | Uso |
|---|---|
| `id` | Idempotência do evento. |
| `account.id` | Não usado no alpha (ver decisão abaixo). |
| `payment.id` | `Invoice.asaasPaymentId` do ciclo. |
| `payment.subscription` | Resolve `Enrollment.asaasSubscriptionId`. Ausente → evento ignorado. |
| `payment.dueDate` | Deriva `referenceMonth` e `dueDate` da Invoice. |
| `payment.value` | Em reais; convertido para centavos na borda. |

## Decisão: campo `account`

Não é checado no alpha. O tenant vem da `Enrollment` resolvida por `asaasSubscriptionId` (único
global); `Unit.asaasAccountId` existe, mas a equivalência com `account.id` do payload não está
provada (precisa do payload real do sandbox, pendente abaixo) e um mismatch falso descartaria
eventos reais sem alarme. Reavaliar no EDU-126, quando o id da subconta passar a ser gravado no
onboarding.

## Idempotência

`Invoice.asaasPaymentId` é `@unique`. A chave de competência `enrollmentId:YYYY-MM` é a mesma
da emissão avulsa: se o mês já tem outra cobrança, o evento vira `handled:false` com log de IDs.

## Pendente (evidência real)

Capturar um payload real de `PAYMENT_CREATED` de um ciclo de subscription no sandbox e colar aqui,
sem PII. Depende do webhook sandbox cadastrado (URL pública + `ASAAS_WEBHOOK_TOKEN`) e da
localização da configuração de antecedência na conta.

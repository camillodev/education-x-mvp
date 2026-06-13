# Regras de Integração Asaas — Education X

Carrega ao tocar em `src/lib/integration/asaas/`, services de cobrança/pagamento.

## Cliente tipado
Toda chamada Asaas passa pelo **cliente tipado** (`interface + AsaasLiveClient + AsaasMockClient`, migrado de `education-x-new/src/lib/integration/asaas/`). Nunca `fetch` direto à Asaas.

## Sandbox primeiro (inegociável)
- Default **sandbox** (`https://sandbox.asaas.com/api/v3`).
- Produção **só com confirmação explícita do Rafa, por operação**.
- Confirmar antes de mover dinheiro real: emissão real, antecipação, transfer, estorno.

## Auth e valores
- Header `access_token: {apiKey}` (**NÃO** Bearer). Nunca logar/commitar o token.
- API key de subconta criptografada no banco (AES-256-GCM). Ver `security.md`.
- **A API Asaas usa REAIS, não centavos.** Conversão centavos→reais acontece **na borda do cliente**. O resto do app é centavos.

## Contratos antes do código
Descobrir os payloads reais via **MCP** (skill global `ix-asaas`) em sandbox, salvar em `docs/api-contracts/asaas-*.md`, **antes** de implementar o que depende.

Pendências a resolver na Fase 0:
- **CONFIRMED vs RECEIVED** — qual evento dispara o estado PAID interno
- `PAYMENT_DUNNING:WRITE` liberado na conta?
- Tokenização de cartão disponível?
- `transfer`/antecipação disponíveis na conta?

## Webhook
- Idempotente (skip de evento duplicado via `WebhookEvent`).
- Token no header `X-Asaas-Token` (não em query string).
- **Event bus**: handlers se registram (NFS-e, regularização); não editam o core do webhook.

Operações detalhadas: skill global `~/.claude/skills/ix-asaas`.

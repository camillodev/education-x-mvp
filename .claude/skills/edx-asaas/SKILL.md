---
name: edx-asaas
description: Integração Asaas do Education X — cliente tipado, criação de subconta, cobrança boleto/PIX/cartão, webhook, negativação. Auto-contida no repo (não depende de skill global). Use ao tocar em src/lib/integration/asaas/ ou services de cobrança/pagamento.
---

# Asaas — Education X (auto-contido no repo)

> Skill do projeto. NÃO depende de nenhuma skill global `~/.claude`. As fontes de verdade são internas ao repo: `.claude/rules/asaas.md`, `docs/api-contracts/asaas-*.md`, e o cliente tipado em `src/lib/integration/asaas/`. Para sintaxe/payloads novos da API Asaas, consultar `context7` ou docs.asaas.com ao vivo.

## Regra de ouro (de `.claude/rules/asaas.md`)
1. **Cliente tipado sempre.** Toda chamada Asaas passa por `src/lib/integration/asaas/` (interface + `AsaasLiveClient` + `AsaasMockClient`). Nunca `fetch` direto.
2. **Sandbox primeiro.** Default `https://sandbox.asaas.com/api/v3`. Produção só com confirmação explícita do Rafa, por operação.
3. **Auth:** header `access_token: {apiKey}` (NÃO Bearer). Nunca logar/commitar o token.
4. **Valores:** a API Asaas usa **REAIS**; o app usa **centavos**. Conversão centavos→reais acontece SÓ na borda do cliente. Em nenhum outro lugar.
5. **API key de subconta:** criptografada no banco (AES-256-GCM via `src/lib/crypto.ts`). Ver `.claude/rules/security.md`.

## Hierarquia de contas
```
Conta mestre IX (ASAAS_MASTER_API_KEY no .env.local)
  └── Subconta por Unit (criada no onboarding — Tarefa 1.2)
        ├── apiKey próprio (criptografado no banco)
        ├── walletId
        └── webhook token próprio (criptografado)
```

## Recursos verificados na conta sandbox (13/jun — todos HTTP 200)
Fonte: `docs/api-contracts/asaas-verificacao-conta.md`. Todos liberados:
- Subcontas (`GET/POST /accounts`) · Customers (`/customers`) · Cobranças (`/payments`)
- Negativação/dunning (`/paymentDunnings`) · Antecipação (`/anticipations`) · Transfer/saque (`/transfers`)
> Falta confirmar o POST (escrita) de cada na hora de implementar — o recurso está habilitado.

## Métodos do cliente tipado (já existem em `asaas-client.interface.ts`)
`createSubAccount` · `createCustomer` · `findCustomerByCpfCnpj` · `createPayment` · `getPayment` · `cancelPayment` · `listPayments` · `createInvoice` (NFS-e) · `getInvoice` · `createDunning` · `removeDunning` · `getDunning` · `updateNotificationSettings`

Para testar lógica sem rede: usar `AsaasMockClient`. Contract tests contra sandbox antes de produção.

## Fluxos por tarefa

### Onboarding (Tarefa 1.2) — criar subconta
1. `createSubAccount({ name, email, cpfCnpj, ... })` → recebe `{ id, apiKey, walletId }`
2. Criptografar `apiKey` (AES-256-GCM) → persistir em `Unit.asaasApiKeyEnc`, `asaasAccountId`, `asaasWalletId`
3. **Rollback:** se a subconta falhar, deletar a Unit (não deixar órfã). Lançar `AsaasProvisionError`.

### Cobrança (Tarefa 3) — boleto/PIX
1. `findCustomerByCpfCnpj` ou `createCustomer` (responsável) na subconta da Unit
2. `createPayment({ customer, billingType: 'BOLETO'|'PIX'|'UNDEFINED', value: cents/100, dueDate, fine, interest })`
   - `value` em REAIS (conversão na borda) · `fine`/`interest` = multa/juros da BillingConfig
3. Retorna boleto (linha digitável) + PIX (copia-e-cola)

### Webhook (Tarefa 3/4) — baixa automática
- Idempotente: skip de evento duplicado via tabela `WebhookEvent` (dedup por eventId)
- Token validado no header `X-Asaas-Token` (não em query) — comparar com o token da subconta (timing-safe)
- **Event bus:** handlers (NFS-e, regularização de negativação) se registram; não editam o core do webhook
- **CONFIRMED vs RECEIVED** (decisão de design pendente): `PAYMENT_RECEIVED` (dinheiro na conta) dispara NF + regularização; `PAYMENT_CONFIRMED` é só status visual. Confirmar testando pagamento sandbox.

### Negativação (Tarefa 5)
- `createDunning` (incluir inadimplente) · `removeDunning` (regularizar em até 24h após pagamento)
- Escola decide caso a caso; regras de notificação prévia geridas pela Asaas

## Como reproduzir uma chamada (sandbox)
```bash
source .env.local   # ASAAS_MASTER_API_KEY (com $ e aspas simples), ASAAS_BASE_URL
curl -s -w '%{http_code}' "$ASAAS_BASE_URL/payments?limit=1" \
  -H "access_token: $ASAAS_MASTER_API_KEY" -H "Content-Type: application/json"
```

## Anti-padrões
- ❌ `fetch` direto à Asaas (sempre via cliente tipado)
- ❌ centavos na API / reais no app (é o inverso — conversão só na borda)
- ❌ token Asaas em log, commit, ou query string
- ❌ produção sem confirmação explícita do Rafa
- ❌ subconta criada sem rollback em caso de falha

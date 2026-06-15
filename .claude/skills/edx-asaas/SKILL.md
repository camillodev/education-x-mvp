---
name: edx-asaas
description: Boas práticas de integração Asaas do Education X — saber o payload via MCP antes de codar, sempre logar cobrança pra debug, idempotência, rollback, conversão de valor num lugar só, webhook seguro. Auto-contida no repo. Use ao tocar em src/lib/integration/asaas/ ou services de cobrança/pagamento.
---

# Asaas — Education X (auto-contido no repo)

> Skill do projeto. NÃO depende de nenhuma skill global `~/.claude`. As fontes de verdade são internas ao repo: `.claude/rules/asaas.md`, `docs/api-contracts/asaas-*.md`, e o cliente tipado em `src/lib/integration/asaas/`. Para sintaxe/payloads novos da API Asaas, consultar `context7` ou docs.asaas.com ao vivo.

## Regra de ouro (de `.claude/rules/asaas.md`)
1. **Cliente tipado sempre.** Toda chamada Asaas passa por `src/lib/integration/asaas/` (interface + `AsaasLiveClient` + `AsaasMockClient`). Nunca `fetch` direto.
2. **Sandbox primeiro.** Default `https://sandbox.asaas.com/api/v3`. Produção só com confirmação explícita do Rafa, por operação.
3. **Auth:** header `access_token: {apiKey}` (NÃO Bearer). Nunca logar/commitar o token.
4. **Valores:** o app é **100% centavos (Int)** — padrão financeiro correto, sem Float em lugar nenhum. A API da Asaas **exige reais** (contrato externo deles, não dá pra mudar). Por isso a conversão centavos→reais existe num **único ponto**: a borda do cliente (`AsaasLiveClient`). Isolar num lugar só é o que protege o app de erro de arredondamento espalhado.
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

## Práticas de integração (sempre — independem da tarefa)

Estas práticas valem pra QUALQUER chamada Asaas. Não são passos de uma tarefa específica.

### 1. Saber o payload ANTES de executar
- Antes de implementar qualquer operação nova, **descobrir o contrato real**: consultar o MCP de docs da Asaas (`.mcp.json` tem o server `asaas`) OU docs.asaas.com, em **sandbox**.
- Validar o payload com uma chamada real de sandbox antes de codar o service. Salvar o contrato em `docs/api-contracts/asaas-*.md` pra virar referência.
- Nunca assumir formato de campo (ex: `value` em reais, `dueDate` ISO `YYYY-MM-DD`) — confirmar na doc/MCP.

### 2. Sempre logar cobrança pra debug futuro
- Toda operação que cria/altera dinheiro (payment, dunning, transfer) registra um log estruturado: operação, `externalReference`, `unitId`, resultado (id Asaas ou erro), timestamp. **Nunca** logar o token/apiKey.
- Esse log é o que permite reconstruir "por que essa cobrança falhou" semanas depois. Sem ele, debug de produção financeira é cego.

### 3. Idempotência por construção
- Toda criação usa `externalReference` (nosso id interno) pra evitar cobrança duplicada se a chamada for repetida.
- Webhook: dedup de evento por `eventId` (tabela `WebhookEvent`) antes de processar.

### 4. Falha externa → estado consistente (rollback)
- Operação que toca banco + Asaas: se a Asaas falhar, reverter o lado do banco (não deixar registro órfão). Lançar erro tipado (ex: `AsaasProvisionError`) pra a API mapear o status HTTP certo.

### 5. Conversão de valor num lugar só
- Centavos→reais SÓ dentro do cliente (`AsaasLiveClient`). Service e API passam centavos. Ver Regra de ouro #4.

### 6. Webhook seguro
- Token no header `X-Asaas-Token` (não em query), comparado timing-safe com o token da subconta.
- **Event bus:** handlers (NFS-e, regularização) se registram; não editam o core do webhook.
- Decisão pendente `PAYMENT_RECEIVED` vs `PAYMENT_CONFIRMED`: RECEIVED (dinheiro na conta) dispara NF + regularização; confirmar testando sandbox.

> Exemplos concretos por operação (subconta, cobrança, dunning) vivem nos services e em `docs/api-contracts/` — esta skill define o COMO geral, não o passo-a-passo de cada tarefa.

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

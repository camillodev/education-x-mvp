# Roadmap de Implementação — MVP Education X × Asaas

> **Plano técnico acionável.** Endpoints Asaas, payloads, sequência de PRs, o que reusar.
> **Base:** recomeço limpo aproveitando peças (D32) — Clerk, multi-tenant SaaS, Tailwind v4 +
> shadcn (sem design system pesado). Cora ignorada. Kumon Camargos = Unidade 01 nova no Asaas.
> **Cobertura:** 80% no código novo. **Doc-mãe:** [00-visao.md](./00-visao.md)

---

## 0. Antes de começar — setup

### 0.1 Variáveis de ambiente (`.env.local` — valores crus, sem vault)
```env
ASAAS_MODE=mock                 # mock | live  (começa mock)
ASAAS_ENV=sandbox               # sandbox | production
ASAAS_MASTER_API_KEY=<valor>    # conta-mãe IX (cria subcontas) — você já criou
ASAAS_WALLET_ID=<valor>         # você já criou (uso futuro/split)
ASAAS_WEBHOOK_SECRET=<gerar>    # token de verificação dos webhooks recebidos
ENCRYPTION_KEY=<gerar 32 bytes> # AES-256 para criptografar apiKey das subcontas
```
> `.env.local` é gitignored. Valores crus direto (sem Bitwarden/placeholders). Em produção,
> as mesmas chaves vão como env vars no Vercel.

### 0.2 Constantes Asaas (já no client F0-A)
- Base URL: sandbox `https://sandbox.asaas.com/api/v3` · prod `https://api.asaas.com/v3`
- Auth: header **`access_token: {apiKey}`** (NÃO Bearer)
- Valores: **REAIS** (não centavos) — converter na borda do serviço
- Cliente já implementado: `src/lib/integration/asaas/` (65 testes, 96% cobertura)

### 0.2.1 MCP da Asaas (ferramenta de DESENVOLVIMENTO — não é runtime)

> Doc: https://docs.asaas.com/docs/mcp-1 · Server MCP: `https://docs.asaas.com/mcp`

O Asaas oferece um **MCP server** que dá ao assistente de IA (Claude Code / Cursor) acesso
estruturado à API: listar endpoints, ver schemas request/response, gerar exemplos de código,
buscar a doc e (com `access_token`) executar chamadas reais. **Use durante a implementação**
para acertar payloads/contratos sem chutar — substitui parte da pesquisa manual de docs.

**É dev-aid, NÃO dependência de produção.** O app continua falando com a Asaas só pelo nosso
client (`src/lib/integration/asaas/`). O MCP serve ao desenvolvedor/IA na hora de codar.

**Setup (uma vez, por máquina):**
1. Adicionar o server ao MCP do Claude Code / Cursor:
   ```jsonc
   // ~/.cursor/mcp.json  (ou config MCP do Claude Code)
   {
     "mcpServers": {
       "asaas": { "url": "https://docs.asaas.com/mcp" }
     }
   }
   ```
2. Fornecer o `access_token` de **sandbox** (nunca produção em dev) de forma segura quando
   for executar chamadas — preferir só consulta de schema/exemplo, sem token, no dia a dia.
3. Versão de API: anexar `?branch=<nome>` à URL do MCP para acessar versões além da estável.

**Como usar na prática (cada PR):** antes de escrever um endpoint novo (ex: `POST /payments`,
`POST /accounts`, `POST /paymentDunnings`), pedir ao assistente via MCP Asaas o schema exato e
um exemplo — e conferir contra o que está neste roadmap. Reduz retrabalho por payload errado.

**Segurança:** nunca commitar `access_token`; usar sandbox em dev; não deixar o MCP executar
chamadas com token de produção. Alinha com o gate de secrets do projeto.

### 0.3 O que reusar do código atual
| Reusa | Não reusa |
|-------|-----------|
| Clerk + `src/proxy.ts` (auth) | Fluxo de onboarding (novo) |
| Multi-tenant (refocar em SaaS) | Features de cobrança Cora (novo, via Asaas) |
| `src/lib/integration/asaas/` (F0-A) | `src/lib/cora/` e `src/lib/integration/cora/` (ignorar) |
| Lógica de pro-rata do billing | `@impactxlab/design-system` (trocar por shadcn — ver 0.4) |

### 0.4 UI — Tailwind v4 + shadcn + branding (decisão: baixa manutenção, vendável)
- **Não** investir no design system pesado agora. Usar **shadcn/ui** (componentes copiados
  pro repo, você controla) sobre **Tailwind v4** (já instalado).
- Branding (Kumon azul / IX verde) via **CSS variables** no `globals.css` (`@theme`), trocável
  por tenant. Cores de marca viram `--primary`, `--accent` etc.
- Gráficos/cards que o Rafa gosta podem ser reaproveitados depois, mas **não são foco** do MVP.
- Init: `npx shadcn@latest init` → componentes sob demanda: `npx shadcn@latest add button table badge form`.

### 0.5 Convenções de código (obrigatórias)
- **Nomenclatura:** a entidade é **`Invoice`** (cobrança). "Boleto" é apenas um `billingType`
  (`BOLETO` | `PIX` | `CREDIT_CARD`). NUNCA nomear entidade/serviço/rota como "boleto".
  Ex: `invoice-service.ts`, `emitInvoice()`, `/api/invoices` — não `boleto-service`.
- **Baixa manutenção:** funções puras testáveis, módulos pequenos, sem duplicação, sem
  abstração prematura. Integração isolada em `src/lib/integration/asaas/`.

### 0.6 CI — bloqueia regressão (não-negociável)
Pipeline reprova o PR se **qualquer teste existente quebrar** ou cobertura cair abaixo de 80%.
Quebrou feature que já funcionava → não sobe. É a rede de segurança para baixa manutenção.
Gate: `pnpm test:run` (todos verdes) + `pnpm test:coverage` (≥80%) + `typecheck` + `build`.

---

## Sequência de releases semanais

```
Semana 1 → PR1  Schema + onboarding da escola (subconta Asaas)
Semana 2 → PR2  Planos, matérias/valores, matrícula com aceite (clickwrap)
Semana 3 → PR3  Emissão de boleto/PIX (manual extra + automática) + webhook
Semana 4 → PR4  Nota fiscal automática + régua de avisos
Semana 5 → PR5  Negativação SPC/Serasa
```
Cada PR: testes 80% + Playwright 3 breakpoints + FAQ da feature + preview Vercel.

---

## PR1 — Schema + Onboarding da Escola (Semana 1)

**Épico:** 01 (Feature 1.1) · **Objetivo:** criar a subconta Asaas de uma escola.

### Endpoints Asaas
**Criar subconta** — `POST /accounts` (header `access_token = ASAAS_MASTER_API_KEY`):
```json
{
  "name": "Kumon Camargos",
  "email": "financeiro@kumoncamargos.com.br",
  "cpfCnpj": "12345678000190",
  "companyType": "LIMITED",
  "address": "Rua X", "addressNumber": "123",
  "province": "Centro", "postalCode": "30130000",
  "mobilePhone": "31999998888",
  "webhooks": [{
    "name": "Payments",
    "url": "https://<app>/api/webhooks/asaas?unitId={unitId}",
    "authToken": "<asaasWebhookSecret-da-unidade>",
    "sendType": "SEQUENTIALLY", "interrupted": false,
    "enabled": true, "apiVersion": 3,
    "events": ["PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_RECEIVED",
               "PAYMENT_OVERDUE","PAYMENT_DUEDATE_WARNING"]
  }]
}
```
Resposta: `{ id, apiKey, walletId }` → persistir criptografado.

### Schema Prisma (migration)
```prisma
model Unit {
  // ... existentes ...
  cnpj          String? @unique
  companyType   String?
  phone         String?
  address       String?
  addressNumber String?
  province      String?
  postalCode    String?
  suspended     Boolean @default(false)
  suspendedAt   DateTime?
}

model BillingConfig {
  asaasEnabled       Boolean @default(false)
  asaasApiKey        String?  // criptografado AES-256-GCM
  asaasWalletId      String?
  asaasAccountId     String?
  asaasWebhookSecret String?  // criptografado
  asaasEnv           String  @default("sandbox")
  defaultDueDay      Int     @default(10)
  closingDay         Int     @default(25)
  autoEmitOnClosingDay Boolean @default(true)
  lateFeePercent     Float   @default(2.0)
  interestPercent    Float   @default(1.0)
  nfseEnabled        Boolean @default(false)
  nfseMunicipalServiceId   String?
  nfseMunicipalServiceCode String?
  nfseMunicipalServiceName String?
  nfseIss            Float   @default(3.0)
}
```

### Arquivos
- `src/lib/crypto.ts` — `encryptSecret`/`decryptSecret` (AES-256-GCM, `ENCRYPTION_KEY`)
- `src/lib/setup/onboarding-service.ts` — orquestra: valida → `createSubAccount` → persiste (transaction)
- `src/lib/setup/schemas.ts` — Zod `EscolaSetupSchema`
- `src/app/api/setup/escola/route.ts` — `POST` (201/400/409/502)
- `src/app/(app)/configuracoes/onboarding/` — wizard UI (shadcn: form, input, button, stepper)

### Testes (80%)
- onboarding-service: cria subconta, criptografa apiKey, rollback em falha Asaas, CNPJ duplicado→409
- crypto: encrypt→decrypt round-trip, IV aleatório
- schema Zod: CNPJ inválido, dueDay fora de range

### Critério de aceite E2E
Wizard preenche dados → `POST /accounts` (mock) → `BillingConfig.asaasEnabled=true` → confirmação.

---

## PR2 — Planos, Matérias e Matrícula com Aceite (Semana 2)

**Épicos:** 06 (planos/matéria) + 05 (aceite clickwrap) · **Objetivo:** matricular com aceite.

### Sem chamada Asaas (modelagem interna)
Não há endpoint Asaas aqui — é modelagem do nosso domínio que alimenta a cobrança.

### Schema Prisma
```prisma
enum PlanRecurrence { MONTHLY QUARTERLY SEMIANNUAL ANNUAL }

model Subject {                  // confirmar se já existe; ajustar
  id String @id @default(cuid())
  unitId String
  name String
  priceCents Int
  isActive Boolean @default(true)
}
model Plan {
  id String @id @default(cuid())
  unitId String
  name String
  recurrence PlanRecurrence
  volumeDiscount Json?
  isActive Boolean @default(true)
}
model Enrollment {              // ajustar existente
  planId String?
  cancelledAt DateTime?
  cancelReason String?
}
model TermsVersion {
  id String @id @default(cuid())
  scope String  // "SCHOOL_GUARDIAN"
  version Int
  body String
  isActive Boolean @default(true)
  @@unique([scope, version])
}
model TermsAcceptance {
  id String @id @default(cuid())
  termsVersionId String
  scope String
  unitId String
  guardianId String?
  acceptedByUserId String?
  acceptedAt DateTime @default(now())
  ip String?
  userAgent String?
}
```

### Features
- Matéria + valor por escola (config no onboarding); pro-rata entrada/saída (`computeProRata` puro)
- Link de matrícula: pai preenche (CPF/email/telefone **obrigatórios**) + aceita termos → escola aprova
- Aceite clickwrap: registra IP + timestamp + versão (válido por MP 2.200-2 + Lei 14.063 + STJ)

### Arquivos
- `src/lib/plans/` — CRUD planos/matérias, `computeProRata`
- `src/lib/terms/` — resolução de versão + registro de aceite
- `src/app/(app)/matriculas/` — reusa wizard pai-first existente, adiciona aceite

### Testes (80%)
- `computeProRata` entrada/saída; soma de matérias; desconto por volume
- aceite registra IP/versão; matrícula bloqueada sem CPF/email/telefone; bloqueada sem aceite

---

## PR3 — Emissão de Boleto/PIX + Webhook (Semana 3)

**Épico:** 01 (Features 1.2–1.6) · **Objetivo:** gerar cobrança e receber pagamento.

### Endpoints Asaas (header `access_token = apiKey da subconta`)
**Resolver cliente (responsável):**
```
GET /customers?cpfCnpj={cpf}        → reusar se existir
POST /customers { name, cpfCnpj, mobilePhone, email }   → criar; salvar asaasCustomerId no Guardian
```
**Criar boleto+PIX:**
```json
POST /payments
{
  "customer": "{asaasCustomerId}",
  "billingType": "BOLETO",
  "value": 450.00,
  "dueDate": "2026-07-10",
  "externalReference": "{invoiceId}",
  "description": "Mensalidade Kumon Camargos — 2026-07",
  "fine": { "value": 2 },
  "interest": { "value": 1 }
}
```
Resposta: `id`, `status`, `bankSlipUrl`, `invoiceUrl` (PIX dentro), `barCode`.

**Editar antes/depois (não pago):** `PUT /payments/{id}` `{ value, dueDate, discount }`
**Cancelar:** `DELETE /payments/{id}` (204)

### Webhook de pagamento
```
POST /api/webhooks/asaas?unitId={unitId}
Header: asaas-access-token  → validar === decrypt(BillingConfig.asaasWebhookSecret)
Body: { event, payment: { id, status, value, clientPaymentDate, externalReference } }
```
Mapa: `RECEIVED`/`CONFIRMED`→PAID (paidAmount = value×100) · `OVERDUE`→OVERDUE · `REFUNDED`→CANCELLED.
Idempotência: `WebhookEvent` por id do evento.

### Schema (Invoice)
```prisma
model Invoice {
  asaasPaymentId  String?
  asaasCustomerId String?
  billingType     String  @default("BOLETO")
  bankSlipUrl     String?
  invoiceUrl      String?
  pixQrCode       String?
  barCode         String?
}
model Guardian { asaasCustomerId String? }
```

### Arquivos
- `src/lib/billing/invoice-service.ts` — `resolveCustomer`, `emitInvoice`, `editPayment`, `cancelPayment`
- `src/app/api/webhooks/asaas/route.ts` — handler com auth por header
- `src/app/(app)/cobrancas/` — emissão extra manual + edição (reusa componentes)

### Testes (80%)
- emitInvoice: centavos→reais, externalReference, fine/interest, idempotência, erro→ERROR
- resolveCustomer: cria se não existe, reusa se existe
- webhook: RECEIVED→PAID, token inválido→401, id desconhecido→ignora, duplicado→skip

---

## PR4 — Nota Fiscal + Régua de Avisos (Semana 4)

**Épicos:** 01 (Feature 1.7) + 02 (régua) · **Objetivo:** NFS-e automática + autocobrança.

### Endpoints Asaas
**Régua de avisos** (no onboarding e configurável) — `PUT /notifications/{event}`:
```json
{ "enabled": true, "emailEnabledForCustomer": true, "smsEnabledForCustomer": true,
  "whatsappEnabledForCustomer": true, "scheduleOffset": 5 }
```
Eventos: `PAYMENT_CREATED`, `PAYMENT_DUEDATE_WARNING` (offset 0/5/10/15/30),
`PAYMENT_OVERDUE` (offset 1/7/15/30), `PAYMENT_RECEIVED`.

**Nota fiscal** (ao pagar) — `POST /invoices`:
```json
{
  "payment": "{asaasPaymentId}",
  "serviceDescription": "Mensalidade educacional — 2026-07",
  "value": 450.00,
  "municipalServiceId": "{BillingConfig.nfseMunicipalServiceId}",
  "municipalServiceCode": "{BillingConfig.nfseMunicipalServiceCode}",
  "municipalServiceName": "{BillingConfig.nfseMunicipalServiceName}",
  "taxes": { "iss": 3, "retainIss": false }
}
```
Status: `SCHEDULED → AUTHORIZED`. Webhook de invoice atualiza `NfseRecord`.

**Emissão automática no fechamento** — cron:
```
GET /api/cron/emit-batch (Vercel Cron, dia closingDay)
  para cada Unit com asaasEnabled && autoEmitOnClosingDay && !suspended:
    lista matrículas ACTIVE → calcula valor → emitInvoice (PR3)
```

### Schema (NfseRecord)
```prisma
model NfseRecord {
  invoiceId String @unique
  asaasInvoiceId String?
  status String @default("PENDING") // PENDING|ISSUED|ERROR|CANCELLED
  number String? ; pdfUrl String? ; xmlUrl String?
}
```

### Testes (80%)
- NFS-e emitida no PAID (sempre); pula se nfseMunicipal* não configurado (pendente+alerta); não duplica
- régua: PUT por evento/canal, scheduleOffset correto
- cron: emite ACTIVE, pula suspended, idempotente

---

## PR5 — Negativação SPC/Serasa (Semana 5)

**Épico:** 03 · **Objetivo:** negativar inadimplente com aviso legal.

### Endpoints Asaas (requer `PAYMENT_DUNNING:WRITE` liberado com gerente Asaas)
```
POST /paymentDunnings { payment: "{asaasPaymentId}", type: "CREDIT_BUREAU", description }
DELETE /paymentDunnings/{id}     → regularização
GET /paymentDunnings/{id}        → sync status
```

### Workflow (cron diário)
```
GET /api/cron/negativacao-check (08:00 BRT)
  para cada Unit com asaasNegativacaoEnabled && !suspended:
    1. Novos elegíveis (OVERDUE ≥ diasAtraso, valor ≥ mínimo, sem opt-out, sem negativação ativa)
       → cria Negativacao(AGUARDANDO_AVISO) → envia AVISO → status AVISADO (avisadoAt)
    2. AVISADO há ≥ noticeDaysBefore:
       → ainda OVERDUE → POST /paymentDunnings → NEGATIVADO
       → já PAID → REGULARIZADO
  Regularização via webhook PAYMENT_RECEIVED → DELETE /paymentDunnings → REGULARIZADO
```

### Schema
```prisma
enum NegativacaoStatus { AGUARDANDO_AVISO AVISADO NEGATIVADO REGULARIZADO CANCELADO ERRO }
model AsaasNegativacao {
  id String @id @default(cuid())
  invoiceId String @unique
  guardianId String ; unitId String
  status NegativacaoStatus @default(AGUARDANDO_AVISO)
  avisadoAt DateTime? ; negativadoAt DateTime? ; regularizadoAt DateTime?
  asaasDunningId String?
  configSnapshot Json
}
model Guardian { asaasOptOut Boolean @default(false) ; asaasOptOutReason String? }
model BillingConfig {
  asaasNegativacaoEnabled Boolean @default(false)
  asaasDaysOverdueToNegate Int @default(30)
  asaasMinAmountToNegate Int @default(10000)
  asaasNoticeDaysBefore Int @default(7)
}
```

### Garantia legal (crítico — test obrigatório)
`avisadoAt` deve estar preenchido antes de `POST /paymentDunnings`. Cron aborta se null.

### Testes (80%)
- elegibilidade: opt-out/valor<mínimo/atraso<dias → skip
- cron: AVISADO+prazo+OVERDUE→negativa; AVISADO+PAID→regulariza
- garantia: avisadoAt=null → não negativa
- webhook PAID → DELETE + REGULARIZADO

---

## Gate de qualidade (todo PR)

1. `pnpm test:run` — 80% no código novo (threshold em `vitest.config.ts`)
2. `pnpm typecheck && pnpm build`
3. Playwright real local: 1440 / 768 / 375 + console limpo (rotas mudadas)
4. PR com `## Como testar` + `## Preview` (Vercel CLI)
5. FAQ da feature em `docs/faq/` (release semanal)

## Ordem de dependência
```
PR1 (onboarding/subconta) → PR3 (boleto usa apiKey da subconta)
PR2 (planos/matrícula)    → PR3 (boleto usa valor do plano)
PR3 (boleto/asaasPaymentId) → PR4 (NFS-e) → PR5 (negativação usa asaasPaymentId)
```

## Pendências a confirmar antes de cada PR
- **PR1:** Kumon Camargos tem inscrição municipal pra NFS-e? (afeta `nfseMunicipal*`)
- **PR5:** `PAYMENT_DUNNING:WRITE` liberado com a Asaas?
- **Geral:** revisão jurídica do texto dos termos (Épico 05 Q1)

# Spec — Negativação SPC/Serasa (Fluxo 05)

> **Status:** rascunho (Rafa + Claude, 2026-06-19)
> **Fonte de verdade:** `src/lib/integration/asaas/types.ts` + `src/lib/integration/asaas/live-client.ts` + `prisma/schema.prisma` + protótipo (`prototipo/design-handoff/project/app/screens-d.jsx`, só UX).
> **DS:** Alfabeto.

---

## 1. Objetivo

Permitir que a escola opte por negativar um responsável inadimplente no SPC/Serasa via Asaas (`POST /paymentDunnings`, type `CREDIT_BUREAU`), rastreando o ciclo completo: aviso CDC -> elegibilidade -> negativação -> regularização. Opt-out permanente por responsável (dívida segue, mas sem registro no bureau). Taxa de R$29,90 por inclusão cobrada na fatura da escola (fluxo 09).

**DoD:** poder abrir o painel de uma cobrança vencida há >15 dias, acionar negativação, ver o status evoluir para "negativado", e solicitar baixa. Playwright E2E cobrindo os 4 status + opt-out + baixa manual.

---

## 2. Dados necessários (o coração)

### 2a. Piso Asaas

Endpoint: `POST /paymentDunnings`

Payload mínimo conhecido (baseado em `AsaasCreateDunningPayload` + doc oficial Asaas):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `payment` | string | SIM | `asaasPaymentId` da cobrança a negativar |
| `type` | enum | SIM | `"CREDIT_BUREAU"` (único tipo disponível) |
| `description` | string | NAO | Descrição adicional |

Resposta (`AsaasDunning`):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | ID Asaas do dunning (persistir como `asaasDunningId`) |
| `status` | enum | `PENDING` / `CONFIRMED` / `CANCELLED` |
| `dunningNumber` | number? | Número sequencial |
| `requestDate` | string | Data da solicitação |
| `value` | number | Valor da dívida (reais) |
| `feeValue` | number | Taxa Asaas (R$29,90) |
| `netValue` | number | Líquido |

Endpoints adicionais:
- `GET /paymentDunnings/{id}` — consulta status
- `DELETE /paymentDunnings/{id}` — solicitar baixa

**Nota:** O Asaas cuida do aviso legal (CDC art. 43 — 10 dias antes da inclusão). A IX não precisa enviar notificação de aviso diretamente; precisa registrar que o aviso foi disparado.

### 2b. Negócio

- A escola habilita negativação em `BillingConfig.enablesSpc = true` (já existe).
- Quem paga a taxa R$29,90: `BillingConfig.negativacaoFeePayer` — `RESPONSAVEL` ou `ESCOLA` (já existe). Se `RESPONSAVEL`, a taxa é somada ao boleto; se `ESCOLA`, entra na fatura mensal da escola (fluxo 09).
- Elegibilidade: cobrança vencida ha >= 15 dias e status Asaas `OVERDUE`.
- Aviso CDC: Asaas dispara o aviso 10 dias antes de negativar. O sistema registra `warningSentAt` no `Dunning`.
- Opt-out: responsável pode ser marcado para nao entrar na régua de negativação. `Dunning.optOut = true` — dívida permanece, apenas o registro no bureau e cancelado/nao solicitado.
- Baixa manual: operador da escola solicita `DELETE /paymentDunnings/{id}`. Asaas cancela a negativação. Status interno -> `regularizado`.
- Taxa é lançada como linha na fatura da escola (fluxo 09 — out of scope aqui; apenas registrar `feeCents = 2990` no `Dunning`).
- KPIs: contagem por status (emaviso / elegivel / negativado / regularizado) + soma de valores em cada estado.

### 2c. Fiscal / NFS-e

Nao aplicavel diretamente neste fluxo. A taxa de negativação (R$29,90) e cobrada como item da fatura mensal da escola (fluxo 09 cuida da NFS-e).

### 2d. Compliance / LGPD

- CPF do responsável (`Guardian.cpfEnc`) e PII criptografado (AES-256-GCM). Nunca armazenar em plaintext.
- Na UI, CPF **sempre mascarado**: `maskCpf(cpf)` → `***.***.XXX-XX`. Nunca exibir completo.
- Asaas recebe o CPF plaintext no payload do dunning — descriptografar apenas na borda de saida, nunca logar o valor.
- Consentimento para negativação: o responsável assinou o contrato escola (TermsAcceptance `ESCOLA_RESPONSAVEL`) que inclui cláusula de negativação. Sem consentimento adicional necessário, mas a escola deve ter `confirmedAt != null` e `requireSignedContract` atendido.
- Log de auditoria: toda ação de negativar / dar baixa / opt-out deve gravar `actorId` (clerkUserId do operador) e `occurredAt`.

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolução |
|---|---|---|---|---|---|---|
| `asaasPaymentId` | Invoice/Payment (fluxo 03) | SIM | existe em `Invoice.asaasPaymentId` (fluxo 03) | `payment` | Sim | Ler de `Invoice` via `invoiceId` no `Dunning` |
| `type = CREDIT_BUREAU` | Produto | SIM | constante no código | `type` | Implícito | Hardcoded no service |
| `description` | Produto | NAO | N/A | `description` | Nao | Gerado automaticamente: `"Negativação — [nomeEscola] — venc. [data]"` |
| `asaasDunningId` | Asaas resposta | SIM | **FALTA** — criar `Dunning.asaasDunningId` | `id` (resposta) | Nao | Persistir após POST |
| Status interno (4 valores) | Produto | SIM | **FALTA** — criar `DunningStatus` enum | `status` (PENDING/CONFIRMED/CANCELLED) | Sim (4 telas) | Mapeamento: ver §7 |
| `warningSentAt` | Asaas webhook | NAO (auditoria) | **FALTA** | evento DUNNING_REQUESTED | Sim (timeline CDC) | Setar quando Asaas confirmar aviso enviado |
| `optOut` | Produto | SIM | **FALTA** — criar `Dunning.optOut` | N/A — nao envia pra Asaas | Sim | Bool no model; se true, nao criar dunning Asaas |
| `feeCents` | Produto | SIM | **FALTA** — criar `Dunning.feeCents` | `feeValue` (resposta, reais) | Nao | Converter `feeValue * 100`, persistir |
| `valueCents` | Asaas resposta | SIM | **FALTA** — criar `Dunning.valueCents` | `value` (resposta, reais) | Nao | Converter `value * 100`, persistir |
| CPF responsável (para Asaas?) | Guardian PII | Verificar | `Guardian.cpfEnc` existe | possivelmente `customerCpfCnpj` | Nao | O Asaas usa o cadastro do customer (`asaasCustomerId`) — CPF já esta no customer Asaas (fluxo 02). Nao enviar novamente no payload do dunning. |
| `unitId` | Tenant | SIM | existe em todos os models | N/A | Nao | Sempre filtrar por `unitId` da sessao Clerk |
| `invoiceId` | Produto | SIM | **FALTA** — FK em `Dunning` | N/A | Nao | Relacionar dunning -> invoice |
| `actorId` (auditoria) | Clerk session | SIM | **FALTA** — campo em `Dunning` | N/A | Nao | `clerkUserId` de quem acionou a ação |
| `enablesSpc` | BillingConfig | SIM | existe | N/A | Nao | Guard: se `false`, bloquear criação de dunning |
| `negativacaoFeePayer` | BillingConfig | SIM | existe | N/A | Nao | Determina destino da taxa (fatura escola vs boleto responsável) |

---

## 4. Deltas de schema

```prisma
// Adicionar ao schema.prisma

enum DunningStatus {
  EMAVISO      // aviso CDC disparado (10 dias antes)
  ELEGIVEL     // vencimento + 15 dias, aguardando ação da escola
  NEGATIVADO   // POST /paymentDunnings confirmado pelo Asaas
  REGULARIZADO // baixa dada (DELETE /paymentDunnings ou pagamento recebido)
}

model Dunning {
  id             String        @id @default(cuid())
  unitId         String
  invoiceId      String        // FK -> Invoice (fluxo 03)

  // Asaas
  asaasDunningId String?       // preenchido após POST /paymentDunnings
  status         DunningStatus @default(ELEGIVEL)

  // Valores em centavos (converter na borda Asaas)
  valueCents     Int?          // dívida (feeValue * 100 nao — value * 100)
  feeCents       Int?          // taxa negativação (R$29,90 = 2990)

  // Controle de produto
  optOut         Boolean       @default(false) // responsável saiu da régua permanentemente
  warningSentAt  DateTime?     // quando Asaas confirmou envio do aviso CDC
  requestedAt    DateTime?     // quando POST /paymentDunnings foi feito
  resolvedAt     DateTime?     // quando baixa foi dada ou pagamento recebido

  // Auditoria
  actorId        String        // clerkUserId de quem acionou

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  unit           Unit          @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@index([invoiceId])
  @@index([status])
  @@map("dunnings")
}
```

**Migration necessaria:** `prisma migrate dev --name add-dunning`

**Relação Invoice -> Dunning:** adicionar ao model `Invoice` (fluxo 03):
```prisma
  dunning  Dunning?
```

---

## 5. Contratos Asaas

### POST /paymentDunnings — criar negativação

```json
{
  "payment": "pay_abc123xyz",
  "type": "CREDIT_BUREAU",
  "description": "Negativação — Escola Modelo — venc. 15/05/2026"
}
```

Resposta esperada:
```json
{
  "id": "dun_xyz456",
  "status": "PENDING",
  "dunningNumber": 1,
  "requestDate": "2026-05-30",
  "value": 450.00,
  "feeValue": 29.90,
  "netValue": 420.10
}
```

Conversao de borda (reais -> centavos):
- `value * 100` -> `Dunning.valueCents`
- `feeValue * 100` -> `Dunning.feeCents` (deve ser 2990)

### DELETE /paymentDunnings/{id} — solicitar baixa

Sem body. Retorna 200 OK ou erro.

### GET /paymentDunnings/{id} — consultar status

Resposta igual ao POST. Usar para polling ou reconciliação.

**Sandbox-first:** toda implementação usa `ASAAS_MODE=mock` por default. Mock client já tem `createDunning` / `removeDunning` / `getDunning` implementados em `src/lib/integration/asaas/mock-client.ts`.

---

## 6. Regras de negócio (EARS)

```
WHEN invoice.asaasPaymentId exists
  AND invoice.dueDate <= today - 15 days
  AND billingConfig.enablesSpc = true
  AND dunning does not exist for this invoice
  AND guardian.optOut = false
THEN system SHALL mark invoice as ELEGIVEL for negativação (create Dunning{status: ELEGIVEL})

WHEN dunning.status = ELEGIVEL
  AND operador aciona "Negativar"
THEN system SHALL POST /paymentDunnings
  AND set dunning.status = NEGATIVADO
  AND set dunning.asaasDunningId = response.id
  AND set dunning.valueCents = response.value * 100
  AND set dunning.feeCents = response.feeValue * 100
  AND set dunning.requestedAt = now()

WHEN dunning.status = NEGATIVADO
  AND operador aciona "Solicitar Baixa"
THEN system SHALL DELETE /paymentDunnings/{asaasDunningId}
  AND set dunning.status = REGULARIZADO
  AND set dunning.resolvedAt = now()

WHEN payment status = RECEIVED OR CONFIRMED (webhook fluxo 03)
  AND dunning.status = NEGATIVADO
THEN system SHALL DELETE /paymentDunnings/{asaasDunningId} (baixa automatica)
  AND set dunning.status = REGULARIZADO
  AND set dunning.resolvedAt = now()

WHEN operador aciona "Opt-out" para um responsável
THEN system SHALL set dunning.optOut = true
  AND IF dunning.status = NEGATIVADO THEN system SHALL DELETE /paymentDunnings/{asaasDunningId}
  AND set dunning.status = REGULARIZADO

WHEN billingConfig.enablesSpc = false
THEN system SHALL NOT create any Dunning for invoices of this unit

IF dunning.optOut = true
THEN system SHALL NOT create new Dunning for subsequent invoices of this guardian

IF Asaas POST /paymentDunnings returns error
THEN system SHALL set dunning.status = ELEGIVEL (rollback)
  AND log error com asaasDunningId = null
```

---

## 7. Estados e transições

```
                         ┌─────────────────────────────────────────────────────┐
                         │                   [opt-out]                          │
                         │  (acao do operador — dívida segue, sem bureau)       │
                         ▼                                                       │
[invoice vence +15d]  ELEGIVEL ──[operador aciona]──► NEGATIVADO ──[baixa]──► REGULARIZADO
                         │                                   │
                         │                                   └──[pagamento recebido
                         │                                        (webhook auto)]──► REGULARIZADO
                         │
                     [enablesSpc=false
                      ou optOut anterior]
                      → nao cria Dunning

Nota: EMAVISO nao e um estado de Dunning — e um evento Asaas.
O Asaas dispara o aviso CDC (10 dias antes de confirmar a negativação).
Quando recebemos confirmação do aviso (webhook ou polling), setamos dunning.warningSentAt.
O status do Dunning nao muda por isso — continua NEGATIVADO.

Mapeamento Asaas -> status interno:
  AsaasDunningStatus.PENDING   -> Dunning em transição (requestedAt setado, aguardando CONFIRMED)
  AsaasDunningStatus.CONFIRMED -> NEGATIVADO (atualizar em polling ou webhook)
  AsaasDunningStatus.CANCELLED -> REGULARIZADO
```

---

## 8. Fluxo de coleta (UX — referência ao design)

Design de referência: `prototipo/design-handoff/project/app/screens-d.jsx` (telas de negativação). Screenshots: `neg.png` (painel de status) e `neg-modal.png` (modal de confirmação).

O design ilustra os 4 estados como cards de status + timeline CDC. A UI NAO define os campos — os campos vem do §2.

**Fluxo do operador:**

1. Painel de cobranças vencidas — filtro "Negativação disponível" mostra invoices `ELEGIVEL`.
2. Card da cobrança exibe: aluno, responsável (nome + CPF mascarado `***.***.XXX-XX`), valor da dívida, dias de atraso.
3. Botão "Negativar" abre modal de confirmação com: valor da dívida, taxa (R$29,90), quem paga a taxa (`negativacaoFeePayer`), aviso sobre CDC.
4. Após confirmação: POST Asaas, status muda para `NEGATIVADO`, botão vira "Solicitar Baixa" + "Opt-out".
5. "Solicitar Baixa" abre segundo modal ("Tem certeza? Isso cancela o registro no SPC/Serasa.") -> DELETE Asaas.
6. "Opt-out" abre modal com aviso: "O responsável sairá permanentemente da régua de negativação. A dívida não será registrada no bureau em cobranças futuras." -> `optOut = true`.
7. Status `REGULARIZADO`: exibe data da regularização e motivo (baixa manual / pagamento / opt-out).

**CPF:** sempre exibido como `maskCpf()` na UI. O helper `maskCpf` já deve existir ou ser criado em `src/lib/utils/mask-cpf.ts`.

---

## 9. Definition of Done (binário)

```bash
pnpm typecheck && pnpm test:run && pnpm dlx playwright test negativacao --reporter=line
```

Playwright E2E deve cobrir:

1. Invoice vencida ha 16 dias com `enablesSpc=true` aparece como `ELEGIVEL` no painel.
2. Clicar "Negativar" -> modal exibe CPF mascarado + valor + taxa -> confirmar -> status vira `NEGATIVADO`.
3. Clicar "Solicitar Baixa" -> confirmar -> status vira `REGULARIZADO`.
4. Clicar "Opt-out" -> responsável marcado -> nova invoice do mesmo responsável nao aparece como elegivel.
5. `enablesSpc=false` -> nenhuma invoice aparece no painel de negativação.
6. Erro do Asaas no POST -> status volta para `ELEGIVEL`, mensagem de erro exibida.

---

## 10. Decisões fechadas

1. **Model Dunning e novo** — nao reusar campo de Invoice. Relação 1:1 Invoice -> Dunning, `Dunning.invoiceId` como FK.
2. **4 status internos** (`EMAVISO` / `ELEGIVEL` / `NEGATIVADO` / `REGULARIZADO`) mapeados sobre os 3 status Asaas. `EMAVISO` e um evento, nao um estado do model; `warningSentAt` registra quando ocorreu.
3. **Opt-out e permanente por responsável** — implementado como `Dunning.optOut` (por invoice). Em futuras iterações, avaliar `Guardian.dunningOptOut` (por responsável). Por ora: opt-out em um Dunning nao impede criacao de Dunning em outras invoices do mesmo Guardian — flag e por registro. Task de melhoria: adicionar `Guardian.dunningOptOut` (out of scope nesta spec).
4. **CPF nao vai no payload do dunning** — o Asaas ja tem o customer cadastrado (`Guardian.asaasCustomerId`); a vinculação e via `payment` (que ja aponta pro customer). Nao descriptografar CPF pra enviar novamente.
5. **Taxa R$29,90 e cobrada pela escola no fluxo 09** — este fluxo apenas registra `feeCents = 2990`. O lançamento na fatura e out of scope aqui.
6. **Aviso CDC e responsabilidade do Asaas** — o Asaas envia o aviso obrigatório de 10 dias antes da inclusão. A IX registra `warningSentAt` via webhook/polling mas nao e responsável pelo envio.
7. **Baixa automatica no pagamento** — quando o webhook do fluxo 03 informar `RECEIVED` ou `CONFIRMED` em uma invoice com `Dunning.status = NEGATIVADO`, o sistema deve solicitar baixa automaticamente (DELETE /paymentDunnings).

---

## 11. Pendências

1. **Webhook Asaas para dunning** — verificar se Asaas emite evento de confirmação de dunning (`DUNNING_REQUESTED` / `DUNNING_RECEIVED` ja existem em `AsaasNotificationEvent` como constantes mas nao como handlers). Implementar handler para setar `warningSentAt` e confirmar transição `PENDING -> CONFIRMED`. Verificar eventos reais na doc Asaas Sandbox.
2. **`Guardian.dunningOptOut` global** — decidir se opt-out e por invoice (este fluxo) ou por responsável (melhoria futura). Documentado em decisão 3. Avaliar na Fatia 3.
3. **Polling vs webhook** — se Asaas nao emitir webhook de dunning, precisamos de polling periódico em `GET /paymentDunnings/{id}` para confirmar `PENDING -> CONFIRMED`. Avaliar na implementação.
4. **Payload Asaas extra** — a doc oficial do Asaas pode exigir campos adicionais de cliente (`customerName`, `customerCpfCnpj`, `customerPrimaryPhone`, `customerAddress`) que nao aparecem no `AsaasCreateDunningPayload` atual. Confirmar no Sandbox antes de codificar. Se necessário, expandir a interface e descriptografar o CPF apenas na borda de saída.
5. **Fatura da escola (fluxo 09)** — quando `negativacaoFeePayer = ESCOLA`, o `feeCents` deve ser incluído na próxima fatura mensal da escola. Integração out of scope aqui; registrar `feeCents` no Dunning e suficiente para o fluxo 09 consumir.

---

## 12. Fatiamento em Task Contracts

### Fatia 1 — Schema + Migration + tipos Asaas

**Objetivo:** criar o model `Dunning`, enum `DunningStatus`, e expandir `AsaasCreateDunningPayload` / `AsaasDunning` se necessário.

**Scope in:**
- `prisma/schema.prisma` — model `Dunning` + enum `DunningStatus` + relação em `Invoice`
- `prisma/migrations/` — migration `add-dunning`
- `src/lib/integration/asaas/types.ts` — verificar/expandir `AsaasCreateDunningPayload` e `AsaasDunning`

**Nao incluido:** UI, service, API route.

**DoD:**
```bash
pnpm prisma migrate dev --name add-dunning && pnpm prisma generate && pnpm typecheck
```

---

### Fatia 2 — Service de negativação + mock

**Objetivo:** implementar `DunningService` com `createDunning`, `removeDunning`, `markOptOut`. Funcionar com mock client.

**Scope in:**
- `src/lib/services/dunning.service.ts` (novo)
- Guards: `enablesSpc`, `elegibilidade` (+15d), `optOut`
- Conversão de borda (reais -> centavos)
- Baixa automática ao receber pagamento (hook no webhook handler existente do fluxo 03)
- Testes unitários `dunning.service.test.ts`

**Nao incluido:** UI, API route, webhook handler novo.

**DoD:**
```bash
pnpm test:run --reporter=verbose src/lib/services/dunning.service.test.ts
```

---

### Fatia 3 — API Route + opt-out + auditoria

**Objetivo:** expor endpoints internos para UI acionar negativação, baixa e opt-out.

**Scope in:**
- `src/app/api/dunnings/route.ts` — POST (criar) + GET (listar por unitId)
- `src/app/api/dunnings/[id]/route.ts` — DELETE (baixa) + PATCH (opt-out)
- Autenticação Clerk + guard `unitId`
- `actorId` gravado em toda ação
- `maskCpf` helper em `src/lib/utils/mask-cpf.ts`

**Nao incluido:** UI, telas, webhook.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/dunnings
```

---

### Fatia 4 — UI: painel de negativação + modais

**Objetivo:** telas de status (ELEGIVEL / NEGATIVADO / REGULARIZADO), modal de confirmação, modal de opt-out, CPF mascarado.

**Scope in:**
- `src/app/(app)/cobrancas/negativacao/page.tsx` (novo — painel)
- Componentes: `DunningStatusCard`, `DunningConfirmModal`, `DunningOptOutModal`
- Exibição dos 4 status com timeline CDC
- CPF sempre via `maskCpf()`
- Responsivo 375/768/1440, Alfabeto DS

**Nao incluido:** webhook, baixa automática (ja feita na Fatia 2).

**DoD:**
```bash
pnpm typecheck && pnpm dlx playwright test negativacao --reporter=line
```
E2E cobre todos os cenários do §9.

---

### Fatia 5 — Webhook Asaas dunning + reconciliação

**Objetivo:** handler para eventos de dunning do Asaas (`DUNNING_REQUESTED`, `DUNNING_RECEIVED`) e polling de fallback.

**Scope in:**
- `src/app/api/webhooks/asaas/route.ts` — adicionar cases de dunning
- Setar `warningSentAt`, confirmar `PENDING -> CONFIRMADO` no status Asaas
- Script de reconciliação para dunnings em `PENDING` ha >1h (cron ou action manual)

**Nao incluido:** UI nova, mudança no service.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/webhooks/asaas
```

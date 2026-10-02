# Spec — Fluxo 045: Régua de Cobrança + Negativação Automática

> **Fase:** MVP · **Ordem:** 04.5 (entre cobrança automática e portal do responsável)
> **Status:** fechada (PRD-aligned, Claude + Rafa, 2026-07-09)
> **Substitui:** mvp-04 (parte régua) e mvp-05 (negativação manual). NFS-e do mvp-04 → P1 pós-core.
> **Fonte de verdade:** `prd-education-hub-mvp.md` (Módulo 3, fonte prioritária) + doc oficial Asaas (`POST/DELETE/GET /paymentDunnings`) + `prisma/schema.prisma` + decisões de produto abaixo.
> **Fonte prioritária:** prd-education-hub-mvp.md (second brain) — este doc implementa M3.
> **DS:** Alfabeto.

---

## 1. Objetivo

Rodar uma régua de cobrança **própria e configurável por escola** (não a régua nativa do Asaas) que dispara lembrete pré-vencimento, dois avisos de atraso, e — se a dívida persistir — **negativação automática** no SPC/Serasa via Asaas, sem intervenção humana. A escola configura os prazos de cada etapa; a secretaria pode pausar a régua de um aluno específico ou (via Guardian) tirar um responsável definitivamente da negativação. Quando a dívida é paga, a baixa da negativação é automática.

**DoD (Rafa):** uma cobrança `OVERDUE` sem pausa/opt-out percorre sozinha lembrete → aviso 1 → aviso 2 → negativação nos prazos configurados pela escola, tudo auditado em log; pagar a cobrança negativada cancela a negativação automaticamente; pausar um aluno ou marcar opt-out no responsável impede a régua de agir, tudo verificado via Playwright E2E em sandbox Asaas com relógio simulado.

---

## 2. Dados necessários

### 2a. Piso Asaas

**Notificação (lembrete/avisos) — nativa via customer, sem endpoint dedicado:**
O Asaas dispara WhatsApp/email de cobrança quando `notificationDisabled=false` no customer (já setado no fluxo 02) e o `Payment` tem vencimento configurado. Custo: **R$ 0,55/mensagem**. Não há um endpoint próprio de "enviar lembrete" — a régua PRÓPRIA da Education X decide QUANDO considerar a etapa cumprida e registra no `DunningLog`; o envio real de WhatsApp/email é feito via notificação nativa do customer Asaas (reaproveitado) ou, se granularidade por etapa for necessária, via `POST /notifications` (ver pendência P1).

**Negativação — `POST /paymentDunnings`**

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
| `feeValue` | number | Taxa Asaas (**R$ 9,90**, valor do PRD — substitui R$29,90 do rascunho mvp-05) |
| `netValue` | number | Líquido |

Endpoints adicionais:
- `GET /paymentDunnings/{id}` — consulta status (fallback polling)
- `DELETE /paymentDunnings/{id}` — solicitar baixa (usado na baixa automática)

**Nota:** o Asaas cuida do aviso legal obrigatório (CDC art. 43 — 10 dias antes da inclusão). A Education X registra `warningSentAt` quando o Asaas confirma o envio, mas não é responsável por disparar esse aviso legal.

### 2b. Negócio

| Dado | Descrição |
|---|---|
| `DunningConfig` (1:1 Unit) | prazos configuráveis de cada etapa da régua + liga/desliga |
| `DunningLog` | 1 linha por etapa disparada em uma Invoice — auditoria + idempotência |
| `Dunning` | 1:1 com Invoice negativada — dados da negativação em si (Asaas) |
| `Enrollment.dunningPaused` | pausa a régua para TODAS as invoices dessa matrícula |
| `Guardian.dunningOptOut` | opt-out permanente — avisos continuam, negativação nunca ocorre |
| `Invoice.status` (extensão) | novos valores `NEGATIVATED` e `REGULARIZED` |

Escala de custos (exibida na UI de configuração da régua): **WhatsApp/email R$ 0,55 por mensagem** (lembrete, aviso 1, aviso 2) · **negativação R$ 9,90 por cobrança**.

### 2c. Fiscal / NFS-e

Não aplicável. NFS-e é fora de escopo desta spec (P1 pós-core — ver §13 do prompt original / decisão fechada com Rafa).

### 2d. Compliance / LGPD

| Campo | Classificação | Tratamento |
|---|---|---|
| `Guardian.cpfEnc` | PII sensível | Já criptografado (fluxo 02); reutilizado via `Invoice.enrollment.guardian`, nunca reenviado no payload do dunning — o Asaas usa o customer já cadastrado |
| `Guardian.dunningOptOut` | Preferência de produto, não PII | Plaintext OK |
| `DunningLog.result` | Log operacional | Não armazenar payload cru do Asaas com PII; apenas status/mensagem de erro |
| Log de auditoria | Toda ação da régua (cron) e toda ação manual (aprovação/pausa/opt-out) | `DunningLog` grava `action` + `createdAt` + `result`; negativação manual grava `Dunning.actorId` (clerkUserId; `null` = automática pela régua) |

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolução |
|---|---|---|---|---|---|---|
| `DunningConfig.reminderDaysBefore` | PRD M3 | Sim | **FALTA** | — | Sim (tela settings) | Novo model `DunningConfig`, default 5 |
| `DunningConfig.warning1DaysAfter` | PRD M3 | Sim | **FALTA** | — | Sim | Novo model, default 3 |
| `DunningConfig.warning2DaysAfter` | PRD M3 | Sim | **FALTA** | — | Sim | Novo model, default 10 |
| `DunningConfig.negativationDaysAfter` | PRD M3 | Sim | **FALTA** | — | Sim | Novo model, default 30 |
| `DunningConfig.active` | PRD M3 | Sim | **FALTA** | — | Sim (toggle) | Novo model, default true |
| `asaasPaymentId` | Invoice (fluxo 03) | Sim | Existe (`Invoice.asaasPaymentId`) | `payment` | Não | Ler direto do Invoice |
| `type = CREDIT_BUREAU` | Produto | Sim | Constante no código | `type` | Implícito | Hardcoded no service |
| `asaasDunningId` | Asaas resposta | Sim | **FALTA** — criar `Dunning.asaasDunningId` | `id` (resposta) | Não | Persistir após POST |
| `Dunning.valueCents` | Asaas resposta | Sim | **FALTA** | `value` (resposta, reais) | Não | Converter `value * 100` |
| `Dunning.feeCents` | Produto | Sim | **FALTA** | `feeValue` (resposta) | Sim (escala de custo) | `Int?`, sem default no schema; tipicamente ~990 (R$9,90) na prática, persistido a partir da resposta Asaas |
| `Invoice.status = NEGATIVATED/REGULARIZED` | Produto | Sim | **FALTA** — estender enum `InvoiceStatus` | — | Sim (dashboard F5) | Adicionar 2 valores ao enum existente |
| `DunningLog.action/timestamp/result` | Produto | Sim | **FALTA** | — | Sim (histórico da cobrança) | Novo model `DunningLog` |
| `Enrollment.dunningPaused` | PRD M3 (R3.3) | Sim | **FALTA** | — | Sim (toggle na lista) | Novo campo Boolean em Enrollment |
| `Guardian.dunningOptOut` | Herdado spec 05, agora global | Sim | **FALTA** | — | Sim (ação "opt-out") | Novo campo Boolean em Guardian |
| `warningSentAt` | Asaas (aviso CDC) | Não (auditoria) | **FALTA** | evento de aviso Asaas | Sim (timeline) | Campo em `Dunning` |
| `actorId` (auditoria manual) | Clerk session | Sim (ações manuais) | **FALTA** | — | Não | `Dunning.actorId String?` (`null` = negativação automática pela régua) |
| Etapa da régua por invoice | Derivado | N/A | Derivado de `DunningLog` | — | Sim (dashboard F5) | Função `getReguaEtapa(invoiceId)` — não persiste, calcula |

---

## 4. Deltas de schema

```prisma
// ─── Enums novos ──────────────────────────────────────────────────────────────

enum DunningAction {
  REMINDER        // D-5: lembrete pré-vencimento
  WARNING1        // D+3: aviso de atraso
  WARNING2        // D+10: aviso final (negativação iminente)
  NEGATIVATION    // D+30: negativação automática confirmada
  CANCELLATION    // baixa automática (pagamento recebido)
}

enum DunningStatus {
  NEGATIVATED // POST /paymentDunnings confirmado pelo Asaas
  REGULARIZED // baixa dada (DELETE /paymentDunnings ou pagamento recebido)
}

// ─── Estender enum existente (fluxo 03) ──────────────────────────────────────
// Adicionar aos valores de InvoiceStatus:
//   NEGATIVATED   // negativada no SPC/Serasa
//   REGULARIZED   // negativação cancelada (pagamento recebido)

// ─── Models novos ─────────────────────────────────────────────────────────────

model DunningConfig {
  id     String @id @default(cuid())
  unitId String @unique

  reminderDaysBefore    Int     @default(5)  // D-5: lembrete antes do vencimento
  warning1DaysAfter     Int     @default(3)  // D+3: primeiro aviso de atraso
  warning2DaysAfter     Int     @default(10) // D+10: aviso final
  negativationDaysAfter Int     @default(30) // D+30: negativação automática

  active Boolean @default(true) // liga/desliga a régua inteira da unidade

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@map("dunning_configs")
}

model DunningLog {
  id        String        @id @default(cuid())
  unitId    String
  invoiceId String
  action    DunningAction
  result    String        // "success" | "error: <mensagem curta, sem PII>" — ver SCHEMA-CONSOLIDADO para vocabulario canonico ("sent"/"skipped_opt_out"/"failed" tambem aceitos)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  // Idempotencia: nunca repetir a MESMA action com sucesso para a MESMA invoice (regra de negocio, nao constraint de banco — ver nota abaixo)
  @@index([unitId])
  @@index([invoiceId, action])
  @@map("dunning_logs")
}

model Dunning {
  id        String        @id @default(cuid())
  unitId    String
  invoiceId String        @unique // 1:1 com Invoice

  // Asaas
  asaasDunningId String? // preenchido apos POST /paymentDunnings
  status         DunningStatus @default(NEGATIVATED)

  // Valores em centavos (conversao de borda)
  valueCents Int? // divida negativada (response.value * 100)
  feeCents   Int? // taxa negativacao (response.feeValue * 100; ~R$9,90 = 990 na pratica, sem default fixo no schema)

  // Auditoria / timeline
  warningSentAt DateTime? // quando Asaas confirmou aviso CDC (10 dias antes)
  requestedAt   DateTime? // quando POST /paymentDunnings foi confirmado
  resolvedAt    DateTime? // quando baixa foi dada (DELETE /paymentDunnings) ou pagamento recebido

  // Auditoria — null quando a negativacao foi automatica (regua), preenchido (clerkUserId) quando manual
  actorId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([unitId, status]) // dashboard (f2-01)
  @@map("dunnings")
}

// ─── Adicionar ao Enrollment (existente, fluxo 02) ────────────────────────────
// dunningPaused Boolean @default(false)  // pausa a regua para TODAS as invoices desta matricula

// ─── Adicionar ao Guardian (existente, fluxo 02) ──────────────────────────────
// dunningOptOut Boolean @default(false)  // avisos continuam; negativacao NUNCA ocorre

// ─── Adicionar ao Invoice (existente, fluxo 03) ───────────────────────────────
// dunningLogs DunningLog[]
// dunning     Dunning?

// ─── Adicionar ao Unit (existente) ────────────────────────────────────────────
// dunningConfig DunningConfig?
// dunningLogs   DunningLog[]
// dunnings      Dunning[]
```

**Nota sobre idempotência:** `DunningLog` não tem `@@unique([invoiceId, action])` porque uma falha (`result = "error: ..."`) deve poder ser reprocessada no próximo cron. A regra de negócio (não o banco) garante que uma `action` só é pulada se já existir log com `result = "success"` para aquela invoice+action (ver R2 e R8).

---

## 5. Contratos Asaas

### 5a. POST /paymentDunnings — negativação automática

**Quando:** D+30 (ou `negativationDaysAfter` configurado), disparado pelo cron, sem intervenção humana.

```json
POST https://sandbox.asaas.com/api/v3/paymentDunnings
Authorization: ${ASAAS_API_KEY}

{
  "payment": "pay_abc123xyz",
  "type": "CREDIT_BUREAU",
  "description": "Negativação automática — Escola Modelo — venc. 15/05/2026"
}
```

Resposta esperada:
```json
{
  "id": "dun_xyz456",
  "status": "PENDING",
  "dunningNumber": 1,
  "requestDate": "2026-06-15",
  "value": 380.00,
  "feeValue": 9.90,
  "netValue": 370.10
}
```

Conversão de borda (reais → centavos): `value * 100` → `Dunning.valueCents`; `feeValue * 100` → `Dunning.feeCents` (sem default no schema; persistir sempre o valor real retornado pelo Asaas).

**Ação pós-retorno:** `Dunning.asaasDunningId = response.id`, `Dunning.requestedAt = now()`, `Dunning.status = NEGATIVATED`, `Invoice.status = NEGATIVATED`, `DunningLog{action: NEGATIVATION, result: "success"}`. Se disparado manualmente por um operador, `Dunning.actorId = clerkUserId`; se automático pelo cron, `Dunning.actorId = null`.

**Rollback se o POST falhar:** `DunningLog{action: NEGATIVATION, result: "error: <mensagem>"}`; `Invoice.status` permanece `OVERDUE`; próxima rodada do cron tenta novamente (idempotência: não existe log de sucesso ainda).

### 5b. DELETE /paymentDunnings/{id} — baixa automática

**Quando:** webhook `PAYMENT_RECEIVED` chega para uma Invoice com `status = NEGATIVATED`.

```
DELETE https://sandbox.asaas.com/api/v3/paymentDunnings/dun_xyz456
Authorization: ${ASAAS_API_KEY}
```

Retorna 200 OK ou erro. **Ação pós-retorno:** `Dunning.resolvedAt = now()`, `Dunning.status = REGULARIZED`, `Invoice.status = REGULARIZED`, `DunningLog{action: CANCELLATION, result: "success"}`.

**Falha na baixa:** logar `DunningLog{action: CANCELLATION, result: "error: <mensagem>"}`, manter `Invoice.status = NEGATIVATED` (pagamento já registrado em `Invoice.paidAt` pelo fluxo 03) — não bloqueia o pagamento, apenas a baixa do bureau fica pendente para retry manual/próxima rodada.

### 5c. GET /paymentDunnings/{id} — fallback de polling

**Quando:** um `Dunning` fica em `PENDING` (sem confirmação `CONFIRMED`) por mais de 1 hora — o cron diário também executa essa checagem de reconciliação para dunnings pendentes.

```
GET https://sandbox.asaas.com/api/v3/paymentDunnings/dun_xyz456
```

Usado para confirmar transição `PENDING → CONFIRMED` quando o webhook de dunning não chega (Asaas pode não emitir webhook dedicado — ver pendência).

### 5d. Notificação de lembrete/avisos (D-5, D+3, D+10)

Reaproveita a notificação nativa do customer Asaas (WhatsApp + email, `notificationDisabled=false`, já configurado no fluxo 02). A régua PRÓPRIA da Education X decide a data de cada etapa (não a régua nativa do Asaas — essa é desligada/ignorada como fonte de verdade de timing); o disparo real da mensagem é delegado ao mecanismo de notificação já ativo no customer. Se o Asaas não permitir granularidade de "enviar aviso agora" fora do fluxo automático nativo, a alternativa é `POST /notifications` com o `paymentId` (a confirmar em sandbox — ver Pendência P1).

**Cada etapa D-5/D+3/D+10 grava `DunningLog{action, result}` independente de o envio de notificação em si ser via API dedicada ou via reconfirmação do customer** — a auditoria da régua não depende do mecanismo de envio.

### 5e. Sandbox-first

Todas as chamadas usam `ASAAS_ENV=sandbox` (`https://sandbox.asaas.com/api/v3`) até o fluxo estar validado end-to-end.

---

## 6. Regras de negócio (EARS)

**R1 — Cron diário, escopo de varredura:**
WHEN o cron `/api/cron/dunning` roda (diariamente às 8h BRT, `0 11 * * *` UTC) THEN o sistema SHALL varrer todas as `Invoice` com `status IN (PENDING, OVERDUE)` cuja `Unit.dunningConfig.active = true`.

**R2 — Idempotência por etapa:**
WHEN o cron avalia uma Invoice THEN o sistema SHALL calcular a etapa devida (ver §9) e SHALL NOT disparar uma `action` que já possua `DunningLog` com `result = "success"` para essa mesma Invoice.

**R3 — Etapa D-5 (lembrete):**
WHEN `diasVsVencimento = -DunningConfig.reminderDaysBefore` (ex.: vencimento em 5 dias) THEN o sistema SHALL disparar notificação de lembrete e gravar `DunningLog{action: REMINDER}`.

**R4 — Etapa D+warning1 (aviso 1):**
WHEN `diasVsVencimento >= DunningConfig.warning1DaysAfter` AND Invoice ainda não paga AND não há log `WARNING1` com sucesso THEN o sistema SHALL disparar aviso de atraso e gravar `DunningLog{action: WARNING1}`.

**R5 — Etapa D+warning2 (aviso 2):**
WHEN `diasVsVencimento >= DunningConfig.warning2DaysAfter` AND Invoice ainda não paga AND não há log `WARNING2` com sucesso THEN o sistema SHALL disparar aviso final (menciona negativação iminente) e gravar `DunningLog{action: WARNING2}`.

**R6 — Etapa D+negativation (negativação automática):**
WHEN `diasVsVencimento >= DunningConfig.negativationDaysAfter` AND Invoice ainda não paga AND `Enrollment.dunningPaused = false` AND `Guardian.dunningOptOut = false` AND não há log `NEGATIVATION` com sucesso THEN o sistema SHALL chamar `POST /paymentDunnings` automaticamente, sem aprovação manual, e gravar o resultado em `DunningLog{action: NEGATIVATION}`.

**R7 — Pausa por matrícula bloqueia TUDO:**
IF `Enrollment.dunningPaused = true` THEN o sistema SHALL NOT disparar nenhuma ação da régua (nem lembrete, nem avisos, nem negativação) para nenhuma Invoice dessa Enrollment, e SHALL NOT gravar `DunningLog` para essas invoices enquanto a pausa estiver ativa.

**R8 — Opt-out do responsável bloqueia só a negativação:**
IF `Guardian.dunningOptOut = true` THEN o sistema SHALL continuar disparando `REMINDER`, `WARNING1` e `WARNING2` normalmente, mas SHALL NOT disparar `NEGATIVATION` para nenhuma Invoice vinculada a esse Guardian (em qualquer Enrollment).

**R9 — DunningConfig inativa:**
IF `DunningConfig.active = false` (ou `DunningConfig` inexistente para a Unit) THEN o sistema SHALL pular inteiramente a Unit no cron — nenhuma ação, nenhum log.

**R10 — Catch-up (cron ficou dias sem rodar):**
WHEN o cron identifica que uma Invoice está elegível para múltiplas etapas simultaneamente (ex.: cron não rodou por 20 dias e a invoice já passou de D-5, D+3 e D+10) THEN o sistema SHALL disparar **apenas a etapa mais avançada devida** (a de maior `diasVsVencimento` cujo threshold foi ultrapassado) e SHALL NOT disparar as etapas intermediárias já "puladas" — evita spam de notificações atrasadas.

**R11 — Timezone BRT nas fronteiras:**
WHEN o sistema calcula `diasVsVencimento` THEN o cálculo SHALL usar a data corrente em fuso `America/Sao_Paulo` (BRT/BRST), comparando `dueDate` (armazenado em UTC-meia-noite) contra a data BRT do momento do cron. A fronteira D+29/D+30 SHALL respeitar a virada de dia em BRT, não em UTC (o cron roda às 11h UTC = 8h BRT, então a data BRT do cron é sempre a mesma independente de horário de verão).

**R12 — Invoice paga entre etapas (régua para):**
WHEN uma Invoice muda para `status = PAID` (webhook `PAYMENT_RECEIVED`, fluxo 03) THEN o sistema SHALL considerar a régua encerrada para essa Invoice — o cron SHALL NOT disparar nenhuma etapa adicional (a query do cron já filtra por `status IN (PENDING, OVERDUE)`, então PAID é automaticamente excluída).

**R13 — Falha Asaas em notificação (etapa de aviso) não bloqueia o cron:**
IF o disparo de `REMINDER`, `WARNING1` ou `WARNING2` falhar (erro de API/rede) THEN o sistema SHALL gravar `DunningLog{result: "error: <mensagem>"}`, seguir processando as demais invoices do cron, e permitir que a MESMA etapa seja retentada no próximo dia (idempotência: sem log de sucesso, a etapa continua devida).

**R14 — Falha Asaas em negativação (`POST /paymentDunnings`) faz rollback de estado:**
IF o `POST /paymentDunnings` falhar THEN o sistema SHALL manter `Invoice.status = OVERDUE` (não promover para `NEGATIVATED`), gravar `DunningLog{action: NEGATIVATION, result: "error: <mensagem>"}`, e retentar na próxima rodada do cron.

**R15 — Cancelamento de invoice para a régua:**
WHEN `Invoice.status` muda para `CANCELLED` (ação manual, qualquer momento) THEN o sistema SHALL excluir essa Invoice das varreduras futuras do cron (query já filtra por `PENDING`/`OVERDUE`) e SHALL NOT disparar nenhuma etapa pendente.

**R16 — Múltiplas invoices vencidas do mesmo Guardian:**
WHEN um Guardian tem mais de uma Invoice vencida simultaneamente (ex.: 2 alunos, ambos inadimplentes) THEN o sistema SHALL processar a régua de cada Invoice de forma independente — cada uma com seu próprio `diasVsVencimento`, seu próprio `DunningLog`, e sua própria decisão de negativar (exceto que `Guardian.dunningOptOut = true` bloqueia negativação em TODAS elas igualmente).

**R17 — Baixa automática ao receber pagamento em invoice negativada:**
WHEN o webhook `PAYMENT_RECEIVED` chega para uma Invoice com `status = NEGATIVATED` THEN o sistema SHALL chamar `DELETE /paymentDunnings/{Dunning.asaasDunningId}` automaticamente, gravar `DunningLog{action: CANCELLATION}`, e setar `Invoice.status = REGULARIZED` + `Dunning.status = REGULARIZED` + `Dunning.resolvedAt = now()`.

**R18 — Fallback de polling para dunning pendente:**
IF um `Dunning.asaasDunningId` existe mas está há mais de 1 hora sem confirmação (`status` Asaas ainda `PENDING`) THEN o cron diário SHALL chamar `GET /paymentDunnings/{id}` para reconciliar o status antes de processar novas negativações daquela Unit.

---

## 7. Estados e transições

### 7a. Máquina de estados da negativação (Invoice.status, subset relevante)

```
                         ┌──────────────────────────────────────────┐
                         │        [Enrollment.dunningPaused]         │
                         │   régua nao age em NENHUMA etapa          │
                         └──────────────────────────────────────────┘

PENDING ──[vencimento]──► OVERDUE ──[D+negativationDaysAfter, sem pausa/opt-out]──► NEGATIVATED ──[baixa]──► REGULARIZED
   │                         │                                                          │
   │                         │                                                          └──[pagamento recebido
   │                         │                                                               (webhook automatico)]──► REGULARIZED
   │                         │
   │                         └──[pagamento recebido antes de D+30]──► PAID  (régua encerra, sem negativar)
   │
   └──[cancelamento manual]──► CANCELLED  (régua exclui da varredura)

Guardian.dunningOptOut = true:
  OVERDUE nunca avança para NEGATIVATED (R6 bloqueia), mas segue recebendo REMINDER/WARNING1/WARNING2 normalmente.
```

### 7b. Etapas da régua (derivado de DunningLog — usado no dashboard F5)

| Etapa exibida | Condição derivada |
|---|---|
| `NONE` | Nenhum `DunningLog` para a Invoice |
| `REMINDED` | Log `REMINDER` com sucesso, sem `WARNING1` |
| `WARNED1` | Log `WARNING1` com sucesso, sem `WARNING2` |
| `WARNED2` | Log `WARNING2` com sucesso, sem `NEGATIVATION` |
| `NEGATIVATED` | Log `NEGATIVATION` com sucesso, sem `CANCELLATION` (equivale a `Invoice.status = NEGATIVATED`) |
| `REGULARIZED` | Log `CANCELLATION` com sucesso OU `Invoice.status = PAID`/`REGULARIZED` |

Função de derivação: `getReguaEtapa(invoiceId)` — não persiste um campo próprio; lê `DunningLog` ordenado por `timestamp DESC` e retorna a etapa mais avançada com `result = "success"`, cruzando com `Invoice.status` para o caso `PAID`.

---

## 8. Fluxo de coleta (UX, referência ao design)

Não há protótipo/design-handoff específico para este fluxo (régua é 100% backend + cron; UI é settings + coluna informativa).

**Tela de settings da régua (`/dashboard/configuracoes/regua`):**
- 4 campos numéricos: "Lembrete X dias antes do vencimento", "Primeiro aviso X dias após", "Segundo aviso X dias após", "Negativação X dias após" — inputs `<input type="number">` com validação (todos > 0, negativationDaysAfter > warning2DaysAfter > warning1DaysAfter > 0).
- Toggle "Régua ativa" (liga/desliga tudo).
- Bloco de "Escala de custos" (somente leitura, informativo): "WhatsApp/email: R$ 0,55 por mensagem · Negativação: R$ 9,90 por cobrança".
- Botão "Salvar" — persiste `DunningConfig`.

**Coluna "Etapa da régua" na lista de cobranças (dashboard F5, Módulo 5):**
- Badge colorido por etapa: `NONE` (cinza) / `REMINDED` (azul claro) / `WARNED1` (amarelo) / `WARNED2` (laranja) / `NEGATIVATED` (preto) / `REGULARIZED` (verde).
- Ação rápida "Pausar régua" por linha → seta `Enrollment.dunningPaused = true` (com confirmação, pois afeta TODAS as invoices da matrícula).
- Ação "Opt-out do responsável" no detalhe do Guardian → seta `Guardian.dunningOptOut = true` (com aviso: "avisos continuam sendo enviados; a dívida nunca será registrada no SPC/Serasa").

---

## 9. Definition of Done (binário)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration aplicada
pnpm prisma migrate deploy

# 3. Unit tests do calculo de etapa — fronteiras criticas BRT
pnpm test:run -- dunning-engine
# Prova: D+29 NAO dispara negativacao, D+30 dispara, D+31 (catch-up) dispara so a etapa mais avancada,
#        calculo respeita America/Sao_Paulo

# 4. E2E Playwright - regua completa com relogio simulado (4 etapas)
pnpm dlx playwright test dunning-full-cycle --reporter=line
# Prova: invoice OVERDUE avanca REMINDER -> WARNING1 -> WARNING2 -> NEGATIVATED,
#        cada etapa com DunningLog{result: "success"}, sem repeticao de etapa ja logada

# 5. E2E Playwright - pausa (zero acao)
pnpm dlx playwright test dunning-paused --reporter=line
# Prova: Enrollment.dunningPaused=true -> cron roda -> ZERO DunningLog criado para invoices dessa enrollment

# 6. E2E Playwright - baixa automatica
pnpm dlx playwright test dunning-auto-cancellation --reporter=line
# Prova: Invoice NEGATIVATED -> webhook PAYMENT_RECEIVED -> DELETE /paymentDunnings chamado ->
#        Invoice.status = REGULARIZED, Dunning.status = REGULARIZED, Dunning.resolvedAt preenchido

# 7. E2E Playwright - opt-out (avisos sim, negativacao nao)
pnpm dlx playwright test dunning-optout --reporter=line
# Prova: Guardian.dunningOptOut=true -> cron dispara REMINDER/WARNING1/WARNING2 normalmente ->
#        ao chegar D+negativationDaysAfter, NENHUM DunningLog{action: NEGATIVATION} e criado,
#        Invoice.status permanece OVERDUE
```

Fluxo toca dinheiro e reputação de crédito (negativação SPC/Serasa): DoD obrigatoriamente inclui Playwright E2E com relógio simulado, sandbox Asaas only — nunca produção nos testes.

---

## 10. Decisões fechadas

1. **Régua própria e configurável substitui a régua nativa Asaas.** A régua nativa (3 dias antes/no dia/após vencimento, não configurável) descrita no mvp-04 é abandonada — a Education X controla o timing das etapas via `DunningConfig`.
2. **Negativação é automática, não manual.** Diferente do mvp-05 (operador clica "Negativar" em um painel), esta spec dispara `POST /paymentDunnings` via cron sem intervenção humana quando a etapa é atingida.
3. **Taxa de negativação é R$ 9,90 (não R$ 29,90).** Valor corrigido conforme PRD M3 — o valor do rascunho mvp-05 estava desatualizado.
4. **Pausa é por Enrollment (matrícula), não por Invoice.** Uma pausa cobre todas as cobranças passadas e futuras daquela matrícula — não é preciso pausar invoice a invoice.
5. **Opt-out é por Guardian (global), não por Dunning/Invoice.** Substitui a decisão do mvp-05 de "opt-out por registro" — resolve a pendência P2 daquela spec adotando o campo global desde o início.
6. **Catch-up dispara só a etapa mais avançada devida.** Evita floodar o responsável com lembrete + aviso1 + aviso2 no mesmo dia se o cron ficou parado.
7. **DunningLog não tem unique constraint — idempotência é regra de negócio.** Permite reprocessar etapas que falharam sem quebrar o registro de auditoria de tentativas anteriores.
8. **NFS-e (parte do mvp-04) não faz parte desta spec.** Reclassificada como P1 pós-core — decisão de escopo do Rafa (2026-07-09): régua e negativação são o problema de caixa/inadimplência, NFS-e é obrigação fiscal que pode esperar a primeira venda validar o resto.
9. **Aviso CDC (10 dias) continua responsabilidade do Asaas.** Herdado do mvp-05 — a Education X apenas registra `warningSentAt`, não dispara o aviso legal ela mesma.
10. **Cron diário único (não por evento).** Todas as etapas (lembrete, avisos, negativação, reconciliação de polling) rodam na mesma execução diária às 8h BRT — simplicidade sobre latência (uma etapa pode atrasar até 24h no pior caso, aceitável para o MVP).

---

## 11. Pendências

| # | Pendência | Impacto | Resolução sugerida |
|---|---|---|---|
| P1 | Mecanismo exato de disparo de `REMINDER`/`WARNING1`/`WARNING2` — reaproveitar notificação nativa do customer Asaas ou usar `POST /notifications` dedicado? | Bloqueante para a Fatia 3 | Validar em sandbox Asaas antes de codificar; se não houver endpoint de disparo avulso, a alternativa é atualizar/reagendar o `dueDate` de notificação do customer (efeito colateral a evitar) — decisão técnica na implementação da Fatia 3 |
| P2 | Webhook dedicado de confirmação de dunning (`DUNNING_REQUESTED`/`DUNNING_RECEIVED`) existe no Asaas? | Afeta se a confirmação `PENDING → CONFIRMED` é via webhook ou só via polling (R18) | Verificar na doc/sandbox Asaas antes da Fatia 4; se não existir, o polling do cron diário é suficiente para o MVP |
| P3 | Custo real de WhatsApp/email por notificação — confirmar se é cobrado por etapa disparada ou por mensagem efetivamente entregue | Afeta a exibição da "escala de custos" na UI | Validar com o financeiro do Asaas/contrato antes de expor valor definitivo na UI (R$0,55 é o valor do PRD, usar como está por ora) |
| P4 | Envio de e-mail interno para a escola quando uma negativação é confirmada (alerta) | UX — Requisito P1 do PRD M3, não bloqueante | Fora de escopo desta spec; considerar junto ao Módulo 5 (dashboard) |

---

## 12. Fatiamento em Task Contracts

### Fatia 1 — Migration: DunningConfig + DunningLog + Dunning + campos novos

**Objetivo:** criar os models novos e estender os existentes no schema Prisma.

**Scope in:**
- Novos models: `DunningConfig`, `DunningLog`, `Dunning`
- Novos enums: `DunningAction`, `DunningStatus`
- Estender enum `InvoiceStatus` com `NEGATIVATED`, `REGULARIZED`
- Adicionar `dunningPaused Boolean @default(false)` em `Enrollment`
- Adicionar `dunningOptOut Boolean @default(false)` em `Guardian`
- Relações em `Unit` e `Invoice`

**Não incluído:** nenhuma lógica de aplicação, nenhuma rota ou componente.

**DoD:**
```bash
pnpm prisma migrate dev --name add-dunning-config-log
pnpm typecheck
# exit 0
```

---

### Fatia 2 — DunningEngine service (cálculo de etapa + idempotência)

**Objetivo:** service puro que, dado uma Invoice + DunningConfig + data atual (injetável para testes), retorna a etapa devida (ou `null`), respeitando idempotência, pausa e opt-out.

**Scope in:**
- `src/lib/services/dunning-engine.service.ts` (novo) — função `getEtapaDevida(invoice, config, logs, now)` pura, sem I/O
- Cálculo de `diasVsVencimento` em `America/Sao_Paulo`
- Lógica de catch-up (retorna só a etapa mais avançada)
- Lógica de idempotência (ignora etapas já logadas com sucesso)
- Lógica de pausa (`Enrollment.dunningPaused`) e opt-out (`Guardian.dunningOptOut`) — pausa bloqueia tudo, opt-out bloqueia só `NEGATIVATION`
- Testes unitários cobrindo fronteiras D+29/D+30/D+31, BRT, catch-up, pausa, opt-out

**Não incluído:** chamadas Asaas, cron route, UI.

**DoD:**
```bash
pnpm test:run -- dunning-engine
# exit 0 = todas as fronteiras testadas passam
```

---

### Fatia 3 — Cron route + notificações (lembrete/avisos)

**Objetivo:** rota `/api/cron/dunning` que varre invoices, chama o `DunningEngine`, dispara notificações das etapas `REMINDER`/`WARNING1`/`WARNING2`, grava `DunningLog`.

**Scope in:**
- `src/app/api/cron/dunning/route.ts` (novo) — protegido por `Authorization: Bearer ${CRON_SECRET}`
- Configuração `vercel.json` com cron `0 11 * * *` (8h BRT)
- Integração com cliente Asaas existente para disparo de notificação (resolver P1 antes de codificar)
- Persistência de `DunningLog` por etapa processada (sucesso ou erro)
- Skip de Units com `DunningConfig.active = false` ou inexistente

**Não incluído:** negativação (Fatia 4), UI (Fatia 5).

**DoD:**
```bash
pnpm typecheck && pnpm test:run -- cron/dunning
pnpm dlx playwright test dunning-reminders-warnings --reporter=line
# exit 0 = REMINDER/WARNING1/WARNING2 disparados nos prazos corretos, DunningLog gravado
```

---

### Fatia 4 — Negativação automática + baixa automática (webhook)

**Objetivo:** estender o cron para disparar `POST /paymentDunnings` na etapa `NEGATIVATION`, e estender o webhook handler existente do fluxo 03 para chamar `DELETE /paymentDunnings` quando `PAYMENT_RECEIVED` chega numa Invoice `NEGATIVATED`.

**Scope in:**
- Extensão do cron da Fatia 3: chamada `POST /paymentDunnings` quando `DunningEngine` retorna `NEGATIVATION`
- Rollback de estado em caso de erro (R14)
- Extensão do webhook handler `src/app/api/webhooks/asaas/route.ts` (fluxo 03): case para `PAYMENT_RECEIVED` em Invoice `NEGATIVATED` → `DELETE /paymentDunnings/{asaasDunningId}` → `Invoice.status = REGULARIZED`
- Fallback de polling `GET /paymentDunnings/{id}` para dunnings `PENDING` há mais de 1h (executado no mesmo cron diário)

**Não incluído:** UI.

**DoD:**
```bash
pnpm typecheck && pnpm test:run -- dunning-negativation
pnpm dlx playwright test dunning-negativation-and-cancellation --reporter=line
# exit 0 = negativacao automatica confirmada em sandbox, baixa automatica ao simular PAYMENT_RECEIVED
```

---

### Fatia 5 — UI: settings da régua + coluna etapa/pausa na lista de cobranças

**Objetivo:** tela de configuração da régua (`DunningConfig`) e exibição da etapa/ações rápidas na lista de cobranças (Módulo 5).

**Scope in:**
- `src/app/(app)/dashboard/configuracoes/regua/page.tsx` (novo) — formulário dos 4 prazos + toggle `active` + bloco de escala de custos (somente leitura)
- Endpoint `GET/POST /api/units/:unitId/dunning-config`
- Coluna "Etapa da régua" na lista de cobranças (deriva via `getReguaEtapa`, ver §7b)
- Ação rápida "Pausar régua" (seta `Enrollment.dunningPaused`) com modal de confirmação
- Ação "Opt-out do responsável" no detalhe do Guardian (seta `Guardian.dunningOptOut`) com modal de aviso
- Responsivo Alfabeto DS

**Não incluído:** email semanal de resumo (P1 do PRD M3), exportação CSV.

**DoD:**
```bash
pnpm typecheck && pnpm dlx playwright test dunning-settings-ui --reporter=line
# exit 0 = configuracao salva e refletida no proximo cron; pausa/opt-out funcionam via UI
```
</content>

# Spec — Antecipação de Recebíveis

> **Fase:** Fase 2 · **Ordem:** 03
> **Status:** rascunho (Rafa + Claude, 2026-07-03). Fatiada de `08-saque-antecipacao` — parte Fase 2.
> **Fonte de verdade:** doc oficial Asaas (GET /anticipations/limits, POST /anticipations/simulate, POST /anticipations) + `prisma/schema.prisma` + protótipo (`screens-fin.jsx`, só UX).
> **DS:** Alfabeto.
> **Par + dependência:** requer a tela `/financeiro` e o saldo já entregues por `mvp-06-transferencia-saldo` (MVP). Esta spec só adiciona o modal de antecipação e o model `Anticipation`.

---

## 1. Objetivo

Permitir que a escola antecipe recebíveis de cartão presos em D+X, recebendo o valor líquido na hora, com cálculo transparente de taxa antes de confirmar. **Fase 2** — o saque básico (`mvp-06`) já fecha o ciclo financeiro do MVP; a antecipação é conveniência adicional que só entra se a dor puxar.

**DoD (Rafa):** na tela `/financeiro`, a diretora seleciona recebíveis de cartão para antecipar, vê o cálculo de taxa (confirmado pela API antes de efetivar) e recebe o líquido. Nenhuma antecipação sem confirmação explícita. Sandbox primeiro.

---

## 2. Dados necessários (o coração)

### 2a. Piso Asaas: antecipação (3 chamadas)

**Passo 1: GET /anticipations/limits** — quanto posso antecipar?
| Campo | Tipo | Descrição |
|---|---|---|
| `limit` | number (reais) | Máximo antecipável no período |
| `hasDocumentationRequired` | boolean | Se precisa enviar documentação |

**Passo 2: POST /anticipations/simulate** — calcular taxa antes de confirmar.
Payload: `payment` (id do payment, se avulso) OU `installment` (se parcelado).
Retorna por item: `payment`, `anticipationDate`, `originalDate`, `daysAntecipated`, `fee`, `totalValue`, `netValue`, `isDocumentationRequired`.

**Passo 3: POST /anticipations** — efetivar (só após simulação + confirmação).
Payload: `payment` OU `installment`; `documents` (condicional, se `isDocumentationRequired`).
Retorna: `id` (`ant_xxxx`), `status` (`AWAITING_APPROVAL`/`APPROVED`/`DENIED`), `fee`, `netValue`, `anticipationDate`.

### 2c. Negócio

| Dado | Origem | Para que serve |
|---|---|---|
| Recebíveis elegíveis | Asaas GET /payments?status=CONFIRMED&billingType=CREDIT_CARD | Listar o que pode ser antecipado |
| Taxa de antecipação | 1,99% a.m. proporcional aos dias (`bruto * 0.0199 * dias/30`) | Estimativa local instantânea (a oficial vem do simulate) |

### 2d. Compliance / LGPD

| Campo | Classificação | Tratamento |
|---|---|---|
| `Anticipation.asaasId` | Financeiro operacional | Sem PII; referência de auditoria |

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório | Prisma | Campo Asaas | No design | Resolução |
|---|---|---|---|---|---|---|
| Recebíveis de cartão elegíveis | GET /payments?billingType=CREDIT_CARD&status=CONFIRMED | Sim | Não armazenado — tempo real | `payment.id` | Lista com checkbox, valor, dias, taxa | Consultar ao abrir o modal; mapear para itens selecionáveis |
| Taxa simulada | Local (estimativa) + POST /anticipations/simulate (oficial) | Sim (antes de confirmar) | `Anticipation.feeCents` (NOVO) — persiste pós-confirmação | `fee` (do simulate) | Resumo: "Taxa Education X" + "Você recebe hoje" | Chamar simulate ao confirmar; exibir antes do botão |
| ID da antecipação | POST /anticipations | Pós-confirmação | `Anticipation.asaasId` (NOVO) | `id` do retorno | Não exibido | Persiste para auditoria |

---

## 4. Deltas de schema

Model novo desta spec: `Anticipation`. (`BankAccount`/`Transfer` já existem via `mvp-06`.)

```prisma
enum AnticipationStatus {
  PENDING           // simulada, aguardando ação do usuário
  AWAITING_APPROVAL // enviada ao Asaas, aguardando aprovação interna
  APPROVED          // aprovada, crédito realizado
  DENIED            // recusada pelo Asaas
  ERROR             // falha na chamada POST /anticipations
}

model Anticipation {
  id     String @id @default(cuid())
  unitId String

  asaasPaymentIds Json // ["pay_aaa", "pay_bbb"] — os payments antecipados

  grossAmountCents Int // soma dos brutos
  feeCents         Int // taxa total
  netAmountCents   Int // gross - fee (o que cai na conta)

  status  AnticipationStatus @default(PENDING)
  asaasId String?            // "ant_xxxx"

  anticipatedAt DateTime? // data de crédito
  confirmedAt   DateTime? // quando ANTICIPATION_APPROVED chegou

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@map("anticipations")
}

// Em Unit: adicionar
// anticipations Anticipation[]
```

---

## 5. Contratos Asaas

Com a API key da subconta. Ver `mvp-06` §5 para o padrão de borda.

- **GET /anticipations/limits** → `{ "limit": 5000.00, "hasDocumentationRequired": false }`. Chamar ao abrir o modal.
- **POST /anticipations/simulate** `{ "payment": "pay_xxx" }` → retorna taxa oficial por item. Converter `fee*100`, `totalValue*100`, `netValue*100`.
- **POST /anticipations** `{ "payment": "pay_xxx" }` → `{ "id": "ant_...", "status": "AWAITING_APPROVAL", ... }`. Salvar `asaasId`, `status`.

---

## 6. Regras de negócio (EARS)

**RN-05:** WHEN usuário abre modal de antecipação THEN o sistema SHALL chamar GET /anticipations/limits e listar recebíveis de cartão (CONFIRMED, CREDIT_CARD).
**RN-06:** WHEN usuário (des)seleciona um recebível THEN o sistema SHALL recalcular o resumo localmente (`bruto * 0.0199 * dias/30`) para feedback instantâneo.
**RN-07:** WHEN usuário tenta confirmar THEN o sistema SHALL chamar POST /anticipations/simulate por item, exibir os valores oficiais e SÓ ENTÃO liberar "Antecipar".
**RN-08:** WHEN usuário confirma THEN o sistema SHALL chamar POST /anticipations por item, registrar Anticipation AWAITING_APPROVAL e exibir toast.
**RN-09:** WHEN Asaas retorna erro THEN registrar, exibir mensagem clara, não deixar status de sucesso.
**RN-10:** IF `isDocumentationRequired = true` THEN exibir aviso antes da confirmação.
**RN-12:** WHEN webhook `ANTICIPATION_APPROVED` chega THEN atualizar `status = APPROVED` e `anticipatedAt`.
**RN-14:** WHEN não há recebíveis elegíveis THEN exibir estado vazio: "Sem recebíveis de cartão para antecipar no momento."

---

## 7. Estados e transições

```
[usuário confirma + POST /anticipations]
        v
  AWAITING_APPROVAL --(ANTICIPATION_DENIED)--> DENIED [terminal]
        |--(ANTICIPATION_APPROVED)--> APPROVED [terminal]
        |--(erro na chamada POST)--> ERROR
```
PENDING é interno antes de chamar o Asaas (janela de retry); após 200, vira AWAITING_APPROVAL.

---

## 8. Fluxo de coleta (UX, referência ao design)

**Fonte:** `screens-fin.jsx`. O botão "Antecipar recebíveis" (ghost) na tela `/financeiro` (de `mvp-06`) abre este modal.

### Modal de antecipação
1. Ícone "zap" + "Antecipar recebíveis".
2. Subtítulo com a taxa (1,99% a.m. proporcional).
3. Lista selecionável (checkbox): pagamento, data original de liberação, dias antecipados, taxa estimada, valor bruto.
4. Resumo fixo: bruto selecionado, taxa (Education X), "Você recebe hoje" (destacado).
5. Cancelar + "Antecipar R$ XXX" (off se nada selecionado).
6. Antes de confirmar: POST /anticipations/simulate para validar a taxa oficial.
7. Pós: toast "Antecipação enviada para aprovação".

**Divergência design vs regra (P-01):** o design calcula a taxa local e confirma direto; a regra exige simulate antes. O botão só habilita após simulate. Estado intermediário "Verificando taxa...".

---

## 9. Definition of Done (binário)

```bash
pnpm typecheck && pnpm test:run

# Migration com o model desta spec
pnpm prisma migrate dev --name add-anticipation && \
grep -E "model Anticipation" prisma/schema.prisma | wc -l | grep -q "^1$"

# Antecipação: selecionar itens, simular, confirmar (simulate antes do botão ativar)
pnpm dlx playwright test financeiro-antecipacao --reporter=line
# Sem recebíveis: modal exibe estado vazio sem erro de JS
pnpm dlx playwright test financeiro-antecipacao-vazia --reporter=line
```
Toca dinheiro real: DoD inclui Playwright E2E, só sandbox.

---

## 10. Decisões fechadas

- **D-03 — Cálculo no modal é estimativa local; a confirmação exige simulate.** Feedback instantâneo ao selecionar; taxa oficial da API antes de efetivar.
- **D-04 — Uma chamada POST /anticipations por payment ID.** 3 recebíveis = 3 chamadas sequenciais. Registrar 1 Anticipation com `asaasPaymentIds` (JSON array) e `feeCents` somado.
- **D-05 — Centavos no app, reais na borda Asaas.**
- **D-06 — Sandbox primeiro, produção só com confirmação do Rafa.**
- **D-07 — unitId em todos os models novos.**

---

## 11. Pendências

- **P-01 — Discrepância design vs simulate:** UI precisa de estado "Verificando taxa..." antes de confirmar.
- **P-02 — Webhook ANTICIPATION_APPROVED:** handler no event bus (ver `mvp-03`). Não bloqueia o fluxo (fica AWAITING_APPROVAL), mas obrigatório para o DoD completo.
- **P-04 — Filtros de recebíveis elegíveis:** confirmar billingType/status corretos na conta sandbox antes de implementar.
- **P-05 — isDocumentationRequired:** sem UI de upload por ora. Exibir aviso e deixar confirmar (Asaas entra em contato). Upload fica como pendência futura.
- **P-07 — Taxa como configuração:** 1,99% a.m. hardcoded com comentário. Se variar por plano, vira config.

---

## 12. Fatiamento em Task Contracts

Fatias ≤400 linhas, WIP = 1. Todas dependem de `mvp-06` (tela `/financeiro` + saldo) já entregue.

### Fatia 1 — Migration: Anticipation
**Objetivo:** criar o model `Anticipation` com enum e relação.
**Scope in:** `prisma/schema.prisma` (enum `AnticipationStatus`, model, relação em Unit); migration; generate.
**Não inclui:** serviço, rota, UI.
**DoD:** `pnpm prisma migrate dev --name add-anticipation && pnpm typecheck`

### Fatia 2 — AntecipacaoService
**Objetivo:** listar elegíveis, simular, efetivar.
**Scope in:** `src/lib/services/antecipacao.service.ts`: `listElegiveis(unitId)`, `simulate(unitId, paymentIds[])`, `create(unitId, paymentIds[])`. Testes com mock.
**Não inclui:** webhook, UI.
**DoD:** `pnpm test:run src/lib/services/antecipacao.service.test.ts`

### Fatia 3 — Rota de API
**Objetivo:** expor antecipação.
**Scope in:** `src/app/api/financeiro/anticipations/route.ts`: GET (list elegíveis), POST (`?action=simulate|confirm`). Auth Clerk; unitId da sessão.
**Não inclui:** UI.
**DoD:** `pnpm typecheck && pnpm test:run src/app/api/financeiro/anticipations/`

### Fatia 4 — UI: modal de antecipação
**Objetivo:** modal com simulação antes de confirmar.
**Scope in:** modal (lista selecionável, resumo bruto/taxa/líquido, "Antecipar"); cálculo local ao selecionar; simulate ao confirmar; estado vazio; loading/erro/sucesso.
**Não inclui:** upload de documentos (P-05), extrato.
**DoD:** `pnpm dlx playwright test financeiro-antecipacao financeiro-antecipacao-vazia --reporter=line`

### Fatia 5 — Webhook ANTICIPATION_APPROVED / DENIED
**Objetivo:** processar eventos de antecipação.
**Scope in:** handlers em `/api/webhooks/asaas`: `ANTICIPATION_APPROVED` → `APPROVED`+`anticipatedAt`; `ANTICIPATION_DENIED` → `DENIED`. Idempotência.
**DoD:** `pnpm dlx playwright test webhook-anticipation --reporter=line`

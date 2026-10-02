# Spec — Painel da Escola: Dashboard, Relatórios e Extrato (Fluxo 06)

> **Status:** fechada (P0) — PRD-aligned, Claude + Rafa, 2026-07-09
> **Fonte de verdade:** `prisma/schema.prisma` (Invoice, Payment, Enrollment, Dunning propostos nos fluxos 02, 03 e 05) + doc Asaas `GET /payments` + protótipo (`prototipo/design-handoff/project/app/screens-d.jsx?v=10`, só UX).
> **Fonte prioritária:** `prd-education-hub-mvp.md` — implementa M5 (P0); relatórios/extrato = P1.
> **DS:** Alfabeto.

---

## 1. Objetivo

Dar à escola uma visão financeira consolidada dos dados que já existem no banco. **P0** entrega o Dashboard com 4 KPIs, tabela de inadimplência (com etapa da régua e ação de pausa) e gráfico de recebido por semana — a fatia que fecha o M5 do PRD. **P1** (pós-core, só se sobrar tempo) adiciona a aba Relatórios (4 sub-relatórios com gráficos intercambiáveis), a aba Extrato com reconciliação Asaas, RecoveryHero, e-mail semanal e export CSV.

Fluxo é majoritariamente de leitura. A única escrita em P0 é o toggle de pausa da régua (`ação rápida` na tabela de inadimplência) — ver RN-14. Fora isso, nenhuma escrita em banco, nenhuma chamada Asaas de mutação.

**DoD (Rafa) — P0:** conseguir abrir o painel, ver os 4 KPIs corretos (Total previsto / Total recebido / Total vencido / Total negativado, calculados do banco local), ver a tabela de inadimplência com etapa da régua por aluno e conseguir pausar a régua de um aluno, filtrar por status/período/matéria, e visualizar o gráfico de recebido por semana (últimos 3 meses). Typecheck + testes de unidade das queries + testes de render dos componentes principais. Playwright E2E pesado não é obrigatório (fluxo não toca dinheiro), mas pode ter teste de render de tela completa.

**DoD (Rafa) — P1:** navegar entre os 4 relatórios trocando tipo de gráfico, ver o bloco RecoveryHero com o funil de recuperação de inadimplência, visualizar o Extrato com filtro de período e reconciliação Asaas.

---

## 2. Dados necessários (o coração)

A pergunta-guia: quais campos de quais entidades cada KPI e relatório consome?

### 2a-0. P0 — KPIs, Tabela de Inadimplência e Gráfico (M5 do PRD)

#### KPIs do Dashboard — P0 (4 cards, conforme PRD M5)

| KPI | Query | Campos consumidos | Entidades |
|---|---|---|---|
| **Total previsto mês** | `SUM(Invoice.netAmountCents) WHERE status IN (PENDING, PAID) AND referenceMonth = mes_atual` | `netAmountCents`, `status`, `referenceMonth`, `unitId` | Invoice |
| **Total recebido** | `SUM(Invoice.netAmountCents) WHERE status=PAID AND paidAt BETWEEN [inicio, fim]` | `netAmountCents`, `paidAt`, `status`, `unitId` | Invoice |
| **Total vencido** | `SUM(Invoice.netAmountCents) + COUNT(DISTINCT studentId) WHERE status=OVERDUE` | `netAmountCents`, `status`, `unitId`, `studentId` (via Enrollment) | Invoice + Enrollment |
| **Total negativado** | `SUM(Invoice.netAmountCents) + COUNT(DISTINCT studentId) WHERE Invoice.status=NEGATIVATED` | `netAmountCents`, `status`, `studentId` | Invoice + Enrollment |

> Nomenclatura padronizada em inglês no SCHEMA-CONSOLIDADO: `Invoice.status PAID` = "recebido"; `Invoice.status NEGATIVATED` = "negativado" (setado pelo fluxo de negativação `mvp-045-regua-negativacao.md` via `DunningLog{action: NEGATIVATION}`). Não há mais divergência EN/PT-BR — ver §11 (P-07 fechada).

#### Tabela de Inadimplência — P0 (mudança principal desta spec vs. rascunho anterior)

Lista de alunos com cobrança em `OVERDUE` (ou com `Dunning` ativo), uma linha por aluno/invoice vencida.

| Coluna | Entidade | Campo | Observação |
|---|---|---|---|
| Aluno | Student (via Enrollment) | `nameEnc` | Descriptografado no service (RN-08) |
| Matéria | Subject (via Enrollment) | `name` | Join Enrollment → Subject |
| Valor | Invoice | `netAmountCents` | Centavos → reais na exibição |
| Dias de atraso | Invoice | `dueDate` | `hoje - dueDate` em dias |
| Etapa da régua | `DunningLog` (join) + Invoice | `DunningLog.action`, `DunningLog.result`, `DunningLog.timestamp` | Derivada — ver regras EARS RN-11..RN-13. Rótulos de exibição: `NONE` (nenhum log), `REMINDER`, `WARNING1`, `WARNING2`, `NEGATIVATION`, `CANCELLATION` |
| Ação rápida | Enrollment | `dunningPaused` (toggle) | Ver RN-14 — única escrita da tela |

**Nota de shape sobre "etapa da régua":** a régua completa (lembrete D-5, aviso D+3, aviso D+10, negativação D+30) está modelada em `mvp-045-regua-negativacao.md`, que define o model `DunningLog` (1 linha por etapa disparada em uma Invoice, campo `action: DunningAction { REMINDER | WARNING1 | WARNING2 | NEGATIVATION | CANCELLATION }`) e a função de derivação `getReguaEtapa(invoiceId)` (§7b daquela spec): lê `DunningLog` ordenado por `timestamp DESC` e retorna a ação mais avançada com `result = "success"` para a Invoice; `NONE` se não houver nenhum log. Esta spec reusa essa mesma derivação — nenhuma lógica nova, apenas leitura do `DunningLog` já modelado.

**Ação rápida — pausar régua:** usa `Enrollment.dunningPaused` (Boolean, `mvp-045-regua-negativacao.md` e SCHEMA-CONSOLIDADO), que pausa a régua para TODAS as invoices da matrícula. Ver RN-14 e decisão 12 (§10).

#### Filtros — P0

Status (Todas / Pagas / A vencer / Vencidas / Negativadas), período (mês corrente por padrão, seletor livre), matéria (select de Subjects).

#### Gráfico de linha — P0

Recebido por semana, últimos 3 meses. Query: `GROUP BY` semana ISO sobre `Invoice.paidAt WHERE status=PAID`, filtrado por `unitId`.

---

### 2a. Piso Asaas — GET /payments (reconciliação no Extrato) — P1

A fonte primária de todos os dados é o banco local (Invoice / Payment dos fluxos 03). O Asaas é consultado **apenas** no Extrato para reconciliação pontual — quando a escola quer verificar se o saldo local está alinhado com o Asaas.

Filtros disponíveis em `GET /payments` (doc oficial confirmada):

| Parâmetro | Tipo | Uso no Extrato |
|---|---|---|
| `customer` | string | Filtrar por Guardian (asaasCustomerId) |
| `status` | enum | `PENDING`, `RECEIVED`, `CONFIRMED`, `OVERDUE` |
| `billingType` | enum | `BOLETO`, `PIX`, `CREDIT_CARD` |
| `externalReference` | string | Localizar Invoice.id no Asaas |
| `dateCreated[ge]` / `dateCreated[le]` | string YYYY-MM-DD | Faixa de criação |
| `dueDate[ge]` / `dueDate[le]` | string YYYY-MM-DD | Faixa de vencimento |
| `paymentDate[ge]` / `paymentDate[le]` | string YYYY-MM-DD | Faixa de pagamento recebido |
| `subscription` | string | Filtrar por assinatura (não usado aqui) |
| `offset` / `limit` | integer | Paginação (max 100 por página) |

O Extrato faz `GET /payments?dueDate[ge]=<inicio>&dueDate[le]=<fim>&offset=...` e compara com Invoice local por `externalReference`. Divergências são sinalizadas (não corrigidas automaticamente).

### 2b. Negócio — campos consumidos por KPI e relatório — P1 (extensão pós-core)

> Os 4 KPIs P0 estão em §2a-0. Esta seção descreve KPIs adicionais (ticket médio, taxa de inadimplência, alunos ativos) e blocos que só entram em P1.

#### KPIs adicionais do Dashboard — P1

| KPI | Query | Campos consumidos | Entidades |
|---|---|---|---|
| **A vencer** | `SUM(Invoice.netAmountCents) WHERE status=PENDING AND dueDate >= today` | `netAmountCents`, `dueDate`, `status`, `unitId` | Invoice |
| **Alunos ativos** | `COUNT(DISTINCT Enrollment.studentId) WHERE status=ACTIVE` | `studentId`, `status`, `unitId` | Enrollment |
| **Ticket médio** | `Recebido / COUNT(Invoices PAID no mes)` | derivado dos acima | Invoice |
| **Taxa de inadimplência** | `SUM(OVERDUE) / (SUM(OVERDUE) + SUM(PAID))` no mes | derivado | Invoice |

#### RecoveryHero (bloco de destaque no Dashboard) — P1

Funil de recuperação de inadimplência — a métrica nº1 de venda do produto:

| Etapa do funil | Query | Campos |
|---|---|---|
| **Vencidas** | `COUNT(Invoice) WHERE status=OVERDUE AND unitId=?` | `status`, `unitId` |
| **Em negativação** | `COUNT(Invoice) WHERE status=NEGATIVATED AND unitId=?` | `status`, `unitId` |
| **Recuperadas no mês** | `COUNT(Invoice) WHERE status=PAID AND paidAt >= inicio AND EXISTS(Dunning WHERE invoiceId=Invoice.id)` | `status`, `paidAt`, `invoiceId` | Invoice + Dunning |
| **Valor recuperado** | `SUM(Invoice.netAmountCents)` dos recuperados acima | `netAmountCents` | Invoice |
| **Taxa de recuperação** | `Recuperadas / Vencidas (acumulado últimos 90d)` | derivado | Invoice + Dunning |

#### Sub-relatórios (aba 2) — P1

**R1 — Cobrança**
Visão da régua de cobranças no período selecionado.

| Campo | Entidade | Uso |
|---|---|---|
| `referenceMonth` | Invoice | Agrupar por mês |
| `netAmountCents` | Invoice | Soma por status |
| `status` | Invoice | Série: PAID / PENDING / OVERDUE |
| `billingType` | Invoice (via Asaas — não existe hoje, ver §4) | Breakdown por forma de pagamento |
| `dueDate` | Invoice | Eixo X (timeline) |

Série de dados: `[{ mes: "2026-05", pago: 12000000, avencer: 3000000, vencido: 1500000 }, ...]`

**R2 — Inadimplência**
Evolução da inadimplência e do funil de recuperação.

| Campo | Entidade | Uso |
|---|---|---|
| `status = OVERDUE` | Invoice | Série "Inadimplentes" por mês |
| `status = NEGATIVATED` | Invoice | Série "Em negativação" |
| `status = REGULARIZED` | Invoice | Série "Recuperados" |
| `Dunning.feeCents` | Dunning | Custo total de recuperação |
| `netAmountCents` | Invoice (das OVERDUE) | Valor inadimplente |

**R3 — Crescimento**
Evolução de receita, alunos e matrículas.

| Campo | Entidade | Uso |
|---|---|---|
| `createdAt` | Enrollment | Matrículas novas por mês |
| `status = ACTIVE` | Enrollment | Total de alunos ativos |
| `cancelledAt` | Enrollment | Cancelamentos (churn) |
| `netAmountCents` (PAID) | Invoice | MRR realizado por mês |
| `studentId` (DISTINCT) | Enrollment | Alunos únicos |

**R4 — Cancelamentos**
Análise de churn e motivos.

| Campo | Entidade | Uso |
|---|---|---|
| `cancelledAt` | Enrollment | Data do cancelamento |
| `status = CANCELLED` | Enrollment | Contagem de cancelamentos |
| `subjectId` | Enrollment | Cancelamentos por matéria |
| `plan` | Enrollment | Cancelamentos por plano |
| `netAmountCents` | Invoice (últimas das Enrollments canceladas) | MRR perdido |

Churn MRR = `SUM(finalPriceCents das Enrollments canceladas no período)`

#### Extrato (aba 3) — P1

Lista paginada de Invoices com detalhamento de Payments.

| Campo | Entidade | Exibição |
|---|---|---|
| `referenceMonth` | Invoice | Competência |
| `dueDate` | Invoice | Vencimento |
| `paidAt` | Invoice | Data pagamento |
| `netAmountCents` | Invoice | Valor (centavos -> reais na exibição) |
| `status` | Invoice | Badge colorido |
| `asaasPaymentId` | Invoice | Link externo para Asaas |
| `Guardian.name` | Guardian (via Enrollment -> Guardian) | Responsável |
| `Student.nameEnc` | Student (descriptografado) | Aluno |
| `Subject.name` | Subject (via Enrollment) | Matéria |
| `Dunning.status` | Dunning (optional join) | Flag se em negativação |

### 2c. Fiscal / NFS-e

Não aplicável neste fluxo. O painel exibe valores de cobrança, não emite notas.

### 2d. Compliance / LGPD

| Campo PII | Entidade | Tratamento no painel |
|---|---|---|
| `Student.nameEnc` | Student | Descriptografar AES-256-GCM apenas para exibição no Extrato; nunca serializar em cache |
| `Guardian.emailEnc` / `Guardian.phoneEnc` | Guardian | Não exibidos no painel — fora de escopo |
| `Guardian.cpfEnc` | Guardian | Não exibido; se exibido futuramente, sempre mascarado (`maskCpf`) |

Todos os dados do painel são filtrados por `unitId` da sessão Clerk. Nenhum dado de outra Unit pode vazar.

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolução |
|---|---|---|---|---|---|---|
| `Invoice.netAmountCents` | Invoice (fluxo 03) | Sim (P0) | Existe (fluxo 03) | n/a (banco local) | KPIs, gráficos | Ler direto do banco |
| Etapa da régua (tabela inadimplência) | Derivado — `DunningLog` + Invoice | Sim (P0) | `DunningLog` existe (`mvp-045-regua-negativacao.md`) | n/a | Tabela de inadimplência | Derivar via `getReguaEtapa(invoiceId)` (RN-12), reusando a função definida em `mvp-045-regua-negativacao.md` §7b |
| `Enrollment.dunningPaused` | Enrollment | Sim (P0, ação rápida) | Existe (`mvp-045-regua-negativacao.md` e SCHEMA-CONSOLIDADO) | n/a | Ação rápida "pausar régua" | Usar `Enrollment.dunningPaused` diretamente (RN-14) |
| `Invoice.status` | Invoice (fluxo 03) | Sim | Existe (enum InvoiceStatus) | n/a | Filtro de todos os KPIs | Ler direto do banco |
| `Invoice.paidAt` | Invoice (fluxo 03) | Sim | Existe | n/a | Série temporal R1, Extrato | Ler direto do banco |
| `Invoice.dueDate` | Invoice (fluxo 03) | Sim | Existe | `dueDate` (reconciliação) | A vencer, Extrato | Ler banco; Asaas só em reconciliação |
| `Invoice.referenceMonth` | Invoice (fluxo 03) | Sim | Existe (`String "2026-06"`) | n/a | Agrupamento R1/R3 | Ler direto do banco |
| `Invoice.asaasPaymentId` | Invoice (fluxo 03) | Para reconciliação | Existe | `id` (match) | Extrato (link externo) | Ler banco; match com Asaas no Extrato |
| `Payment.paidAt` / `Payment.amountCents` | Payment (fluxo 03) | Sim | Existe | n/a | Detalhe do Extrato | Join Invoice -> Payment |
| `Enrollment.status` | Enrollment (fluxo 02) | Sim | Existe (enum EnrollmentStatus) | n/a | Alunos ativos, R3/R4 | Ler direto do banco |
| `Enrollment.cancelledAt` | Enrollment (fluxo 02) | Sim | Existe | n/a | R4 Cancelamentos | Ler direto do banco |
| `Enrollment.finalPriceCents` | Enrollment (fluxo 02) | Sim | Existe | n/a | MRR perdido R4 | Ler direto do banco |
| `Enrollment.studentId` | Enrollment (fluxo 02) | Sim | Existe | n/a | Alunos únicos R3 | COUNT DISTINCT |
| `Enrollment.plan` | Enrollment (fluxo 02) | Sim | Existe (enum EnrollmentPlan) | n/a | Cancelamentos por plano R4 | Ler direto do banco |
| `Enrollment.subjectId` | Enrollment (fluxo 02) | Sim | Existe | n/a | Cancelamentos por matéria R4 | Join Enrollment -> Subject |
| `Student.nameEnc` | Student (fluxo 02) | Sim (Extrato) | Existe | n/a | Extrato: nome do aluno | Descriptografar AES-256-GCM na camada de serviço |
| `Guardian.name` | Guardian (existente) | Sim (Extrato) | Existe | n/a | Extrato: responsável | Ler direto (não é PII criptografado) |
| `Subject.name` | Subject (existente) | Sim (Extrato) | Existe | n/a | Extrato: matéria | Join Enrollment -> Subject |
| `Dunning.status` | Dunning (fluxo 05) | Sim (RecoveryHero) | Existe (enum DunningStatus) | n/a | RecoveryHero, R2 | Join Invoice -> Dunning |
| `Dunning.feeCents` | Dunning (fluxo 05) | Sim (R2) | Existe | n/a | Custo de recuperação R2 | Ler direto do banco |
| `Dunning.invoiceId` | Dunning (fluxo 05) | Sim | Existe (FK) | n/a | RecoveryHero: join Invoice | JOIN Dunning -> Invoice |
| `billingType` no Extrato | Asaas (reconciliação) | Não (P1, somente reconciliação) | Não existe no banco local | `billingType` | Extrato (forma de pagamento) | P1: buscar via GET /payments no Extrato. Persistir em Invoice quando o webhook do fluxo 03 passar a trazer o campo — ver §11 P-04, nota para o fluxo 03 |
| `unitId` em todas as queries | Sessão Clerk | Sim | Existe em todos os models | n/a | Implícito | Sempre filtrar; nunca expor dados de outra Unit |

---

## 4. Deltas de schema

**Nenhum model novo.** Este fluxo é majoritariamente de leitura. Todos os dados vêm de Invoice, Payment, Enrollment, Student, Guardian, Subject, Dunning e DunningLog — propostos nos fluxos 02, 03 e 045. A única escrita de P0 é `Enrollment.dunningPaused` (toggle de pausa, RN-14) — campo já existe, nenhuma migration adicional necessária para isso.

### Índices de agregação recomendados para performance (P0 — implementar na Fatia 1)

As queries de dashboard fazem GROUP BY + SUM sobre Invoice filtrado por `unitId` + `status` + faixa de datas. Sem índices compostos, varreduras completas serão necessárias. Requisito de performance do PRD: dashboard carrega KPIs em ≤ 2s (índices por `unitId + status + vencimento`).

```prisma
// Adicionar ao model Invoice (proposto no fluxo 03):
@@index([unitId, status])
@@index([unitId, paidAt])
@@index([unitId, dueDate])
@@index([unitId, referenceMonth])

// Adicionar ao model Enrollment (proposto nos fluxos 02/03):
@@index([unitId, status])
@@index([unitId, cancelledAt])

// Adicionar ao model Dunning (proposto no fluxo 05):
@@index([unitId, status])
@@index([invoiceId])
```

### Views de agregação (opcional — PostgreSQL) — P1

Se as queries de dashboard ficarem lentas com > 10k invoices, considerar views materializadas:

```sql
-- View: KPIs mensais por unidade
CREATE MATERIALIZED VIEW unit_monthly_kpis AS
SELECT
  "unitId",
  "referenceMonth",
  SUM(CASE WHEN status = 'PAID' THEN "netAmountCents" ELSE 0 END)    AS received_cents,
  SUM(CASE WHEN status = 'PENDING' AND "dueDate" >= NOW() THEN "netAmountCents" ELSE 0 END) AS pending_cents,
  SUM(CASE WHEN status = 'OVERDUE' THEN "netAmountCents" ELSE 0 END)  AS overdue_cents,
  COUNT(CASE WHEN status = 'PAID' THEN 1 END)                          AS paid_count
FROM invoices
GROUP BY "unitId", "referenceMonth";

CREATE UNIQUE INDEX ON unit_monthly_kpis ("unitId", "referenceMonth");
```

Refresh: `REFRESH MATERIALIZED VIEW CONCURRENTLY unit_monthly_kpis` via cron ou trigger pós-webhook. **Decisão de quando criar:** não criar agora; criar apenas se queries brutas demorarem mais de 500ms em produção com dados reais.

---

## 5. Contratos Asaas — P1

Somente leitura, somente no Extrato. Nenhum contrato Asaas é chamado em P0 — o Dashboard P0 lê exclusivamente do banco local (incluindo `Dunning`, que já foi escrito pelo fluxo 05 via seus próprios contratos Asaas).

### GET /payments — reconciliação do Extrato

Endpoint: `GET https://sandbox.asaas.com/api/v3/payments`
Header: `access_token: <subconta-apiKey>`

**Query params para reconciliação de um período:**

```
GET /payments?dueDate[ge]=2026-06-01&dueDate[le]=2026-06-30&limit=100&offset=0
```

**Resposta parcial relevante:**

```json
{
  "data": [
    {
      "id": "pay_abc123",
      "status": "RECEIVED",
      "value": 450.00,
      "netValue": 449.10,
      "billingType": "BOLETO",
      "dueDate": "2026-06-10",
      "paymentDate": "2026-06-08",
      "externalReference": "inv_cjld2cyuq000h5xb6s3ek5qh"
    }
  ],
  "totalCount": 42,
  "hasMore": true,
  "limit": 100,
  "offset": 0
}
```

**Reconciliação no Extrato:**
1. Para cada item Asaas, buscar Invoice local por `externalReference = item.externalReference`.
2. Se Invoice não encontrada: marcar linha como "Cobrança sem registro local" (divergência — não corrigir automaticamente).
3. Se Invoice encontrada mas status diverge: marcar linha com badge "Divergência Asaas".
4. Exibir ao lado do status local o status Asaas como referência.

**Paginação:** iterar `offset` incrementando 100 até `hasMore = false`. Limitar a 10 páginas (1000 cobranças) por requisição de Extrato para evitar timeout.

**Conversão de borda:** `value * 100` para exibir em centavos internamente; `value` direto para exibir em reais na UI.

---

## 6. Regras de negócio (EARS)

### P0

**RN-01:** WHEN qualquer query do Dashboard for executada THEN o sistema SHALL filtrar por `unitId` extraído da sessão Clerk. Nunca usar `unitId` enviado pelo cliente.

**RN-02:** WHEN o período do Dashboard for selecionado THEN o padrão SHALL ser o mês corrente (`referenceMonth = YYYY-MM atual`). O usuário pode trocar para meses anteriores.

**RN-03:** WHEN o KPI "Total recebido" for calculado THEN o sistema SHALL usar `Invoice.paidAt` (data do evento de pagamento confirmado), não `Invoice.dueDate`.

**RN-04:** WHEN o KPI "Total previsto mês" for calculado THEN o sistema SHALL incluir Invoices com `status IN (PENDING, PAID) AND referenceMonth = mes selecionado`. Invoices com `dueDate < hoje` e status ainda `PENDING` são tratadas como `OVERDUE` (inconsistência de dados — o webhook pode ter falhado) e não contam como "previsto a vencer".

**RN-11:** WHEN a etapa da régua for exibida na tabela de inadimplência para uma Invoice `OVERDUE` THEN o sistema SHALL derivar o rótulo a partir do `DunningLog` associado à Invoice (se existir) segundo a tabela de mapeamento da RN-12. Ausência de `DunningLog` para a Invoice SHALL resultar em rótulo `NONE`.

**RN-12 (mapeamento de etapa):** reusa `getReguaEtapa(invoiceId)` de `mvp-045-regua-negativacao.md` §7b — lê `DunningLog` da Invoice ordenado por `timestamp DESC` e retorna a `action` mais avançada com `result = "success"`:
```
IF nenhum DunningLog com result="success" existe para a Invoice → etapa = NONE
IF a ação mais avançada com sucesso for REMINDER                → etapa = REMINDER
IF a ação mais avançada com sucesso for WARNING1                → etapa = WARNING1
IF a ação mais avançada com sucesso for WARNING2                → etapa = WARNING2
IF a ação mais avançada com sucesso for NEGATIVATION             → etapa = NEGATIVATION
IF a ação mais avançada com sucesso for CANCELLATION             → etapa = CANCELLATION
```

**RN-13:** WHEN dias de atraso forem exibidos na tabela de inadimplência THEN o sistema SHALL calcular `hoje - Invoice.dueDate` em dias inteiros, nunca negativo (Invoices não vencidas não aparecem nesta tabela).

**RN-14 (única escrita da tela):** WHEN a escola aciona "pausar régua" para um aluno na ação rápida THEN o sistema SHALL fazer `UPDATE Enrollment SET dunningPaused = true WHERE id = <enrollment do aluno>` e refletir o novo estado na tabela sem reload completo. Esta é a única mutação de banco permitida neste fluxo — todo o restante da spec (KPIs, filtros, gráfico, P1) é leitura pura. O toggle não chama Asaas diretamente; a pausa afeta TODAS as invoices da matrícula (bloqueia lembrete, avisos e negativação — regra definida em `mvp-045-regua-negativacao.md` RN correspondente), fora do escopo desta spec além do toggle em si.

**RN-08:** WHEN a tabela de inadimplência exibir o nome do aluno THEN o sistema SHALL descriptografar `Student.nameEnc` na camada de serviço. O campo descriptografado nunca é cacheado em Redis ou similar.

**RN-09:** WHEN a taxa de inadimplência for zero THEN o painel SHALL exibir estado vazio positivo ("Nenhuma inadimplência no período") na tabela de inadimplência.

**RN-10:** IF nenhuma Invoice existir para o período selecionado THEN os KPIs SHALL exibir zero com mensagem "Nenhuma cobrança no período".

### P1

**RN-05:** WHEN RecoveryHero exibir "Valor recuperado" THEN o sistema SHALL contar apenas Invoices com `status = PAID` que tenham um `Dunning` associado via `invoiceId`.

**RN-06:** WHEN o tipo de gráfico for trocado (barras / linha / pizza) THEN apenas a renderização muda; os dados subjacentes não são refetched.

**RN-07:** WHEN o Extrato solicitar reconciliação Asaas THEN o sistema SHALL mostrar loading e fazer as chamadas GET /payments paginadas. Se a subconta não tiver `asaasApiKey` configurada, exibir mensagem de configuração pendente e não bloquear o Extrato local.

---

## 7. Estados e transições

Este fluxo não tem máquina de estados própria (a única transição de estado é o toggle `Enrollment.dunningPaused` da RN-14). Os demais estados são apenas lidos dos models:

| Entidade | Estados lidos | Uso no painel |
|---|---|---|
| Invoice | `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `BLOCKED`, `ERROR`, `NEGATIVATED`, `REGULARIZED` | KPIs (P0), Extrato (P1), R1 (P1) |
| Enrollment | `ACTIVE`, `CANCELLED`, `SUSPENDED`, `PENDING_CONFIRMATION` | Alunos ativos (P1), R3/R4 (P1) |
| DunningLog | `REMINDER`, `WARNING1`, `WARNING2`, `NEGATIVATION`, `CANCELLATION` (via `action`) | Etapa da régua na tabela de inadimplência (P0), RecoveryHero/R2 (P1) |

Estados de erro (`BLOCKED`, `ERROR`) são exibidos no Extrato (P1) com badge específico mas não entram nas somas de KPI (não representam valor realizado nem a realizar).

---

## 8. Fluxo de coleta (UX — referência ao design)

Design de referência: `screens-d.jsx?v=10`. Screenshots: `dash2.png`, `dash3.png`, `relatorios.png`, `01-reports.png`, `02-reports.png`, `03-reports.png`.

O design ilustra layout e hierarquia visual. Campos e lógica vêm das seções 2 e 6, não do design.

### Aba 1 — Dashboard (P0)

- Topo: 4 cards de KPI em linha — **Total previsto mês / Total recebido / Total vencido (valor + qtd alunos) / Total negativado (valor + qtd alunos)**, conforme PRD M5.
- **Tabela de inadimplência:** aluno / matéria / valor / dias de atraso / etapa da régua / ação rápida (pausar régua, ver detalhes). Ver §2a-0 e RN-11..14.
- Filtros acima da tabela: status, período, matéria.
- Gráfico de linha: recebido por semana, últimos 3 meses.

### Aba 1 — Dashboard, extensões (P1)

- RecoveryHero: funil horizontal com 4 etapas (Vencidas > Em negativação > Recuperadas > Valor recuperado) + taxa de recuperação em destaque. Callout: "Você recuperou R$X,XX este mês."
- Cards adicionais de KPI: Alunos ativos, Ticket médio, Taxa de inadimplência, variação vs. mês anterior.
- Próximos vencimentos: lista dos 5 próximos (aluno, matéria, valor, data). Referência: tela C0 da spec 03.

### Aba 2 — Relatórios (P1)

- Seletor de período: mês / trimestre / semestre / ano.
- 4 cards de sub-relatório (R1 Cobrança / R2 Inadimplência / R3 Crescimento / R4 Cancelamentos). Clique em cada um expande o gráfico.
- Seletor de tipo de gráfico dentro de cada relatório: barras / linha / pizza. Referência: `01-reports.png`, `02-reports.png`, `03-reports.png`.
- Tabela de dados abaixo do gráfico (dados brutos que alimentam o gráfico, exportável como CSV).

### Aba 3 — Extrato (P1)

- Filtros: período (date range picker), status (Todas / Pagas / A vencer / Vencidas), matéria (select de Subjects), busca livre (nome aluno / responsável).
- Tabela paginada: Competência, Aluno, Matéria, Responsável, Vencimento, Pago em, Valor, Status, Asaas.
- Botão "Reconciliar com Asaas" (opcional, faz GET /payments no período selecionado e destaca divergências).
- Linha expansível: detalhe do Payment (data exata, valor com juros se houver, forma de pagamento).

---

## 9. Definition of Done (binário)

### P0

```bash
# 1. Typecheck
pnpm typecheck

# 2. Testes unitários das queries de agregação (DashboardService)
pnpm test:run src/lib/services/dashboard.service.test.ts

# 3. Testes de render dos componentes principais
pnpm test:run src/components/dashboard

# Prova dos testes unitários (obrigatória, cobre os 4 KPIs + tabela de inadimplência):
# - KPI "Total previsto mês" = SUM correto de invoices PENDING + PAID no referenceMonth
# - KPI "Total recebido" = SUM correto de invoices PAID, por paidAt (não dueDate)
# - KPI "Total vencido" = SUM + COUNT DISTINCT studentId corretos de invoices OVERDUE
# - KPI "Total negativado" = SUM + COUNT DISTINCT studentId corretos via Invoice.status=NEGATIVATED
# - Fronteiras de data: invoice com dueDate = hoje não conta como vencida; dueDate = hoje-1 conta
# - Isolamento de tenant: unitId de outra Unit nunca aparece nos resultados (Unit B não vê dados da Unit A)
# - Derivação da etapa da régua: cada combinação de DunningLog.action (ausente/REMINDER/WARNING1/WARNING2/NEGATIVATION/CANCELLATION) mapeia para o rótulo correto via getReguaEtapa (RN-12)
# - Nomes de alunos são descriptografados no serviço (mock AES retorna valor esperado)
# - Ação de pausar régua: toggle Enrollment.dunningPaused = true/false e reflete na query seguinte

# 4. Opcional: Playwright render smoke test (não E2E pesado)
# pnpm dlx playwright test dashboard-render --reporter=line
# Prova: Dashboard abre, 4 KPIs visíveis, tabela de inadimplência renderiza, filtros funcionam
```

### P1

```bash
pnpm test:run src/lib/services/report.service.test.ts
pnpm test:run src/lib/services/statement.service.test.ts
pnpm test:run src/components/reports
pnpm test:run src/components/statement
```

---

## 10. Decisões fechadas

1. **Fonte primária = banco local.** Asaas é consultado apenas no Extrato (P1) para reconciliação pontual. Os KPIs, tabela de inadimplência e relatórios nunca chamam o Asaas diretamente.

2. **Nenhum model novo.** Toda a agregação parte das entidades existentes. Índices compostos são adicionados na migration deste fluxo (não breaking).

3. **Views materializadas são opcionais (P1).** Criar apenas se queries brutas forem lentas em produção. Não criar antecipadamente.

4. **RecoveryHero (P1) é join Invoice + Dunning.** "Recuperadas" = Invoice PAID que tem Dunning associado. Não usar campo separado.

5. **Tipos de gráfico (P1) são troca de renderização client-side.** Mesmos dados, componente de gráfico intercambiável (barras / linha / pizza). Nenhuma chamada extra ao servidor na troca.

6. **Centavos no banco, reais na exibição.** Conversão `/ 100` feita exclusivamente na camada de apresentação (componente ou formatador de moeda). Nunca armazenar reais.

7. **Student.nameEnc descriptografado no serviço, nunca cacheado.** Runtime decrypt na tabela de inadimplência (P0) e no Extrato (P1). Se performance for um problema futuro, avaliar cache com TTL curto (5min) em memória de processo, nunca em Redis persistente.

8. **`billingType` não existe no banco local hoje.** P0 não depende dele. P1: persistir em Invoice quando o webhook do fluxo 03 passar a trazer o campo (ver P-04); até lá, disponível apenas via reconciliação Asaas no Extrato.

9. **Período default do Dashboard = mês corrente** (`referenceMonth = YYYY-MM`). Relatórios e Extrato (P1) têm seletor livre de período.

10. **Extrato paginado (P1).** Sem scroll infinito — paginação explícita (25 linhas por página). Reconciliação Asaas limitada a 1000 cobranças (10 páginas de 100).

11. **Etapa da régua deriva de `DunningLog` (`mvp-045-regua-negativacao.md`), reusando `getReguaEtapa(invoiceId)`.** A régua de mensageria completa (lembrete D-5, avisos D+3/D+10, negativação D+30) já está modelada naquela spec via `DunningConfig`/`DunningLog`; P0 apenas lê o resultado, sem lógica de derivação própria.

12. **Ação de pausar régua usa `Enrollment.dunningPaused`.** Campo definido em `mvp-045-regua-negativacao.md` e no SCHEMA-CONSOLIDADO (pausa a régua para TODAS as invoices da matrícula). Nenhum campo/model novo necessário nesta fatia — reusa o que a spec de negativação já provê.

13. **(ex-P-07, fechada) Nomenclatura padronizada em inglês.** O SCHEMA-CONSOLIDADO define todos os enums em inglês (`InvoiceStatus`, `DunningStatus`, `DunningAction`) — não há mais divergência EN/PT-BR entre PRD e schema; a spec original usava nomenclatura em português por não ter visto o schema consolidado.

---

## 11. Pendências

**P-01 — Variação mês a mês nos KPIs:** os cards de KPI podem mostrar "+12% vs mês anterior". **Resolvido:** 2 queries paralelas (mês atual + mês -1), sem window function — simples é suficiente agora. Otimizar apenas se profiling mostrar necessidade.

**P-02 — Exportação CSV do Extrato: movida para P1.** Não está no DoD do P0. Fica junto da Fatia de Extrato/relatórios.

**P-03 — Reconciliação Asaas no Extrato: movida para P1.** **Resolvido:** limitar reconciliação a períodos de no máximo 31 dias OU 1000 registros (10 páginas de 100), o que vier primeiro. Ao atingir o limite, exibir mensagem "Período muito longo para reconciliar de uma vez — reduza o intervalo ou reconcilie em partes" e interromper a paginação sem erro.

**P-04 — `billingType` no Invoice:** hoje o banco não armazena a forma de pagamento (boleto / PIX) no Invoice. **Resolvido:** persistir em `Invoice.billingType` quando o campo vier do webhook Asaas (`PAYMENT_RECEIVED`). Nota registrada para o fluxo 03 revisar o handler do webhook — fora do escopo de implementação desta spec (P1, quando os relatórios precisarem do campo sem reconciliação).

**P-05 — RecoveryHero com zero Dunnings: movida para P1** (bloco só existe em P1). Definir copy/estado vazio que não confunda ("Ative a negativação para recuperar dívidas") quando `enablesSpc=false`.

**P-06 — Atualização em tempo real dos KPIs:** quando um webhook de pagamento chega, os KPIs do Dashboard ficam desatualizados até a próxima navegação. **Resolvido:** `revalidatePath` do Next.js acionado pelo webhook handler (fluxo 03) — sem SSE. Nota registrada para o fluxo 03 adicionar a chamada de revalidação na rota de webhook.

**P-07 — Fechada.** Ver decisão 13 (§10): SCHEMA-CONSOLIDADO padroniza nomenclatura em inglês, sem divergência remanescente.

**P-08 — Fechada.** Ver decisão 12 (§10): `Enrollment.dunningPaused` existe em `mvp-045-regua-negativacao.md`/SCHEMA-CONSOLIDADO e é usado diretamente, sem campo intermediário.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de até 400 linhas. WIP = 1 por vez.

---

## P0 — fatias core (implementar agora)

### Fatia 1 — Migration: índices de agregação

**Objetivo:** adicionar índices compostos nos models Invoice, Enrollment e Dunning para performance das queries de dashboard.

**Scope in:**
- `prisma/schema.prisma` — adicionar `@@index` compostos descritos no §4 em Invoice, Enrollment, Dunning.
- `prisma/migrations/` — migration `add-dashboard-indexes`.
- `pnpm prisma generate`.

**Nao inclui:** nenhuma lógica, nenhuma rota, nenhum componente.

**DoD:**
```bash
pnpm prisma migrate dev --name add-dashboard-indexes && pnpm typecheck
```

---

### Fatia 2 — Service: DashboardService (4 KPIs + tabela de inadimplência + etapa da régua)

**Objetivo:** implementar as queries de KPI e da tabela de inadimplência, incluindo a derivação da etapa da régua, como funções testáveis.

**Scope in:**
- `src/lib/services/dashboard.service.ts` (novo):
  - `getKpis(unitId, referenceMonth)` — retorna `{ forecastCents, receivedCents, overdueCents, overdueStudents, negativatedCents, negativatedStudents, previousMonth: { ... } }` (P-01: 2 queries paralelas, mês atual + mês -1)
  - `getDelinquencyTable(unitId, filters)` — retorna linhas da tabela de inadimplência (aluno, matéria, valor, dias de atraso, etapa da régua) com join Invoice → Enrollment → Student/Subject → DunningLog (opcional)
  - `getReguaEtapa(invoiceId): 'NONE' | 'REMINDER' | 'WARNING1' | 'WARNING2' | 'NEGATIVATION' | 'CANCELLATION'` — reusa a função de `mvp-045-regua-negativacao.md` §7b, implementa o mapeamento da RN-12
  - `toggleDunningPause(unitId, enrollmentId, paused: boolean)` — única escrita; `UPDATE Enrollment SET dunningPaused = ...` com guard de `unitId` (RN-14)
  - `getWeeklyReceived(unitId, from, to)` — série para o gráfico de linha (recebido por semana, últimos 3 meses)
- Todas as funções de leitura usam Prisma `groupBy` + `_sum` + `_count`.
- `src/lib/services/dashboard.service.test.ts` — testes unitários com banco seed em memória (SQLite via `DATABASE_URL=file::memory:`).

**Nao inclui:** relatórios (P1), Extrato (P1), UI.

**DoD:**
```bash
pnpm test:run src/lib/services/dashboard.service.test.ts
```
Testes cobrem (ver §9 P0 para lista completa): 4 KPIs corretos, fronteiras de data, isolamento de tenant, `getReguaEtapa` para cada combinação de `DunningLog.action`, `toggleDunningPause` muda o estado e respeita `unitId`.

---

### Fatia 3 — API Routes + UI: Dashboard (KPIs + tabela de inadimplência + gráfico)

**Objetivo:** expor os dados via rotas e renderizar a aba Dashboard completa do P0.

**Scope in:**
- `src/app/api/dashboard/route.ts` — GET, valida sessão Clerk, chama `DashboardService.getKpis` + `getWeeklyReceived`
- `src/app/api/dashboard/delinquency/route.ts` — GET com filtros (status, período, matéria), chama `getDelinquencyTable`
- `src/app/api/dashboard/delinquency/[enrollmentId]/pause/route.ts` — PATCH, chama `toggleDunningPause` (única rota de escrita)
- `src/app/(app)/painel/page.tsx` — aba Dashboard (4 KPI cards + filtros + tabela de inadimplência + gráfico de linha)
- Componentes: `KpiCard`, `DelinquencyTable`, `ReguaStageBadge`, `PauseReguaAction`, `WeeklyReceivedChart`, `DashboardFilters`
- Responsivo 375/768/1440, Alfabeto DS
- Performance: KPIs carregam em ≤ 2s (RN de performance do PRD M5, viabilizada pelos índices da Fatia 1)

**Nao inclui:** abas Relatórios e Extrato (P1).

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/dashboard
```

---

## P1 — fatias pós-core (só se sobrar tempo)

### Fatia 4 — Service: queries de relatórios (ReportService)

**Objetivo:** implementar as 4 séries de dados dos sub-relatórios.

**Scope in:**
- `src/lib/services/report.service.ts` (novo):
  - `getBillingReport(unitId, from, to)` — R1: agrupado por mês, séries PAID/PENDING/OVERDUE
  - `getDelinquencyReport(unitId, from, to)` — R2: inadimplência + funil Dunning
  - `getGrowthReport(unitId, from, to)` — R3: matrículas novas, alunos ativos, MRR
  - `getCancellationReport(unitId, from, to)` — R4: cancelamentos por matéria e plano
  - `getRecoveryHero(unitId)` — funil de recuperação (últimos 90 dias)
- `src/lib/services/report.service.test.ts` — testes unitários.

**Nao inclui:** Extrato, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/report.service.test.ts
```

---

### Fatia 5 — Service: Extrato + reconciliação Asaas (StatementService)

**Objetivo:** queries do Extrato com descriptografia de PII e reconciliação opcional com Asaas.

**Scope in:**
- `src/lib/services/statement.service.ts` (novo):
  - `getStatement(unitId, filters)` — paginado, join Invoice/Payment/Enrollment/Student/Guardian/Subject/Dunning, descriptografa `Student.nameEnc`
  - `reconcileWithAsaas(unitId, from, to)` — chama GET /payments paginado, compara com banco, retorna lista de divergências. Limite: 31 dias ou 1000 registros (P-03)
- `src/lib/services/statement.service.test.ts`

**Nao inclui:** UI.

**DoD:**
```bash
pnpm test:run src/lib/services/statement.service.test.ts
```
Testes cobrem: filtros corretos, PII descriptografada (mock AES), divergência Asaas detectada, limite de reconciliação respeitado.

---

### Fatia 6 — UI: aba Relatórios (4 sub-relatórios com gráficos intercambiáveis) + RecoveryHero

**Objetivo:** renderizar os 4 relatórios com seletor de tipo de gráfico e o bloco RecoveryHero no Dashboard.

**Scope in:**
- `src/app/api/reports/route.ts` — GET com params `type` (billing/delinquency/growth/cancellation), `from`, `to`
- `src/app/api/dashboard/recovery/route.ts` — GET, RecoveryHero
- `src/app/(app)/painel/relatorios/page.tsx`
- Componentes: `ReportCard`, `ChartToggle`, `ChartRenderer` (wrappa biblioteca de gráficos — recharts ou chart.js), `RecoveryHeroBlock`
- Seletor de período (mês/trimestre/semestre/ano)
- Troca de tipo de gráfico client-side sem refetch
- Estado vazio do RecoveryHero quando `enablesSpc=false` (P-05)

**Nao inclui:** Extrato, exportação CSV (P-02).

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/reports
```

---

### Fatia 7 — UI: aba Extrato + reconciliação Asaas

**Objetivo:** tabela paginada do Extrato com filtros e reconciliação opcional.

**Scope in:**
- `src/app/api/statement/route.ts` — GET paginado com filtros
- `src/app/api/statement/reconcile/route.ts` — POST dispara reconciliação Asaas
- `src/app/(app)/painel/extrato/page.tsx`
- Componentes: `StatementTable`, `StatementFilters`, `ReconcileButton`, `DivergenceBadge`
- Linha expansível com detalhe do Payment
- CPF nunca exibido; nome do aluno descriptografado no servidor

**Nao inclui:** exportação CSV (P-02, fatia separada ou fluxo próprio se priorizado).

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/statement
```

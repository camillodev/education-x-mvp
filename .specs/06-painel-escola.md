# Spec — Painel da Escola: Dashboard, Relatórios e Extrato (Fluxo 06)

> **Status:** rascunho (Claude, 2026-06-19)
> **Fonte de verdade:** `prisma/schema.prisma` (Invoice, Payment, Enrollment, Dunning propostos nos fluxos 02, 03 e 05) + doc Asaas `GET /payments` + protótipo (`prototipo/design-handoff/project/app/screens-d.jsx?v=10`, só UX).
> **DS:** Alfabeto.

---

## 1. Objetivo

Dar à escola uma visão financeira consolidada dos dados que já existem no banco. Tres abas: **Dashboard** (KPIs do mês corrente), **Relatórios** (4 sub-relatórios com gráficos intercambiáveis) e **Extrato** (linha a linha, com reconciliação Asaas opcional). Fluxo é de leitura pura — nenhuma escrita em banco, nenhuma chamada Asaas de mutação.

**DoD (Rafa):** conseguir abrir o painel, ver os KPIs corretos (Recebido / A vencer / Vencido calculados do banco local), navegar entre os 4 relatórios trocando tipo de gráfico, ver o bloco RecoveryHero com o funil de recuperação de inadimplência, e visualizar o Extrato com filtro de período. Typecheck + testes de unidade das queries + testes de render dos componentes principais. Playwright E2E pesado não é obrigatório (fluxo não toca dinheiro), mas pode ter teste de render de tela completa.

---

## 2. Dados necessários (o coração)

A pergunta-guia: quais campos de quais entidades cada KPI e relatório consome?

### 2a. Piso Asaas — GET /payments (reconciliação no Extrato)

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

### 2b. Negócio — campos consumidos por KPI e relatório

#### KPIs do Dashboard (aba 1)

| KPI | Query | Campos consumidos | Entidades |
|---|---|---|---|
| **Recebido no mês** | `SUM(Invoice.netAmountCents) WHERE status=PAID AND paidAt BETWEEN [inicio, fim]` | `netAmountCents`, `paidAt`, `status`, `unitId` | Invoice |
| **A vencer** | `SUM(Invoice.netAmountCents) WHERE status=PENDING AND dueDate >= today` | `netAmountCents`, `dueDate`, `status`, `unitId` | Invoice |
| **Vencido** | `SUM(Invoice.netAmountCents) WHERE status=OVERDUE` | `netAmountCents`, `status`, `unitId` | Invoice |
| **Alunos ativos** | `COUNT(DISTINCT Enrollment.studentId) WHERE status=ACTIVE` | `studentId`, `status`, `unitId` | Enrollment |
| **Ticket médio** | `Recebido / COUNT(Invoices PAID no mes)` | derivado dos acima | Invoice |
| **Taxa de inadimplência** | `SUM(OVERDUE) / (SUM(OVERDUE) + SUM(PAID))` no mes | derivado | Invoice |

#### RecoveryHero (bloco de destaque no Dashboard)

Funil de recuperação de inadimplência — a métrica nº1 de venda do produto:

| Etapa do funil | Query | Campos |
|---|---|---|
| **Vencidas** | `COUNT(Invoice) WHERE status=OVERDUE AND unitId=?` | `status`, `unitId` |
| **Em negativação** | `COUNT(Dunning) WHERE status=NEGATIVADO AND unitId=?` | `status`, `unitId` |
| **Recuperadas no mês** | `COUNT(Invoice) WHERE status=PAID AND paidAt >= inicio AND EXISTS(Dunning WHERE invoiceId=Invoice.id)` | `status`, `paidAt`, `invoiceId` | Invoice + Dunning |
| **Valor recuperado** | `SUM(Invoice.netAmountCents)` dos recuperados acima | `netAmountCents` | Invoice |
| **Taxa de recuperação** | `Recuperadas / Vencidas (acumulado últimos 90d)` | derivado | Invoice + Dunning |

#### Sub-relatórios (aba 2)

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
| `Dunning.status = NEGATIVADO` | Dunning | Série "Em negativação" |
| `Dunning.status = REGULARIZADO` | Dunning + Invoice | Série "Recuperados" |
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

#### Extrato (aba 3)

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
| `Invoice.netAmountCents` | Invoice (fluxo 03) | Sim | Existe (fluxo 03) | n/a (banco local) | KPIs, gráficos | Ler direto do banco |
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
| `billingType` no Extrato | Asaas (reconciliação) | Não (somente reconciliação) | Não existe no banco local | `billingType` | Extrato (forma de pagamento) | Buscar via GET /payments no Extrato; não persistir no banco agora (ver §4) |
| `unitId` em todas as queries | Sessão Clerk | Sim | Existe em todos os models | n/a | Implícito | Sempre filtrar; nunca expor dados de outra Unit |

---

## 4. Deltas de schema

**Nenhum model novo.** Este fluxo é de leitura pura. Todos os dados vêm de Invoice, Payment, Enrollment, Student, Guardian, Subject e Dunning — propostos nos fluxos 02, 03 e 05.

### Índices de agregação recomendados para performance

As queries de dashboard fazem GROUP BY + SUM sobre Invoice filtrado por `unitId` + `status` + faixa de datas. Sem índices compostos, varreduras completas serão necessárias.

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

### Views de agregação (opcional — PostgreSQL)

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

## 5. Contratos Asaas

Somente leitura, somente no Extrato.

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

**RN-01:** WHEN qualquer query do Dashboard for executada THEN o sistema SHALL filtrar por `unitId` extraído da sessão Clerk. Nunca usar `unitId` enviado pelo cliente.

**RN-02:** WHEN o período do Dashboard for selecionado THEN o padrão SHALL ser o mês corrente (`referenceMonth = YYYY-MM atual`). O usuário pode trocar para meses anteriores.

**RN-03:** WHEN o KPI "Recebido no mês" for calculado THEN o sistema SHALL usar `Invoice.paidAt` (data do evento de pagamento confirmado), não `Invoice.dueDate`.

**RN-04:** WHEN o KPI "A vencer" for calculado THEN o sistema SHALL incluir somente Invoices com `status = PENDING AND dueDate >= data_atual`. Invoices com `dueDate < hoje` e status ainda `PENDING` são tratadas como `OVERDUE` (inconsistência de dados — o webhook pode ter falhado).

**RN-05:** WHEN RecoveryHero exibir "Valor recuperado" THEN o sistema SHALL contar apenas Invoices com `status = PAID` que tenham um `Dunning` associado via `invoiceId`.

**RN-06:** WHEN o tipo de gráfico for trocado (barras / linha / pizza) THEN apenas a renderização muda; os dados subjacentes não são refetched.

**RN-07:** WHEN o Extrato solicitar reconciliação Asaas THEN o sistema SHALL mostrar loading e fazer as chamadas GET /payments paginadas. Se a subconta não tiver `asaasApiKey` configurada, exibir mensagem de configuração pendente e não bloquear o Extrato local.

**RN-08:** WHEN o Extrato exibir o nome do aluno THEN o sistema SHALL descriptografar `Student.nameEnc` na camada de serviço. O campo descriptografado nunca é cacheado em Redis ou similar.

**RN-09:** WHEN a taxa de inadimplência for zero THEN o RecoveryHero SHALL exibir estado vazio positivo ("Nenhuma inadimplência no período").

**RN-10:** IF nenhuma Invoice existir para o período selecionado THEN os KPIs SHALL exibir zero com mensagem "Nenhuma cobrança no período".

---

## 7. Estados e transições

Este fluxo não tem máquina de estados própria. Os estados são lidos dos models:

| Entidade | Estados lidos | Uso no painel |
|---|---|---|
| Invoice | `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `BLOCKED`, `ERROR` | KPIs, Extrato, R1 |
| Enrollment | `ACTIVE`, `CANCELLED`, `SUSPENDED`, `PENDING_CONFIRMATION` | Alunos ativos, R3, R4 |
| Dunning | `ELEGIVEL`, `NEGATIVADO`, `REGULARIZADO` | RecoveryHero, R2 |

Estados de erro (`BLOCKED`, `ERROR`) são exibidos no Extrato com badge específico mas não entram nas somas de KPI (não representam valor realizado nem a realizar).

---

## 8. Fluxo de coleta (UX — referência ao design)

Design de referência: `screens-d.jsx?v=10`. Screenshots: `dash2.png`, `dash3.png`, `relatorios.png`, `01-reports.png`, `02-reports.png`, `03-reports.png`.

O design ilustra layout e hierarquia visual. Campos e lógica vêm das seções 2 e 6, não do design.

### Aba 1 — Dashboard

- Topo: 4 cards de KPI em linha (Recebido / A vencer / Vencido / Alunos ativos). Cada card exibe valor em reais (com centavos), variação em relação ao mês anterior (+ ou -), e ícone de tendência.
- Bloco RecoveryHero: funil horizontal com 4 etapas (Vencidas > Em negativação > Recuperadas > Valor recuperado) + taxa de recuperação em destaque. Callout: "Você recuperou R$X,XX este mês."
- Gráfico de barras empilhadas: Recebido / A vencer / Vencido por semana do mês.
- Próximos vencimentos: lista dos 5 próximos (aluno, matéria, valor, data). Referência: tela C0 da spec 03.

### Aba 2 — Relatórios

- Seletor de período: mês / trimestre / semestre / ano.
- 4 cards de sub-relatório (R1 Cobrança / R2 Inadimplência / R3 Crescimento / R4 Cancelamentos). Clique em cada um expande o gráfico.
- Seletor de tipo de gráfico dentro de cada relatório: barras / linha / pizza. Referência: `01-reports.png`, `02-reports.png`, `03-reports.png`.
- Tabela de dados abaixo do gráfico (dados brutos que alimentam o gráfico, exportável como CSV).

### Aba 3 — Extrato

- Filtros: período (date range picker), status (Todas / Pagas / A vencer / Vencidas), matéria (select de Subjects), busca livre (nome aluno / responsável).
- Tabela paginada: Competência, Aluno, Matéria, Responsável, Vencimento, Pago em, Valor, Status, Asaas.
- Botão "Reconciliar com Asaas" (opcional, faz GET /payments no período selecionado e destaca divergências).
- Linha expansível: detalhe do Payment (data exata, valor com juros se houver, forma de pagamento).

---

## 9. Definition of Done (binário)

```bash
# 1. Typecheck
pnpm typecheck

# 2. Testes unitários das queries de agregação
pnpm test:run src/lib/services/dashboard.service.test.ts

# 3. Testes de render dos componentes principais
pnpm test:run src/components/dashboard

# Prova dos testes unitários:
# - KPI "Recebido" = SUM correto de invoices PAID no período
# - KPI "A vencer" inclui somente dueDate >= hoje
# - KPI "Vencido" não inclui invoices PAID
# - RecoveryHero "Taxa de recuperação" = recuperadas / vencidas (últimos 90d)
# - unitId de outra Unit nunca aparece nos resultados
# - Nomes de alunos são descriptografados no serviço (mock AES retorna valor esperado)

# 4. Opcional: Playwright render smoke test (não E2E pesado)
# pnpm dlx playwright test dashboard-render --reporter=line
# Prova: Dashboard abre, 4 KPIs visíveis, RecoveryHero presente, abas navegáveis
```

---

## 10. Decisões fechadas

1. **Fonte primária = banco local.** Asaas é consultado apenas no Extrato para reconciliação pontual. Os KPIs e relatórios nunca chamam o Asaas diretamente.

2. **Nenhum model novo.** Toda a agregação parte das entidades existentes. Índices compostos são adicionados na migration deste fluxo (não breaking).

3. **Views materializadas são opcionais.** Criar apenas se queries brutas forem lentas em produção. Não criar antecipadamente.

4. **RecoveryHero é join Invoice + Dunning.** "Recuperadas" = Invoice PAID que tem Dunning associado. Não usar campo separado.

5. **Tipos de gráfico são troca de renderização client-side.** Mesmos dados, componente de gráfico intercambiável (barras / linha / pizza). Nenhuma chamada extra ao servidor na troca.

6. **Centavos no banco, reais na exibição.** Conversão `/ 100` feita exclusivamente na camada de apresentação (componente ou formatador de moeda). Nunca armazenar reais.

7. **Student.nameEnc descriptografado no serviço, nunca cacheado.** O Extrato descriptografa em runtime. Se performance for um problema futuro, avaliar cache com TTL curto (5min) em memória de processo, nunca em Redis persistente.

8. **`billingType` não existe no banco local.** Não persistir agora. Disponível apenas via reconciliação Asaas no Extrato. Não incluir na série de dados dos relatórios até haver campo no Invoice.

9. **Período default do Dashboard = mês corrente** (`referenceMonth = YYYY-MM`). Relatórios e Extrato têm seletor livre de período.

10. **Extrato paginado.** Sem scroll infinito — paginação explícita (25 linhas por página). Reconciliação Asaas limitada a 1000 cobranças (10 páginas de 100).

---

## 11. Pendências

**P-01 — Variação mês a mês nos KPIs:** os cards de KPI mostram "+12% vs mês anterior". Isso exige buscar os dados do mês anterior também. A query existe (mesmos filtros com mês -1), mas gera 2 queries por KPI. Avaliar se faz uma query única com window function ou 2 queries paralelas. Decidir na Fatia 2.

**P-02 — Exportação CSV do Extrato:** design menciona exportação. Não está no DoD desta spec. Pode ser adicionado como Fatia 5 ou fluxo separado.

**P-03 — Reconciliação Asaas no Extrato:** o botão "Reconciliar" consome créditos de API (rate limit Asaas: 120 req/min). Para escolas com > 1000 cobranças no período, pode bater no limite. Estratégia: limitar reconciliação a períodos de no máximo 31 dias ou 1000 registros. Definir comportamento quando o limite for atingido antes de implementar.

**P-04 — `billingType` no Invoice:** hoje o banco não armazena a forma de pagamento (boleto / PIX) no Invoice. Quando o campo `billingType` vier do webhook Asaas (PAYMENT_RECEIVED), avaliar persistir em Invoice para uso nos relatórios sem precisar de reconciliação. Decisão para o fluxo 03 revisar.

**P-05 — RecoveryHero com zero Dunnings:** escolas que não ativaram negativação (`enablesSpc=false`) verão RecoveryHero com zeros. Definir copy/estado vazio que não confunda ("Ative a negativação para recuperar dívidas").

**P-06 — Atualização em tempo real dos KPIs:** quando um webhook de pagamento chega, os KPIs do Dashboard ficam desatualizados até a próxima navegação. Avaliar Server-Sent Events ou revalidação automática (Next.js `revalidatePath`) acionada pelo webhook handler.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de até 400 linhas. WIP = 1 por vez.

---

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

### Fatia 2 — Service: queries de agregação (DashboardService)

**Objetivo:** implementar as queries de KPI e RecoveryHero como funções testáveis.

**Scope in:**
- `src/lib/services/dashboard.service.ts` (novo):
  - `getKpis(unitId, referenceMonth)` — retorna `{ receivedCents, pendingCents, overdueCents, activeStudents, previousMonth: { ... } }`
  - `getRecoveryHero(unitId)` — retorna funil de recuperação (últimos 90 dias)
  - `getUpcomingDue(unitId, limit)` — retorna os N próximos vencimentos
- Todas as funções usam Prisma `groupBy` + `_sum` + `_count`.
- `src/lib/services/dashboard.service.test.ts` — testes unitários com banco seed em memória (SQLite via `DATABASE_URL=file::memory:`).

**Nao inclui:** relatórios, Extrato, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/dashboard.service.test.ts
```
Testes cobrem: KPI correto, unitId isolado, mês sem dados retorna zeros.

---

### Fatia 3 — Service: queries de relatórios (ReportService)

**Objetivo:** implementar as 4 séries de dados dos sub-relatórios.

**Scope in:**
- `src/lib/services/report.service.ts` (novo):
  - `getBillingReport(unitId, from, to)` — R1: agrupado por mês, séries PAID/PENDING/OVERDUE
  - `getDelinquencyReport(unitId, from, to)` — R2: inadimplência + funil Dunning
  - `getGrowthReport(unitId, from, to)` — R3: matrículas novas, alunos ativos, MRR
  - `getCancellationReport(unitId, from, to)` — R4: cancelamentos por matéria e plano
- `src/lib/services/report.service.test.ts` — testes unitários.

**Nao inclui:** Extrato, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/report.service.test.ts
```

---

### Fatia 4 — Service: Extrato + reconciliação Asaas (StatementService)

**Objetivo:** queries do Extrato com descriptografia de PII e reconciliação opcional com Asaas.

**Scope in:**
- `src/lib/services/statement.service.ts` (novo):
  - `getStatement(unitId, filters)` — paginado, join Invoice/Payment/Enrollment/Student/Guardian/Subject/Dunning, descriptografa `Student.nameEnc`
  - `reconcileWithAsaas(unitId, from, to)` — chama GET /payments paginado, compara com banco, retorna lista de divergências
- `src/lib/services/statement.service.test.ts`

**Nao inclui:** UI.

**DoD:**
```bash
pnpm test:run src/lib/services/statement.service.test.ts
```
Testes cobrem: filtros corretos, PII descriptografada (mock AES), divergência Asaas detectada.

---

### Fatia 5 — API Routes + Server Components (Dashboard)

**Objetivo:** expor os dados via rotas e renderizar a aba Dashboard.

**Scope in:**
- `src/app/api/dashboard/route.ts` — GET, valida sessão Clerk, chama DashboardService
- `src/app/api/dashboard/recovery/route.ts` — GET, RecoveryHero
- `src/app/(app)/painel/page.tsx` — aba Dashboard (KPIs + RecoveryHero + próximos vencimentos)
- Componentes: `KpiCard`, `RecoveryHeroBlock`, `UpcomingDueList`
- Responsivo 375/768/1440, Alfabeto DS

**Nao inclui:** abas Relatórios e Extrato.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/dashboard
```

---

### Fatia 6 — UI: aba Relatórios (4 sub-relatórios com gráficos intercambiáveis)

**Objetivo:** renderizar os 4 relatórios com seletor de tipo de gráfico.

**Scope in:**
- `src/app/api/reports/route.ts` — GET com params `type` (billing/delinquency/growth/cancellation), `from`, `to`
- `src/app/(app)/painel/relatorios/page.tsx`
- Componentes: `ReportCard`, `ChartToggle`, `ChartRenderer` (wrappa biblioteca de gráficos — recharts ou chart.js)
- Seletor de período (mês/trimestre/semestre/ano)
- Troca de tipo de gráfico client-side sem refetch

**Nao inclui:** Extrato, exportação CSV.

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

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/statement
```

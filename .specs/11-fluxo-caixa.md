# Spec — Fluxo de Caixa (Fluxo 11)

> **Status:** rascunho (Claude, 2026-06-21)
> **Fonte de verdade:** `prisma/schema.prisma` (Invoice fluxo 03, Payable + FinancialCategory fluxo 10) + doc Asaas `GET /finance/balance` (já em uso na spec 08) + protótipo (`prototipo/design-handoff/project/app/screens-d.jsx`, só UX).
> **DS:** Alfabeto.

---

## 1. Objetivo

Dar à escola uma visão de fluxo de caixa: saldo atual como âncora, projeção de entradas (recebíveis) e saídas (contas a pagar) numa timeline de 30/60/90 dias, e um relatório mensal por categoria. Une o lado RECEBER (Invoice, fluxo 03) com o lado PAGAR (Payable, fluxo 10). Fluxo é de leitura pura — nenhuma escrita em banco, nenhuma chamada Asaas de mutação.

**DoD:** a diretora entra no painel financeiro, vê o saldo atual em destaque (âncora Asaas), vê a projeção de caixa dos próximos 30/60/90 dias com entradas e saídas numa linha do tempo, vê o relatório mensal por categoria (entradas vs. saídas por FinancialCategory), e o card de fluxo de caixa aparece corretamente integrado ao painel da spec 06. Testes unitários cobrem a regra crítica de não dobrar itens PAID. Typecheck passa.

---

## 2. Dados necessários (o coração)

### 2a. Piso Asaas — GET /finance/balance (saldo atual)

Endpoint já em uso na spec 08 (saque e antecipação). Sem custo adicional de integração.

```
GET https://sandbox.asaas.com/api/v3/finance/balance
Header: access_token: <subconta-apiKey>
```

Resposta relevante:

| Campo | Tipo | Descrição |
|---|---|---|
| `balance` | number (reais) | Saldo disponível total (PIX + boleto liberados) |
| `totalTransfers` | number (reais) | Total transferido (histórico — não usar) |

Apenas `balance` é consumido neste fluxo. Conversão de borda: `balance * 100` -> `balanceCents` (Int). Nenhum outro campo do payload é usado.

Este endpoint é **live** — retorna o saldo no momento da chamada. Não há endpoint de saldo histórico (ver §11 sobre DailyBalanceSnapshot).

### 2b. Negócio — campos consumidos por cada componente do fluxo

#### Âncora: saldo hoje

| Campo | Origem | Descrição |
|---|---|---|
| `balanceCents` | GET /finance/balance (`balance * 100`) | Saldo Asaas no momento da consulta |

#### Projeção de entradas (recebíveis futuros)

Fonte: `Invoice` (fluxo 03). Filtro obrigatório: somente `status IN (PENDING, OVERDUE)`.

| Campo Invoice | Uso na projeção |
|---|---|
| `netAmountCents` | Valor que entrará no caixa (já descontado) |
| `dueDate` | Data em que o valor deve entrar (eixo X da projeção) |
| `status` | Filtro: somente `PENDING` ou `OVERDUE` |
| `unitId` | Guard obrigatório de tenant |
| `categoryId` | Agrupamento por FinancialCategory no relatório mensal (se campo adicionado — ver §4) |

**Regra crítica:** invoices com `status = PAID` **nunca** entram na projeção. Elas já estão refletidas no `balanceCents` retornado pelo Asaas. Somar PAID na projeção dobra o valor — este é o erro mais fácil de cometer neste fluxo.

#### Projeção de saídas (contas a pagar futuras)

Fonte: `Payable` (fluxo 10). Filtro obrigatório: somente `status IN (PENDING, OVERDUE)`.

| Campo Payable | Uso na projeção |
|---|---|
| `amountCents` | Valor que sairá do caixa |
| `dueDate` | Data em que o valor deve sair (eixo X da projeção) |
| `status` | Filtro: somente `PENDING` ou `OVERDUE` |
| `categoryId` | FK -> FinancialCategory (agrupamento no relatório mensal) |
| `unitId` | Guard obrigatório de tenant |

**Mesma regra:** Payable com `status = PAID` nunca entra na projeção. O pagamento já saiu do caixa e está no `balanceCents`.

#### Relatório mensal por categoria

Fonte: Invoice + Payable, agrupados por `categoryId` -> `FinancialCategory.name`, dentro de um mês calendário.

| Dimensão | Entidade | Campo |
|---|---|---|
| Entradas por categoria | Invoice | `SUM(netAmountCents) GROUP BY categoryId` (qualquer status — ver §6 RN-08) |
| Saídas por categoria | Payable | `SUM(amountCents) GROUP BY categoryId` (qualquer status — ver §6 RN-08) |
| Nome da categoria | FinancialCategory | `name` |
| Resultado | Calculado | `entradas - saídas` por categoria |
| Total entradas | Invoice | `SUM(netAmountCents)` no mês |
| Total saídas | Payable | `SUM(amountCents)` no mês |
| Resultado do mês | Calculado | `total entradas - total saídas` |

### 2c. Fiscal / NFS-e

Não aplicável. Este fluxo exibe dados financeiros; não emite notas.

### 2d. Compliance / LGPD

Nenhum campo PII é lido neste fluxo. Invoice e Payable não contêm dados de responsável ou aluno na agregação usada aqui. `unitId` da sessão Clerk é a única barreira de tenant necessária.

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolução |
|---|---|---|---|---|---|---|
| `balanceCents` (saldo hoje) | Asaas GET /finance/balance | Sim | N/A — não persistido | `balance` (reais) | Sim (card saldo) | Converter `balance * 100`; chamar ao carregar o card |
| `Invoice.netAmountCents` | Invoice (fluxo 03) | Sim | Existe | n/a | Sim (entradas) | Filtrar `status IN (PENDING, OVERDUE)` + `dueDate <= today + 90d` |
| `Invoice.dueDate` | Invoice (fluxo 03) | Sim | Existe | n/a | Sim (eixo X) | Agrupar por dia para projeção |
| `Invoice.status` | Invoice (fluxo 03) | Sim | Existe (`InvoiceStatus` enum) | n/a | Filtro | Guard: somente PENDING/OVERDUE |
| `Invoice.categoryId` | Invoice (fluxo 03) | Para relatório mensal | **FALTA** — campo opcional a adicionar (ver §4) | n/a | Não | Adicionar `categoryId String? @relation(...)` em Invoice; fallback "Sem categoria" se null |
| `Invoice.unitId` | Invoice (fluxo 03) | Sim | Existe | n/a | Implícito | Sempre filtrar |
| `Payable.amountCents` | Payable (fluxo 10) | Sim | Existe (fluxo 10) | n/a | Sim (saídas) | Filtrar `status IN (PENDING, OVERDUE)` + `dueDate <= today + 90d` |
| `Payable.dueDate` | Payable (fluxo 10) | Sim | Existe (fluxo 10) | n/a | Sim (eixo X) | Agrupar por dia para projeção |
| `Payable.status` | Payable (fluxo 10) | Sim | Existe (fluxo 10) | n/a | Filtro | Guard: somente PENDING/OVERDUE |
| `Payable.categoryId` | Payable (fluxo 10) | Sim | Existe (fluxo 10) | n/a | Relatório mensal | FK -> FinancialCategory |
| `Payable.unitId` | Payable (fluxo 10) | Sim | Existe (fluxo 10) | n/a | Implícito | Sempre filtrar |
| `FinancialCategory.name` | FinancialCategory (fluxo 10) | Sim (relatório) | Existe (fluxo 10) | n/a | Relatório mensal | Join Payable/Invoice -> FinancialCategory |
| `unitId` (sessão Clerk) | Clerk session | Sim | Todos os models | n/a | Implícito | Nunca usar unitId do body/query; extrair de auth() |

---

## 4. Deltas de schema

**Nenhum model novo.** O fluxo de caixa é leitura pura e agregação. Lê Invoice (fluxo 03), Payable (fluxo 10), FinancialCategory (fluxo 10) e GET /finance/balance (Asaas).

### Único delta: `categoryId` opcional em Invoice

O relatório mensal por categoria agrupa entradas por `FinancialCategory`. Para isso, Invoice precisa de um `categoryId` opcional (a escola pode não categorizar todas as entradas).

```prisma
// Adicionar ao model Invoice (proposto no fluxo 03):
categoryId   String?
category     FinancialCategory? @relation(fields: [categoryId], references: [id])
```

Se `categoryId = null`, a entrada aparece no relatório sob "Sem categoria". Este campo não é obrigatório — não bloqueia criação de Invoice. Sem migration breaking.

**Migration necessária:** `prisma migrate dev --name add-invoice-category`

### Índices de performance recomendados

As queries de projeção fazem range scan por `dueDate` + filtro `status` + filtro `unitId`. Sem índice composto, varre a tabela completa.

```prisma
// Adicionar ao model Invoice (se ainda não existir):
@@index([unitId, status, dueDate])

// Adicionar ao model Payable (se ainda não existir):
@@index([unitId, status, dueDate])
@@index([unitId, categoryId])
```

**Nota de roadmap — DailyBalanceSnapshot (não construir agora):** o saldo Asaas é live-only. Um gráfico de "saldo histórico ao longo do tempo" não é possível sem persistir snapshots. Para isso, no futuro: model `DailyBalanceSnapshot(unitId, date, balanceCents)` populado por cron diário. Fora do MVP. Documentado aqui para não ser esquecido.

---

## 5. Contratos Asaas

### GET /finance/balance — saldo atual (read-only)

Este é o único endpoint Asaas consumido neste fluxo. Já está implementado no cliente Asaas da spec 08.

```
GET https://sandbox.asaas.com/api/v3/finance/balance
Header: access_token: <BillingConfig.asaasApiKey da subconta da escola>
```

**Resposta completa:**

```json
{
  "balance": 12750.50,
  "totalTransfers": 8200.00
}
```

**Consumo neste fluxo:**

```ts
const balanceCents = Math.round(response.balance * 100)
// 12750.50 -> 1275050 centavos
```

Apenas `balance` é usado. `totalTransfers` é ignorado.

**Comportamento se Asaas não responder (degradação controlada):**

Se `GET /finance/balance` retornar erro (timeout, 5xx, subconta sem apiKey configurada):
- A projeção de entradas e saídas é calculada normalmente (dados são 100% locais).
- O card exibe saldo como `null` com mensagem "Saldo indisponível no momento".
- O saldo projetado (`saldo_no_dia_N`) é exibido em modo relativo: parte de 0 e acumula os deltas. Deixar claro na UI com label "Projeção relativa (saldo atual indisponível)".
- Nenhum erro para o usuário — degradação silenciosa com aviso inline.

**Sandbox-first:** `ASAAS_MODE=mock` retorna `{ balance: 5000.00 }`. O mock client já tem `getBalance()` implementado na spec 08.

---

## 6. Regras de negócio (EARS)

```
WHEN fluxo de caixa for calculado para o dia N
THEN saldo_no_dia_N SHALL ser:
  balanceCents
  + SUM(Invoice.netAmountCents WHERE status IN (PENDING, OVERDUE) AND dueDate <= dia_N AND unitId = sessao)
  - SUM(Payable.amountCents WHERE status IN (PENDING, OVERDUE) AND dueDate <= dia_N AND unitId = sessao)

[REGRA CRÍTICA]
IF Invoice.status = PAID
THEN system SHALL NOT include this invoice in any projection sum
REASON o valor PAID já está refletido no balanceCents do Asaas
       somar PAID novamente dobra o valor — erro silencioso e grave

[REGRA CRÍTICA]
IF Payable.status = PAID
THEN system SHALL NOT include this payable in any projection sum
REASON o valor PAID já saiu do caixa e está no balanceCents do Asaas

WHEN projeção for calculada
THEN o horizonte SHALL ser 30, 60 ou 90 dias a partir de today (seleção do usuário)
  AND o padrão SHALL ser 30 dias
  AND o ponto de partida de toda projeção SHALL ser today (inclusive)

WHEN unitId for necessário em qualquer query
THEN system SHALL extrair unitId de auth() (sessão Clerk)
  AND SHALL NOT accept unitId via query param ou request body
  AND SHALL NOT return data from another unitId

WHEN GET /finance/balance retornar erro ou timeout
THEN system SHALL compute projection relative (starting from 0)
  AND SHALL display inline warning "Saldo atual indisponível"
  AND SHALL NOT block the page render

WHEN Invoice.categoryId = null
THEN system SHALL group this invoice under "Sem categoria" in monthly report

WHEN Payable.categoryId = null
THEN system SHALL group this payable under "Sem categoria" in monthly report

WHEN relatório mensal for calculado
THEN entradas SHALL include Invoice with status IN (PAID, PENDING, OVERDUE) in the reference month
  AND saídas SHALL include Payable with status IN (PAID, PENDING, OVERDUE) in the reference month
  REASON o relatório mensal mostra o realizado + comprometido do mês, não apenas futuros

IF nenhuma Invoice e nenhum Payable existirem para o período
THEN system SHALL return projeção zerada com mensagem "Nenhuma movimentação no período"
```

---

## 7. Estados e transições

Este fluxo não tem máquina de estados própria. Os estados são lidos dos models existentes:

| Entidade | Status incluídos na projeção | Status excluídos da projeção | Motivo |
|---|---|---|---|
| Invoice | `PENDING`, `OVERDUE` | `PAID`, `CANCELLED`, `BLOCKED`, `ERROR` | PAID já no saldo Asaas; demais não representam valor a receber |
| Payable | `PENDING`, `OVERDUE` | `PAID`, `CANCELLED` | PAID já saiu do caixa; CANCELLED não sai |

Para o **relatório mensal por categoria**, o escopo é diferente (ver §6 RN-08):

| Entidade | Status incluídos no relatório mensal |
|---|---|
| Invoice | `PAID`, `PENDING`, `OVERDUE` (tudo que representa compromisso no mês) |
| Payable | `PAID`, `PENDING`, `OVERDUE` (tudo que representa compromisso no mês) |

A distinção é intencional: a projeção é sobre futuro (somente não-PAID); o relatório mensal é sobre competência (tudo comprometido no mês, independente se já pago).

---

## 8. Fluxo de coleta (UX — referência ao design)

Design de referência: `prototipo/design-handoff/project/app/screens-d.jsx` (painel financeiro). O design ilustra layout e hierarquia visual. Campos e lógica vêm das seções 2 e 6, não do design.

### Card de Fluxo de Caixa no Painel (spec 06)

O card de fluxo de caixa é adicionado ao painel existente (spec 06) como nova seção abaixo das abas Dashboard/Relatórios/Extrato, ou como aba adicional "Caixa". A decisão de posicionamento exato (sub-aba vs. seção destacada) fica para a Fatia 3 (UI).

**Composição do card:**

1. **Saldo atual em destaque**
   - Valor em reais, grande, no topo do card.
   - Label: "Saldo disponível hoje" + timestamp "atualizado em HH:MM".
   - Se Asaas indisponível: exibe "—" com aviso inline.

2. **Seletor de horizonte**
   - Toggle de 3 botões: `30 dias` / `60 dias` / `90 dias`. Padrão: 30 dias.
   - Troca de horizonte faz refetch das projeções (não é troca client-side de dados já carregados).

3. **Gráfico de linha — projeção**
   - Eixo X: datas (de hoje até hoje + N dias).
   - 3 séries:
     - `Entradas acumuladas` (verde) — soma cumulativa de Invoice PENDING/OVERDUE até cada data.
     - `Saídas acumuladas` (vermelho) — soma cumulativa de Payable PENDING/OVERDUE até cada data.
     - `Saldo projetado` (azul) — `balanceCents + entradas_até_D - saídas_até_D` em cada dia.
   - Tooltip ao passar o mouse: data + valores das 3 séries em reais.
   - Se saldo projetado ficar negativo em algum dia: ponto marcado com ícone de alerta.

4. **Tabela de movimentos futuros**
   - Lista cronológica de todos os eventos futuros dentro do horizonte selecionado.
   - Colunas: Data / Tipo (Entrada / Saída) / Descrição / Valor.
   - Entradas: referência da Invoice (aluno + matéria, se disponível via join com Enrollment/Subject).
   - Saídas: Payable.description + FinancialCategory.name.
   - Paginada: 20 linhas por página.
   - Valores negativos em vermelho (saídas), positivos em verde (entradas).

5. **Relatório mensal por categoria** (sub-seção ou aba separada dentro do card)
   - Seletor de mês (padrão: mês corrente).
   - Tabela: Categoria / Entradas / Saídas / Resultado.
   - Linha de total no rodapé: Total entradas / Total saídas / Resultado do mês.
   - Resultado negativo em vermelho, positivo em azul.
   - "Sem categoria" como linha separada para Invoice/Payable sem categoryId.

---

## 9. Definition of Done (binário)

```bash
# 1. Typecheck
pnpm typecheck

# 2. Migration (se §4 delta Invoice.categoryId for incluído)
pnpm prisma migrate dev --name add-invoice-category && pnpm prisma generate

# 3. Testes unitários do CashflowService
pnpm test:run src/lib/services/cashflow.service.test.ts

# Provas obrigatórias nos testes:
# - Invoice PAID NÃO entra na projeção (regra crítica)
# - Payable PAID NÃO entra na projeção (regra crítica)
# - Invoice PENDING e OVERDUE entram na projeção
# - Payable PENDING e OVERDUE entram na projeção
# - saldo_no_dia_N = balanceCents + entradas_até_N - saídas_até_N
# - unitId de outra Unit nunca aparece (isolamento tenant)
# - Se Asaas retornar erro, projeção relativa retorna (balanceCents = 0, projeção continua)
# - Relatório mensal retorna zeros se nenhum item existir no mês
# - "Sem categoria" agrupa itens com categoryId = null

# 4. Testes de render do card
pnpm test:run src/components/cashflow

# 5. Typecheck final
pnpm typecheck
```

O fluxo não toca dinheiro (somente leitura), portanto Playwright E2E completo não é obrigatório no DoD. Um smoke test de render é suficiente:

```bash
# Opcional mas recomendado:
pnpm dlx playwright test cashflow-render --reporter=line
# Prova: card abre, saldo visível, gráfico renderizado, tabela com pelo menos 1 linha (dados seed)
```

---

## 10. Decisões fechadas

1. **Fluxo de caixa é calculado on-the-fly, sem persistência.** Não criar tabela de projeção. Os valores mudam toda vez que uma Invoice liquida ou um Payable é pago. Persistir projeção geraria inconsistência imediata. Computar ao carregar o card.

2. **Regra de corretude: nunca somar PAID na projeção.** Itens PAID já estão no `balanceCents` Asaas. Somar de novo dobra o valor. Esta regra vale para Invoice e para Payable, sem exceção.

3. **Saldo âncora vem exclusivamente do Asaas.** Não calcular saldo a partir de Invoice PAID locais. O Asaas é a fonte de verdade do caixa real (considera taxas, chargebacks, transferências). O banco local pode divergir.

4. **Degradação controlada se Asaas indisponível.** A projeção local (entradas - saídas) continua funcionando. O saldo absoluto fica como `null` e a UI exibe projeção relativa com aviso. Nunca bloquear o card por falha do Asaas.

5. **Nenhum model novo além de `Invoice.categoryId` opcional.** O delta mínimo é o campo de categoria em Invoice para o relatório mensal. Sem novas tabelas, sem novas enums.

6. **Relatório mensal usa competência (mês calendário), não caixa puro.** Inclui PAID + PENDING + OVERDUE do mês — mostra o comprometido, não só o recebido. Diferente da projeção que é futuro-only.

7. **DailyBalanceSnapshot é roadmap, não MVP.** Sem histórico de saldo no Asaas, gráfico de saldo passado não é possível. A decisão de não construir agora é intencional para não adicionar complexidade de cron + snapshot sem demanda validada.

8. **`Invoice.categoryId` é opcional por design.** A escola pode não categorizar entradas. Não forçar preenchimento — o sistema agrupa em "Sem categoria" e segue.

9. **Horizonte de projeção: 30/60/90 dias.** Projetos educacionais têm ciclo mensal. 90 dias cobre um trimestre. Projeções mais longas são menos confiáveis (cancelamentos, novas matrículas) e não agregam valor para o usuário-alvo (franqueado Kumon).

10. **Entradas na projeção usam `netAmountCents`, não `grossAmountCents`.** O `netAmountCents` reflete o valor após taxas Asaas — é o que a escola efetivamente recebe no caixa.

---

## 11. Pendências

**P-01 — `Invoice.categoryId` depende do fluxo 03 revisar o model.** A spec 03 não prevê `categoryId` em Invoice. Esta spec adiciona o campo. Coordenar com quem implementar o fluxo 03 para incluir o campo antes da Fatia 2 deste fluxo.

**P-02 — DailyBalanceSnapshot (roadmap).** O saldo Asaas é live-only — sem histórico. Para um gráfico de saldo histórico, criar no futuro: `model DailyBalanceSnapshot { id String, unitId String, date DateTime, balanceCents Int, @@unique([unitId, date]) }` populado por cron diário às 23:55. Fora do MVP. Documentado para não ser esquecido.

**P-03 — Rate limit Asaas no GET /finance/balance.** Se o card for recarregado frequentemente (navegação rápida, auto-refresh), pode bater no rate limit Asaas (120 req/min por subconta). Estratégia de curto prazo: cache em memória de processo com TTL de 60 segundos para o `balanceCents`. Implementar na Fatia 1 (service).

**P-04 — Join Invoice -> Enrollment -> Subject para a tabela de movimentos.** Para exibir "aluno + matéria" na tabela de movimentos futuros, é necessário join Invoice -> Enrollment -> Subject. Esse join pode ser pesado se a escola tiver muitas Invoices. Avaliar se exibe somente `Invoice.description` como alternativa mais leve, sem o join.

**P-05 — Payable sem `Payable.description`.** Se a spec 10 não definir um campo `description` em Payable, a tabela de movimentos futuros não tem texto descritivo para as saídas. Verificar spec 10 antes de implementar a UI. Se não existir, criar campo `description String?` em Payable.

**P-06 — Relatório mensal por categoria e exportação CSV.** O design cita exportação de dados tabulares. Não está no DoD desta spec. Pode ser adicionado como Fatia 4 ou fluxo separado (consistente com a abordagem da spec 06, que também deixou exportação como P-02).

**P-07 — Saldo projetado negativo.** Se `saldo_no_dia_N` ficar negativo em algum ponto da projeção (saídas superam entradas + saldo atual), o gráfico deve indicar isso claramente. Definir o comportamento visual antes da Fatia 3 (UI): opção A — linha saldo cruza o zero, área abaixo em vermelho; opção B — banner de alerta "Caixa projetado negativo em [data]". Decidir na Fatia 3.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de até 400 linhas. WIP = 1 por vez.

---

### Fatia 1 — CashflowService: projeção on-the-fly + testes unitários

**Objetivo:** implementar o `CashflowService` com a lógica de projeção e o relatório mensal. Testes cobrem a regra crítica de não contar PAID.

**Scope in:**

- `src/lib/services/cashflow.service.ts` (novo):
  - `getProjection(unitId, horizonDays)` — retorna `{ balanceCents, days: [{ date, incomeCents, outcomeCents, projectedBalanceCents }] }`. Chama `asaasClient.getBalance()` e faz 2 queries Prisma (Invoice PENDING/OVERDUE + Payable PENDING/OVERDUE). Se Asaas falhar, retorna `balanceCents: null` e projeção relativa partindo de 0.
  - `getMonthlyReport(unitId, referenceMonth)` — retorna `{ categories: [{ name, incomeCents, outcomeCents, resultCents }], totalIncome, totalOutcome, totalResult }`. Agrupa Invoice + Payable do mês por `categoryId`.
  - Cache em memória (TTL 60s) para o `balanceCents` do Asaas (ver P-03).

- `src/lib/services/cashflow.service.test.ts` — testes unitários obrigatórios:
  - Invoice PAID não entra na projeção.
  - Payable PAID não entra na projeção.
  - `saldo_no_dia_N = balanceCents + entradas_até_N - saídas_até_N` (cálculo correto).
  - unitId de outra Unit não aparece (isolamento tenant).
  - Asaas indisponível: projeção relativa funciona, `balanceCents = null`.
  - Mês sem dados: retorna zeros sem erro.
  - `categoryId = null` agrupa em "Sem categoria".

**Não inclui:** API route, UI, migration do `Invoice.categoryId`.

**DoD:**
```bash
pnpm test:run src/lib/services/cashflow.service.test.ts
```
Todos os casos listados acima passam.

---

### Fatia 2 — Migration: `Invoice.categoryId` + índices

**Objetivo:** adicionar o campo `categoryId` opcional em Invoice e os índices de performance para as queries de projeção.

**Scope in:**

- `prisma/schema.prisma`:
  - `Invoice.categoryId String?` + relação `FinancialCategory?`.
  - `@@index([unitId, status, dueDate])` em Invoice (se não existir).
  - `@@index([unitId, status, dueDate])` em Payable (se não existir).
  - `@@index([unitId, categoryId])` em Payable (se não existir).
- `prisma/migrations/` — migration `add-invoice-category-cashflow-indexes`.
- `pnpm prisma generate`.

**Não inclui:** service, UI, API route.

**DoD:**
```bash
pnpm prisma migrate dev --name add-invoice-category-cashflow-indexes \
  && pnpm prisma generate \
  && pnpm typecheck
```

---

### Fatia 3 — API Route + UI: card de fluxo de caixa no painel

**Objetivo:** expor os dados via rotas e renderizar o card de fluxo de caixa integrado ao painel da spec 06.

**Scope in:**

- `src/app/api/cashflow/projection/route.ts` — GET com params `horizon` (30/60/90), extrai `unitId` de auth(), chama `CashflowService.getProjection()`.
- `src/app/api/cashflow/monthly-report/route.ts` — GET com param `month` (YYYY-MM), chama `CashflowService.getMonthlyReport()`.
- `src/app/(app)/painel/caixa/page.tsx` (ou integrado à página de painel como sub-aba):
  - Card saldo atual em destaque.
  - Seletor de horizonte (30/60/90 dias).
  - Gráfico de linha (3 séries: entradas, saídas, saldo projetado) — usar a mesma biblioteca de gráficos da spec 06.
  - Tabela de movimentos futuros (paginada, 20 linhas).
  - Sub-seção de relatório mensal por categoria com seletor de mês.
- Componentes: `CashflowCard`, `CashflowChart`, `MovementTable`, `MonthlyReportTable`.
- Responsivo 375/768/1440, Alfabeto DS.
- Aviso inline se saldo Asaas indisponível.
- Ponto de alerta no gráfico se saldo projetado ficar negativo (ver P-07).

**Não inclui:** exportação CSV, DailyBalanceSnapshot, join pesado Enrollment/Subject (usar `Invoice.description` na tabela de movimentos — ver P-04).

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/components/cashflow
```
Opcional:
```bash
pnpm dlx playwright test cashflow-render --reporter=line
```

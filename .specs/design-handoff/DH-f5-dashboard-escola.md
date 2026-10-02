# Design Handoff — Dashboard Financeiro da Escola (Fluxo 06, P0)

> **Fase:** MVP · **Fluxo:** 06 · **Persona:** dona/orientadora da escola
> **Spec-fonte:** [`f2-01-painel-escola.md`](../f2-01-painel-escola.md) — **fonte de verdade dos campos e regras** (prevalece sobre este doc em caso de conflito)
> **DS:** Alfabeto (já pronto) — este handoff **não cobre visual**, só campos/dado/validação/regra
> **Escopo:** SOMENTE P0 — aba única "Dashboard" (Fatia 3 da spec). P1 (Relatórios, Extrato, RecoveryHero) fica fora — ver §6.

## Como usar este handoff

Você (designer/PM) já tem o Design System Alfabeto montado. Este documento não te diz cor, espaçamento ou tipografia — te diz **o que cada tela precisa mostrar, de onde o dado vem, como ele se formata, o que acontece quando está vazio/carregando/quebrado, e qual regra de negócio precisa ficar visível na UI** (não só no backend). Monte a tela com os componentes do DS listados em §7.

Fluxo é **majoritariamente leitura**. A única escrita em toda a tela é "Pausar régua" (bloco 2) — todo o resto é visualização de dados já calculados no banco.

---

## 1. KPI Cards (topo)

4 cards em linha, sempre nesta ordem. Período default = mês corrente (`referenceMonth` atual); seletor permite trocar para mês anterior (histórico, não range livre em P0).

### 1.1 Campos por card

| Card | Campo exibido | Tipo | Formato | Origem do dado |
|---|---|---|---|---|
| **Total previsto** | valor | number (centavos → reais) | `R$ 12.450,00` (BRL, 2 casas) | `SUM(Invoice.netAmountCents) WHERE status IN (PENDING, PAID) AND referenceMonth = mês selecionado` |
| **Total recebido** | valor | number (centavos → reais) | `R$ 8.900,00` | `SUM(Invoice.netAmountCents) WHERE status=PAID AND paidAt` dentro do período selecionado (**não** `dueDate`) |
| **Total vencido** | valor + quantidade | number + int | `R$ 1.200,00` · badge/subtexto `"6 alunos"` | `SUM(Invoice.netAmountCents)` + `COUNT(DISTINCT studentId)` `WHERE status=OVERDUE`, join via Enrollment |
| **Total negativado** | valor + quantidade | number + int | `R$ 450,00` · subtexto `"2 alunos"` | `SUM(Invoice.netAmountCents)` + `COUNT(DISTINCT studentId)` `WHERE Invoice.status=NEGATIVATED` |

Todos os 4 cards são filtrados por `unitId` da sessão — nunca aceitar `unitId` vindo do cliente (RN-01).

### 1.2 Seletor de período

- Controle único acima dos cards, afeta os 4 KPIs + tabela + filtros (não afeta o gráfico de linha, que é fixo em "últimos 3 meses" — ver bloco 4).
- Default: mês corrente (label ex. `"Julho/2026"`).
- Navegação: mês anterior via seta/dropdown. P0 não tem range livre nem "trimestre/semestre/ano" (isso é P1, aba Relatórios).

### 1.3 Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Loading** | Query em andamento | Skeleton nos 4 cards (placeholder de valor + label), sem pulo de layout quando o dado chega |
| **Vazio** | Nenhuma Invoice no período selecionado (RN-10) | Os 4 cards mostram `R$ 0,00` (ou `0` para contagens) — não esconder o card. Copy adicional abaixo dos cards ou em área central: **"Nenhuma cobrança no período"** |
| **Erro** | Falha na query (timeout, erro de banco) | Cards exibem estado de erro individual (não travar a tela toda) — copy: **"Não foi possível carregar este dado. Tentar novamente."** com ação de retry |

### 1.4 Regras de negócio visíveis nesta tela

- **RN-04 (crítica para o design):** uma Invoice com `status=PENDING` e `dueDate` no passado **deve contar visualmente como vencida**, mesmo que o campo técnico `status` no banco ainda esteja `PENDING` (o webhook Asaas que confirma a mudança para `OVERDUE` pode atrasar). Ou seja: **"Total previsto" nunca inclui essas invoices** — elas são somadas em "Total vencido" independente do valor cru de `status`. Isso é resolvido na query (backend), mas o design não deve reintroduzir esse bug em telas futuras que agreguem por `status` puro sem essa checagem de `dueDate`.
- **RN-02:** período default é sempre o mês corrente ao abrir a tela — nunca abrir em branco ou no último mês visitado.
- **RN-03:** "Total recebido" usa `paidAt`, não `dueDate`. Isso significa que uma cobrança paga com atraso em julho, mas vencida em junho, **conta em julho** — não é bug se os números parecerem "deslocados" de um mês para o outro.
- **Performance:** os 4 KPIs (+ gráfico) precisam carregar em **≤ 2s**. Se o design incluir variação "+X% vs mês anterior" (P1, fora desta rodada — ver §6), não bloquear o carregamento dos KPIs principais esperando essa segunda query.

### 1.5 Copy sugerido

- Labels dos cards: `"Total previsto"`, `"Total recebido"`, `"Total vencido"`, `"Total negativado"`.
- Subtexto de contagem: `"{N} aluno"` / `"{N} alunos"` (singular/plural).
- Vazio: `"Nenhuma cobrança no período"`.
- Erro: `"Não foi possível carregar este dado. Tentar novamente."`

---

## 2. Tabela de Inadimplência

Uma linha por aluno/invoice vencida (`status=OVERDUE`, ou com `Dunning`/`DunningLog` ativo). Esta é a única tela desta rodada com uma ação de escrita.

### 2.1 Colunas

| Coluna | Campo | Tipo | Formato | Origem do dado |
|---|---|---|---|---|
| **Aluno** | `Student.nameEnc` | string (PII, criptografado) | Nome completo | Descriptografado **no service**, nunca no client, nunca cacheado (RN-08) |
| **Matéria** | `Subject.name` | string | Texto simples | Join `Enrollment → Subject` |
| **Valor** | `Invoice.netAmountCents` | number (centavos → reais) | `R$ 450,00` | Conversão `/100` só na exibição (nunca armazenar reais) |
| **Dias de atraso** | `Invoice.dueDate` | int | `18` ou `"18 dias"` | `hoje - dueDate` em dias inteiros, **nunca negativo** — invoices não vencidas não aparecem nesta tabela (RN-13) |
| **Etapa da régua** | `DunningLog.action` (derivado) | enum (badge) | Badge colorido — ver §2.2 | `getReguaEtapa(invoiceId)`, reusa função já modelada em `mvp-045-regua-negativacao.md` §7b (RN-11, RN-12) |
| **Ação rápida** | `Enrollment.dunningPaused` | boolean (toggle) | Toggle "Pausar régua" | Única escrita da tela — ver §2.3 (RN-14) |

### 2.2 Etapa da régua — nomenclatura e mapeamento

Os rótulos técnicos vêm de `DunningLog.action`, mas a spec F2 usa nomenclatura ligeiramente diferente da spec de negativação (F5) para os estados de exibição. **Usar exatamente estes 6 valores como badge**, na mesma nomenclatura da F3/F5 (reusar o componente já usado lá — não inventar rótulo novo):

| Valor técnico (`DunningLog.action` mais avançado com `result="success"`) | Rótulo de exibição | Variant de badge sugerida |
|---|---|---|
| nenhum log com sucesso | `NONE` | neutral (cinza) |
| `REMINDER` | `REMINDED` | info (azul claro) |
| `WARNING1` | `WARNED1` | warning (âmbar) |
| `WARNING2` | `WARNED2` | warning (âmbar, mais forte / com ícone de urgência se o DS suportar) |
| `NEGATIVATION` | `NEGATIVATED` | danger (vermelho) |
| `CANCELLATION` (regularização) | `REGULARIZED` | success (verde) |

> Nota de nomenclatura: o pedido de design usa `NONE/REMINDED/WARNED1/WARNED2/NEGATIVATED/REGULARIZED` — isso é o **rótulo de exibição**; o **valor técnico** correspondente em `DunningLog.action` é `REMINDER/WARNING1/WARNING2/NEGATIVATION/CANCELLATION`. Mapeamento 1:1 acima. Confirmar com backend qual string exata a API retorna antes de fixar o texto do badge no componente — pode vir já traduzida.

Derivação (RN-12, sem lógica nova — só leitura):
```
SEM DunningLog com result="success"      → NONE
Ação mais avançada com sucesso REMINDER  → REMINDED
Ação mais avançada com sucesso WARNING1  → WARNED1
Ação mais avançada com sucesso WARNING2  → WARNED2
Ação mais avançada com sucesso NEGATIVATION → NEGATIVATED
Ação mais avançada com sucesso CANCELLATION → REGULARIZED
```

### 2.3 Ação rápida — "Pausar régua"

- **Única escrita desta tela inteira.** Tudo o resto (KPIs, tabela, filtros, gráfico) é leitura pura — nenhuma outra célula/botão desta tela deve chamar API de mutação.
- Afeta `Enrollment.dunningPaused` (boolean) — pausa a régua para **TODAS as invoices da matrícula**, não só a invoice vencida exibida na linha (o toggle é por aluno/matrícula, não por cobrança individual).
- É **a mesma ação** já existente na tela F3 (`mvp-05-negativacao.md`) — aqui é um atalho de acesso rápido, não uma ação nova. Reusar o mesmo componente/lógica de confirmação já implementado lá, não recriar.
- **Exige confirmação antes de aplicar** — modal/dialog simples: "Pausar a régua de cobrança de {nome do aluno}? Isso bloqueia lembretes, avisos e negativação até você reativar." com botão de confirmar/cancelar.
- Após confirmar: `PATCH` na Invoice/Enrollment, UI reflete o novo estado **sem reload completo da tabela** (otimistic update ou refetch pontual da linha).
- Não chama Asaas diretamente (a pausa é local, só afeta o disparo automático da régua).

### 2.4 Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Loading** | Query em andamento | Skeleton de linhas (ex. 5 linhas placeholder) |
| **Vazio (positivo)** | Nenhuma invoice `OVERDUE` no período/filtro atual, taxa de inadimplência = 0 (RN-09) | Copy positiva, não copy de erro — ver §2.5 |
| **Erro** | Falha na query | Mensagem de erro + retry, sem quebrar o resto da tela (KPIs continuam visíveis) |
| **Ação em andamento** | Toggle "Pausar régua" clicado, aguardando resposta da API | Toggle em estado de loading/disabled na linha específica até a resposta voltar |

### 2.5 Copy sugerido

- Vazio positivo (RN-09): **"Nenhuma inadimplência no período"** (tom positivo — não é erro, é uma boa notícia. Evitar ícone de alerta aqui; usar ícone neutro/positivo).
- Confirmação de pausa: **"Pausar a régua de cobrança de {aluno}? Isso bloqueia lembretes, avisos e negativação até você reativar."**
- Sucesso após pausar: toast/feedback curto — **"Régua pausada para {aluno}."**
- Erro ao pausar: **"Não foi possível pausar a régua. Tente novamente."**

---

## 3. Filtros

Barra de filtros acima da tabela de inadimplência. Afeta a tabela — **não** afeta os 4 KPI cards do topo (que seguem só o seletor de período do bloco 1).

| Filtro | Tipo | Opções | Comportamento |
|---|---|---|---|
| **Status** | select/segmented | Todas / Pagas / A vencer / Vencidas / Negativadas | Mapeia para `Invoice.status` (`PAID`, `PENDING`, `OVERDUE`, `NEGATIVATED`) |
| **Período** | select | Mês corrente (default) + meses anteriores | Mesmo período do bloco 1, controle pode ser compartilhado ou duplicado — decisão de UI, mas o valor deve ser o mesmo estado |
| **Matéria** | select | Lista de `Subject` da unidade | Join `Enrollment → Subject`, filtra linhas da tabela |

### 3.1 Estados

- Filtros combináveis (AND entre eles).
- Ao aplicar filtro que zera o resultado: reusar o mesmo estado vazio do bloco 2 (copy pode variar levemente para indicar que é resultado de filtro, ex. **"Nenhuma cobrança encontrada com esses filtros"** vs. o vazio "puro" do período — validar com PM se vale diferenciar as duas mensagens).
- Filtros não têm efeito nos KPIs nem no gráfico — só na tabela.

---

## 4. Gráfico de linha — Recebido por semana

### 4.1 Campos

| Campo | Tipo | Formato | Origem do dado |
|---|---|---|---|
| Eixo X | semana ISO | `"Sem 27"` ou data de início da semana | `GROUP BY` semana ISO sobre `Invoice.paidAt` |
| Eixo Y | valor recebido | centavos → reais | `SUM(Invoice.netAmountCents) WHERE status=PAID`, agrupado por semana, filtrado por `unitId` |

- **Janela fixa: últimos 3 meses** — não é afetado pelo seletor de período do bloco 1 nem pelos filtros do bloco 3. É sempre "hoje - 3 meses" até hoje.
- Uma única série (não há breakdown por matéria/status neste gráfico em P0).

### 4.2 Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Loading** | Query em andamento | Skeleton do gráfico (placeholder de barras/linha cinza) |
| **Vazio** | Nenhum valor recebido nas últimas 12-13 semanas | Área do gráfico com copy central: **"Nenhum recebimento nos últimos 3 meses"** (não desenhar eixo vazio sem contexto) |
| **Erro** | Falha na query | Copy de erro + retry, isolado do resto da tela |

### 4.3 Copy sugerido

- Título do bloco: `"Recebido por semana"` com subtítulo `"Últimos 3 meses"`.
- Vazio: `"Nenhum recebimento nos últimos 3 meses"`.

---

## 5. Estados vazios — resumo geral da tela

Consolidando os estados vazios já descritos por bloco, para referência única do designer:

| Bloco | Condição de vazio | Copy |
|---|---|---|
| KPIs (topo) | Nenhuma Invoice no período (RN-10) | `"Nenhuma cobrança no período"` (todos os 4 cards mostram zero) |
| Tabela de inadimplência | Zero invoices OVERDUE, taxa de inadimplência = 0 (RN-09) | `"Nenhuma inadimplência no período"` (tom positivo) |
| Tabela de inadimplência + filtro aplicado | Filtro zera o resultado | `"Nenhuma cobrança encontrada com esses filtros"` (a validar com PM se difere do vazio "puro") |
| Gráfico de linha | Nenhum valor recebido em 3 meses | `"Nenhum recebimento nos últimos 3 meses"` |

Regra geral de tom: vazio **não é erro**. Evitar iconografia de alerta/erro nesses estados — são leituras normais e, no caso da tabela de inadimplência, um resultado desejável (zero inadimplência = boa notícia).

---

## 6. Fora do escopo desta rodada (P1)

**P1 — não desenhar agora:** os 4 sub-relatórios (R1 Cobrança, R2 Inadimplência, R3 Crescimento, R4 Cancelamentos) com gráficos intercambiáveis, o bloco **RecoveryHero** (funil de recuperação), a aba **Extrato** com reconciliação Asaas, o e-mail semanal, e a exportação CSV. Essas peças entram em rodada de design futura, após P0 estar validado com escola real.

---

## 7. Componentes do Design System a reusar

Base: `/Users/rafae/projetos/education-x-mvp/src/components/ui/`

| Componente do DS | Uso nesta tela | Observação |
|---|---|---|
| `Metric.tsx` | 4 KPI cards do bloco 1 | Já suporta `label`, `value`, `icon`, `trend`/`trendValue` — trend é opcional em P0 (não há variação vs. mês anterior nesta rodada, isso é P-01/P1). Usar sem trend por padrão. |
| `BarChart.tsx` | **Não serve como está** para o gráfico de linha do bloco 4 | Componente atual renderiza só barras verticais (`height` proporcional, sem linha/path SVG). **Precisa de variante nova** (`LineChart.tsx` ou extensão do mesmo arquivo com `variant="line"`) — sinalizar para engenharia/DS antes de montar a tela. Reaproveitar o mesmo esquema de props (`data: {label, value}[]`, `fmt`) para manter consistência. |
| `table.tsx` (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`) | Tabela de inadimplência (bloco 2) | Estrutura pronta, já com hover de linha e scroll horizontal embutido. |
| `badge.tsx` (`Badge`, `StatusBadge`) | Badge de etapa da régua (bloco 2) | `StatusBadge` hoje só mapeia status em português (`ativa`, `pago`, `pendente`, etc. — ver `STATUS` map). **Precisa adicionar entradas novas** para os 6 valores da régua (`NONE`, `REMINDED`, `WARNED1`, `WARNED2`, `NEGATIVATED`, `REGULARIZED`) ou usar `Badge` direto com `variant` explícita por etapa (sugestão de mapeamento em §2.2). Sinalizar para engenharia. |
| `toggle.tsx` (`Toggle`) | Ação rápida "Pausar régua" (bloco 2) | Componente pronto (`checked`/`onChange`/`disabled`) — usar com o modal de confirmação por cima, o toggle sozinho não deve aplicar a mutação sem confirmar. |
| `Card.tsx` | Container dos KPIs (via `Metric`) e possivelmente do bloco de gráfico/filtros | Já usado internamente por `Metric`. |
| `segmented.tsx` | Filtro de Status (bloco 3), se o design optar por segmented control em vez de select | Alternativa ao `<select>` nativo para poucas opções. |
| `field.tsx` / `input.tsx` | Seletor de período (mês), select de matéria | Padrão de formulário do DS. |

**Sinalizações para engenharia/DS antes de montar a tela:**
1. `BarChart.tsx` não cobre o gráfico de linha do bloco 4 — precisa de variante ou componente novo.
2. `STATUS` map do `badge.tsx` não tem as 6 etapas da régua — precisa de extensão (ou uso direto de `Badge variant=...` sem passar por `StatusBadge`).

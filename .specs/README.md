# `.specs/` — Specs de produto do Education X

Specs técnicas por fluxo. Cada uma define **quais dados o produto precisa** para a operação acontecer, derivados de baixo pra cima (piso = payload real do Asaas), confrontados com o schema Prisma e as decisões de produto. O design é referência de UX, não fonte de verdade dos campos.

> **Como a spec vive no workflow:** a spec é o artefato upstream que alimenta o pipeline de 7 passos do `.claude/AGENTS.md`. Ela termina em fatiamento de Task Contracts (skill `task-contract`), cada fatia vira 1 PR ≤400 linhas com DoD binário.

## Nomenclatura: `fase-NN-nome`

O nome do arquivo carrega a **fase de lançamento** e a **ordem** dentro dela (decisão de corte com Rafa, 2026-07-03). O corte segue a filosofia 37signals ("build half a product" — a espinha financeira primeiro) e o fato competitivo verificado (a Sponte não tem negativação → é a cunha). Cada spec tem `Fase:` + `Ordem:` no cabeçalho.

### MVP — espinha financeira (o que vende e valida)

| Spec | Toca dinheiro? | Models-chave |
|---|---|---|
| [mvp-01 · Onboarding da escola](mvp-01-onboarding-escola.md) | sim (subconta) | Unit, BillingConfig, Subject |
| [mvp-02 · Matrícula (link + manual)](mvp-02-matricula.md) | sim | Guardian, Student✗, Enrollment✗ |
| [mvp-03 · Cobrança automática (boleto/PIX)](mvp-03-cobranca-automatica.md) | sim | Invoice✗, Payment✗ |
| [mvp-04 · Nota fiscal + régua](mvp-04-nota-fiscal-regua.md) | sim | Invoice✗, NfseConfig✗ |
| [mvp-05 · Negativação SPC/Serasa](mvp-05-negativacao.md) **(cunha)** | sim | Dunning✗ |
| [mvp-06 · Transferência de saldo (saque PIX)](mvp-06-transferencia-saldo.md) | sim | BankAccount✗, Transfer✗ |

### Fase 2 — pós-validação (só constrói se a dor puxar)

| Spec | Toca dinheiro? | Models-chave |
|---|---|---|
| [f2-01 · Painel da escola](f2-01-painel-escola.md) | não (leitura) | agregação |
| [f2-02 · Portal do responsável](f2-02-portal-responsavel.md) | sim | Payment, CardToken✗ |
| [f2-03 · Antecipação de recebíveis](f2-03-antecipacao-recebiveis.md) | sim | Anticipation✗ |
| [f2-04 · Billing + importação + settings](f2-04-billing-importacao-settings.md) | sim | PlatformInvoice✗ |
| [f2-05 · Contas a pagar](f2-05-contas-pagar.md) | não (registro manual) | FinancialCategory✗, Supplier✗, Payable✗ |
| [f2-06 · Fluxo de caixa](f2-06-fluxo-caixa.md) | não (leitura) | agregação (Invoice + Payable) |

### Backlog — 2º lançamento (spec escrita, não construir agora)

| Spec | Toca dinheiro? | Models-chave |
|---|---|---|
| [bkl-01 · Gestão de horários (match aluno×atendente)](bkl-01-gestao-horarios.md) | não | Attendant✗, TimeSlot✗, ScheduleAssignment✗ |

✗ = model ainda não existe no schema (delta especificado na spec).

> **Fatiamento do fluxo 08 original (saque + antecipação):** transferência de saldo → `mvp-06` (MVP); antecipação de recebíveis → `f2-03` (Fase 2). O `08-saque-antecipacao.md` foi removido; seu conteúdo vive nas duas.

**f2-05 e f2-06 — paridade financeira com a Sponte.** Os planos comerciais Business e Cofounder prometem "fluxo de caixa + contas a pagar e receber". O lado receber (Invoice) e a negativação (moat) já estão em `mvp-03` e `mvp-05`. As specs `f2-05` (contas a pagar manual) e `f2-06` (fluxo de caixa por projeção) fecham o gap. DRE e bill-pay Asaas ficam no roadmap (a própria Sponte só tem DRE no roadmap).

## Fontes de verdade (ordem)
1. **Piso de campos** = doc oficial Asaas (`docs.asaas.com/reference/*`) + skill `ix-asaas`, confrontado com `src/lib/integration/asaas/types.ts`.
2. **Dados de negócio/fiscal/LGPD** = decisões de produto (memória `education-x-modelo-cobranca`, `docs/DISCREPANCIAS-roadmap-vs-prototipo.md`, ADRs, `.claude/rules/`).
3. **Schema atual** (alvo do confronto) = `prisma/schema.prisma`.
4. **Design = referência de UX apenas** = `prototipo/design-handoff/` (standalone HTML + screenshots + jsx + chats). Mostra como coletar, não o que coletar.
5. **Reconciliação de shape entre specs** = [`DECISOES-SHAPE.md`](DECISOES-SHAPE.md).
6. **Pricing** = [`PRICING.md`](PRICING.md).
7. **Handoffs de design (persona dona/orientadora)** = [`design-handoff/`](design-handoff/) — um por spec MVP.

## Formato comum
Ver [`_TEMPLATE.md`](_TEMPLATE.md) (agora com `Fase:` + `Ordem:`). Baseado no exemplar fechado com o Rafa em 19/jun (`mvp-01-onboarding-escola.md`). Brand voice: direto, sem travessão, frases curtas, pt-BR na UI / inglês nas entidades. Valores em centavos no app; reais só na borda Asaas.

## Deltas de schema agregados (todos os models novos propostos pelas specs)

O schema atual tem: `Unit`, `BillingConfig`, `Subject`, `Guardian`, `TermsVersion`, `TermsAcceptance`. As specs propõem os models abaixo. Antes de implementar, validar nomes/relações em conjunto (há sobreposição entre fluxos — ex: `Invoice`/`Payment` nascem em `mvp-03` e são referenciados por `mvp-04`/`mvp-05`/`f2-01`/`f2-02`).

| Model novo | Nasce na spec | Referenciado por | Papel |
|---|---|---|---|
| `Student` | mvp-02 | mvp-03, f2-01, f2-04, bkl-01 | aluno |
| `Enrollment` | mvp-02 | mvp-03, f2-01 | Student × Subject × plano × preço (unidade de cobrança) |
| `Invoice` | mvp-03 | mvp-04, mvp-05, f2-01, f2-02 | cobrança gerada (ref Asaas payment) |
| `Payment` | mvp-03 | f2-01, f2-02 | confirmação de recebimento |
| `NfseConfig` | mvp-04 | — | config fiscal NFS-e (avaliar: model vs campos em BillingConfig) |
| `Dunning` | mvp-05 | f2-01 | negativação (4 status + opt-out) |
| `BankAccount` / `Transfer` | mvp-06 | f2-03 | conta de repasse + saque PIX |
| `Anticipation` | f2-03 | — | antecipação de recebíveis de cartão |
| `CardToken` / `PortalSession` | f2-02 | f2-04 | token de cartão PCI + sessão do portal do responsável |
| `PlatformInvoice` / `ImportJob` | f2-04 | — | IX cobra a escola + importação CSV |
| `Attendant` / `TimeSlot` / `ScheduleAssignment` | bkl-01 | — | gestão de horários (2º lançamento) |

⚠️ **Conflitos resolvidos** (detalhe em [`DECISOES-SHAPE.md`](DECISOES-SHAPE.md)):
1. **`Enrollment` — dono `mvp-02`.** Usa `EnrollmentPlan` + `agreedPriceCents`/`finalPriceCents` + desconto em 3 campos + `EnrollmentStatus`. A `mvp-03` só referencia e acrescenta `customDueDay`, `isFirstChargeDone`, relação `invoices`.
2. **`Invoice`/`Payment` — dono `mvp-03`**, schema único, referenciado pelas demais.
3. **Tokens de cartão distintos:** `CardToken` (f2-02, responsável) vs `asaasCardTokenEnc` em Unit (f2-04, escola) — donos diferentes, manter separados.
4. **`BankAccount` como model separado** (não campos em Unit) — decisão de `mvp-06`.

## Decisões fechadas (Rafa, 2026-07-03)
- **✅ Pricing** — ver [`PRICING.md`](PRICING.md). Espelha a Sponte (plano único R$ 150/mês até 150 alunos + adicionais), Asaas como custo interno. Não é 3 tiers.
- **✅ Evento Asaas que dispara PAID = `PAYMENT_RECEIVED`** (mvp-03/mvp-04).
- **✅ Config fiscal NFS-e** — vive em dois lugares: passo fiscal no onboarding (mvp-01) + Configurações > Fiscal (mvp-04). Mesmo `NfseConfig`.

## Pendências globais (não fixar sem decisão do Rafa)
- **`incomeValue` na subconta** — obrigatório no Asaas, não coletado no design atual (mvp-01).
- **Auth do portal do responsável** — link/token sem Clerk vs sessão própria (f2-02).
- **Custo real do Asaas** (margem do gateway) — levantar tabela oficial; não bloqueia o preço de venda.

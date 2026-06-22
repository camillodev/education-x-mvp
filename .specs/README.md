# `.specs/` — Specs de produto do Education X

Specs técnicas por fluxo. Cada uma define **quais dados o produto precisa** para a operação acontecer, derivados de baixo pra cima (piso = payload real do Asaas), confrontados com o schema Prisma e as decisões de produto. O design é referência de UX, não fonte de verdade dos campos.

> **Como a spec vive no workflow:** a spec é o artefato upstream que alimenta o pipeline de 7 passos do `.claude/AGENTS.md`. Ela termina em fatiamento de Task Contracts (skill `task-contract`), cada fatia vira 1 PR ≤400 linhas com DoD binário.

## Os 11 fluxos do MVP

| # | Spec | Toca dinheiro? | Models-chave |
|---|------|----------------|--------------|
| 01 | [Onboarding da escola](01-onboarding-escola.md) | sim (subconta) | Unit, BillingConfig, Subject |
| 02 | [Matrícula (link + manual)](02-matricula.md) | sim | Guardian, Student✗, Enrollment✗ |
| 03 | [Cobrança automática (boleto/PIX)](03-cobranca-automatica.md) | sim | Invoice✗, Payment✗ |
| 04 | [Nota fiscal + régua](04-nota-fiscal-regua.md) | sim | Invoice✗, NfseConfig✗ |
| 05 | [Negativação SPC/Serasa](05-negativacao.md) | sim | Dunning✗ |
| 06 | [Painel da escola](06-painel-escola.md) | não (leitura) | agregação |
| 07 | [Portal do responsável](07-portal-responsavel.md) | sim | Payment, CardToken✗ |
| 08 | [Saque + antecipação](08-saque-antecipacao.md) | sim | Transfer✗, Anticipation✗ |
| 09 | [Billing + importação + settings](09-billing-importacao-settings.md) | sim | PlatformInvoice✗ |
| 10 | [Contas a pagar](10-contas-pagar.md) | não (registro manual) | FinancialCategory✗, Supplier✗, Payable✗ |
| 11 | [Fluxo de caixa](11-fluxo-caixa.md) | não (leitura) | agregação (Invoice + Payable) |

✗ = model ainda não existe no schema (delta especificado na spec).

**Specs 10 e 11 — paridade financeira com a Sponte.** Os planos comerciais Business e Cofounder prometem "fluxo de caixa + contas a pagar e receber". O lado receber (Invoice) e a negativação (moat) já estão nas specs 03 e 05. As specs 10 (contas a pagar manual) e 11 (fluxo de caixa por projeção) fecham o gap. DRE e bill-pay Asaas ficam no roadmap (a própria Sponte só tem DRE no roadmap).

## Fontes de verdade (ordem)
1. **Piso de campos** = doc oficial Asaas (`docs.asaas.com/reference/*`) + skill `ix-asaas`, confrontado com `src/lib/integration/asaas/types.ts`.
2. **Dados de negócio/fiscal/LGPD** = decisões de produto (memória `education-x-modelo-cobranca`, `docs/DISCREPANCIAS-roadmap-vs-prototipo.md`, ADRs, `.claude/rules/`).
3. **Schema atual** (alvo do confronto) = `prisma/schema.prisma`.
4. **Design = referência de UX apenas** = `prototipo/design-handoff/` (standalone HTML + screenshots + jsx + chats). Mostra como coletar, não o que coletar.

## Formato comum
Ver [`_TEMPLATE.md`](_TEMPLATE.md). Baseado no exemplar fechado com o Rafa em 19/jun (`01-onboarding-escola.md`). Brand voice: direto, sem travessão, frases curtas, pt-BR na UI / inglês nas entidades. Valores em centavos no app; reais só na borda Asaas.

## Deltas de schema agregados (todos os models novos propostos pelas specs)

O schema atual tem: `Unit`, `BillingConfig`, `Subject`, `Guardian`, `TermsVersion`, `TermsAcceptance`. As specs propõem os models abaixo. Antes de implementar, validar nomes/relações em conjunto (há sobreposição entre fluxos — ex: `Invoice`/`Payment` nascem no 03 e são referenciados por 04/05/06/07).

| Model novo | Nasce na spec | Referenciado por | Papel |
|---|---|---|---|
| `Student` | 02 | 03, 06, 09 | aluno |
| `Enrollment` | 02 | 03, 06 | Student × Subject × plano × preço (unidade de cobrança) |
| `Invoice` | 03 | 04, 05, 06, 07 | cobrança gerada (ref Asaas payment) |
| `Payment` | 03 | 06, 07 | confirmação de recebimento |
| `NfseConfig` | 04 | — | config fiscal NFS-e (avaliar: model vs campos em BillingConfig) |
| `Dunning` | 05 | 06 | negativação (4 status + opt-out) |
| `CardToken` / `PortalSession` | 07 | 09 | token de cartão PCI + sessão do portal do responsável |
| `Transfer` / `Anticipation` / `BankAccount` | 08 | — | saque PIX + antecipação + conta de repasse |
| `PlatformInvoice` / `ImportJob` | 09 | — | IX cobra a escola + importação CSV |

⚠️ **Conflitos a resolver na implementação (verificados lendo as specs):**
1. **`Enrollment` foi definido em DUAS specs com shapes diferentes.** A spec 02 (matrícula, dona do model) usa enum `EnrollmentPlan` + `agreedPriceCents`/`finalPriceCents` + desconto em 3 campos (`discountType`/`discountValueBp`/`discountValueCents`) + `status: EnrollmentStatus`. A spec 03 usa `PlanType` + `discountCents` único + `status: String`. **Resolução: a spec 02 é a fonte de verdade do `Enrollment`** (é o fluxo que o cria); a 03 só o referencia. Reconciliar antes da migration.
2. `Invoice`/`Payment` precisam de schema único (nascem no 03, referenciados por 04/05/06/07), não 1 por fluxo.
3. Nomes próximos a unificar: `NfseConfig` vs campos em `BillingConfig`/`Subject`; `BankAccount` vs campos em `Unit`; `CardToken` (07) vs `asaasCardTokenEnc` em `Unit` (09 — escola) — são tokens de cartão de donos diferentes (responsável vs escola), manter separados mas nomear bem.
4. Onde guardar a conta de repasse (Asaas vs banco local) — decisão da spec 08.

## Pendências globais (não fixar sem decisão do Rafa)
- **Pricing dos planos Education X** (Básico/Crescimento/Pro) — mock, decisão pendente (spec 09).
- **CONFIRMED vs RECEIVED** — qual evento Asaas dispara PAID (specs 03/04; recomendação: RECEIVED).
- **`incomeValue` na subconta** — obrigatório no Asaas, não coletado no design atual (spec 01).
- **Auth do portal do responsável** — link/token sem Clerk vs sessão própria (spec 07).

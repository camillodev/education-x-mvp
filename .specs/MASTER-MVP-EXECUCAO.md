# MASTER — Execução do MVP Education Hub

> **Status:** ativo (Claude + Rafa, 2026-07-09)
> **Fonte prioritária de escopo:** `prd-education-hub-mvp.md` (second brain, 2026-07-09). Specs deste diretório implementam o PRD; onde divergirem, o PRD ganha.
> **Regra de execução:** 1 feature COMPLETA por vez (DoD binário verde + PR + CI) antes da próxima. Fatias dentro da feature podem rodar em paralelo.

## Decisões estruturais (fechadas 2026-07-09 — não reabrir)

| # | Decisão | Detalhe |
|---|---|---|
| 1 | Régua própria + negativação automática | `mvp-045-regua-negativacao.md` substitui régua nativa Asaas (mvp-04) e negativação manual (mvp-05) |
| 2 | Portal auth = magic link | **DT-01 (débito técnico):** migrar p/ CPF+OTP SMS (PRD M4) quando provedor decidido |
| 3 | Multi-tenant = app-layer `unitId` (ADR) | RLS Supabase = harden pós-MVP (**DT-02**). Compensação: teste de isolamento por tenant no DoD de todo service |
| 4 | NFS-e = P1 pós-core | Campos `nfse*` nascem no schema; emissão automática só se sobrar tempo (**DT-03**) |
| 5 | Pós-MVP | Depósito via cartão (owner, gross-up 5%, 12x) · mvp-06 transferência de saldo · turmas/comunicados |
| 6 | Cobrança = `POST /payments` avulsa via cron | Não subscriptions. `PAYMENT_RECEIVED` = PAID. Boleto embute PIX |

## Ordem de execução e dependências

```
F0 schema (SCHEMA-CONSOLIDADO.md, migrations faseadas por feature)
 └─ F1 Matrícula + Serasa (mvp-02) ─── depende: schema parte 1
     └─ F2 Cobrança + Webhook (mvp-03) ─ depende: Enrollment/Guardian ativos (F1)
         └─ F3 Régua + Negativação (mvp-045) ─ depende: Invoice + webhook router (F2)
             ├─ F4 Portal Responsável (f2-02) ─ depende: Invoice (F2); banner usa Dunning (F3)
             └─ F5 Dashboard Escola (f2-01 P0) ─ depende: Invoice (F2) + etapa da régua (F3)
```

F4 e F5 são independentes entre si (podem paralelizar se contexto/tokens permitirem).

## Mapa feature → branch → PR

Branches empilhadas (stacked): cada uma nasce da anterior; merge em cascata na revisão.

| Feature | Spec | Branch | Base | Migration |
|---|---|---|---|---|
| F1 Matrícula + Serasa | mvp-02 | `feature/mvp-01-matricula-serasa` | main¹ | add-student-enrollment-serasa |
| F2 Cobrança + Webhook | mvp-03 | `feature/mvp-02-cobranca-webhook` | F1 | add-invoice-payment-billing |
| F3 Régua + Negativação | mvp-045 | `feature/mvp-03-regua-negativacao` | F2 | add-dunning |
| F4 Portal Responsável | f2-02 | `feature/mvp-04-portal-responsavel` | F3 | add-portal-session-card-token |
| F5 Dashboard Escola | f2-01 (P0) | `feature/mvp-05-dashboard-escola` | F3 | add-dashboard-indexes |

¹ após merge de `chore/specs-prd-alignment`.

## Quality gate por PR (inegociável)

```bash
pnpm test:run && pnpm typecheck && pnpm lint && pnpm build
# + DoD binário da spec (seção 9) — inclui Playwright E2E se toca dinheiro
# + teste de isolamento de tenant em cada service novo
# + gh pr checks <PR> → verde real
```

Asaas: **sandbox sempre**. Nenhuma operação de produção sem confirmação explícita do Rafa.

## Débitos técnicos registrados

| ID | Débito | Origem | Quando pagar |
|---|---|---|---|
| DT-01 | Portal: CPF+OTP SMS no lugar de magic link | PRD M4 | Após decisão Twilio vs WhatsApp Asaas |
| DT-02 | RLS Supabase por unit | PRD transversal | Harden pós-MVP |
| DT-03 | NFS-e emissão automática | PRD M2 P1 / mvp-04 | Pós-core (campos já no schema) |
| DT-04 | Validação jurídica "confirmado presencialmente" (LGPD) | mvp-02 P6 | Antes da 1ª venda com fluxo presencial |
| DT-05 | ToS Asaas: cash-in cartão p/ própria conta + valor mínimo depósito | PRD open questions | Antes de implementar Depósito via Cartão |

## Espelho no vault / Linear

Após fechar cada spec: plano de implementação em `~/Documents/Claude/second-brain/profissional/wiki/plans/impl-<feature>.md`. O Linear do Rafa espelha esses planos (1 issue por feature, sub-issues por fatia).

# Decisões de Shape — reconciliação de models entre specs

> **Status:** fechada (Rafa + Claude, 2026-07-03). Resolve os conflitos que o `README.md` listou antes do faseamento.
> **Regra:** o model tem **um dono** (a spec que o cria). As demais specs **referenciam**, não redefinem. Quando um shape diverge, o dono vence.

---

## 1. `Enrollment` — dono: `mvp-02-matricula`

A spec de matrícula (`mvp-02`) é a **dona** do `Enrollment` (é o fluxo que o cria). A spec de cobrança (`mvp-03`) o **referencia** e só acrescenta os 3 campos que a cobrança precisa.

**Shape canônico** = base da `mvp-02` + campos operacionais da `mvp-03`:

| Campo | Fonte | Nota |
|---|---|---|
| `plan: EnrollmentPlan` | mvp-02 (vence sobre `planType: PlanType`) | enum MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL |
| `agreedPriceCents`, `finalPriceCents` | mvp-02 | snapshot do preço + auditoria de desconto |
| `discountType` / `discountValueBp` / `discountValueCents` | mvp-02 (vence sobre `discountCents` único) | desconto rico: % (bp) ou fixo (centavos) |
| `status: EnrollmentStatus` | mvp-02 (vence sobre `status: String`) | enum de 5 estados (PENDING_CONFIRMATION → ACTIVE → …) |
| `confirmationToken` / `…ExpiresAt` / `confirmedAt` | mvp-02 | link de confirmação do fluxo manual |
| `asaasSubscriptionId` | mvp-02 | preenchido quando a assinatura recorrente nasce |
| **`customDueDay: Int?`** | **mvp-03** (acrescenta) | override do `dueDay` da BillingConfig |
| **`isFirstChargeDone: Boolean`** | **mvp-03** (acrescenta) | controla proporcional vs 1º boleto |
| **`invoices Invoice[]`** | **mvp-03** (acrescenta) | relação com as cobranças geradas |

**Ação nas specs:** `mvp-03` remove o bloco `model Enrollment` redefinido e passa a dizer *"Enrollment é criado em mvp-02; esta spec adiciona os campos `customDueDay`, `isFirstChargeDone` e a relação `invoices`"*.

## 2. `Invoice` / `Payment` — dono: `mvp-03-cobranca-automatica`

Nascem na cobrança e são **referenciados** por `mvp-04` (NFS-e), `mvp-05` (negativação), `f2-01` (painel) e `f2-02` (portal). Schema **único**, não um por fluxo. As specs downstream referenciam; não redefinem.

## 3. Tokens de cartão — nomes distintos, donos distintos (manter separados)

- `CardToken` (dono: `f2-02-portal-responsavel`) = cartão do **responsável** (PCI, tokenização).
- `asaasCardTokenEnc` em `Unit` (dono: `f2-04-billing`) = cartão da **escola** (paga a assinatura IX).
- São donos diferentes — manter separados, nomear bem, nunca unificar.

## 4. Decisões fechadas (antes eram pendências)

- **✅ Evento Asaas que dispara `Invoice.status = PAID` = `PAYMENT_RECEIVED`** (Rafa, 2026-07-03). Vale para `mvp-03` (cobrança) e `mvp-04` (NFS-e — a nota é emitida no RECEIVED). Não usar CONFIRMED.
- **✅ Pricing fechado** — ver [`PRICING.md`](PRICING.md). Modelo = espelhar a Sponte (plano único **R$ 150/mês** até 150 alunos + R$ 1/excedente + adicionais), Asaas como custo interno. **Não é 3 tiers** (Básico/Crescimento/Pro) — é 1 plano base + adicionais à la carte.

## 4b. Pendências que continuam abertas

- **NfseConfig vs campos em BillingConfig** — avaliar na implementação de `mvp-04` se vira model próprio ou campos.
- **Custo real do Asaas** (para calcular margem do gateway) — levantar tabela oficial; não bloqueia o preço de venda (fixo = Sponte). Ver `PRICING.md` §2.
- **Quem paga a negativação (R$ 29,90)** — configurável via `negativacaoFeePayer` (`mvp-05`).

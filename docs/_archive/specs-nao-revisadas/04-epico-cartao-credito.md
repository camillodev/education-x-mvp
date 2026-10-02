# Épico 04 — Pagamento via Cartão de Crédito

> **Prioridade:** P3 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Depende de:** Épico 01
> **Status:** 🟡 Aguardando aprovação
> **Entrega:** o responsável pode pagar a mensalidade no cartão de crédito — avulso ou
> assinatura recorrente — sem que o Education X toque nos dados do cartão. Inclui gestão de
> cartões salvos (adicionar/trocar/segundo cartão), repasse configurável da taxa ao
> responsável, e os fluxos de reembolso (estorno) e chargeback.
>
> ⚠️ **Fora do MVP** — release pós-MVP, repriorizado conforme vendas.

---

## Por que este épico vem por último

Boleto e PIX cobrem a maioria dos pagamentos no Brasil e não têm taxa por transação tão
relevante. Cartão é conveniência adicional (e recorrência automática), mas adiciona
complexidade (PCI, chargeback). Entra depois que o núcleo está sólido.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 4.1 — Cobrança avulsa no cartão

> **User story**
> Como **Orientadora**, quero gerar uma cobrança no cartão para um responsável,
> para que ele pague online sem boleto.

**Critérios de aceite**
- [ ] Ao emitir, escolho "Cartão de crédito" como forma de pagamento.
- [ ] O responsável recebe um link seguro da Asaas para digitar o cartão (nós nunca vemos os dados — sem PCI para nós).
- [ ] Quando ele paga, a cobrança vira "Paga" automaticamente (mesmo fluxo de webhook do épico 01).

---

### Feature 4.2 — Assinatura recorrente

> **User story**
> Como **Orientadora**, quero cadastrar uma assinatura mensal no cartão de um responsável,
> para que a mensalidade seja cobrada automaticamente todo mês sem reemissão.

**Critérios de aceite**
- [ ] Crio uma assinatura mensal vinculada ao responsável.
- [ ] A Asaas cobra o cartão automaticamente todo mês na data de vencimento.
- [ ] Vejo o status da assinatura (ativa, vencida, cancelada).
- [ ] Posso cancelar a assinatura — para de cobrar a partir do mês seguinte.
- [ ] Cobrança recusada pelo cartão → o responsável é avisado e pode atualizar o cartão.

---

### Feature 4.3 — Repasse da taxa de cartão ao Responsável (configurável por escola)

> **User story**
> Como **Orientadora**, quero poder repassar a taxa do cartão ao responsável que escolher
> pagar no cartão, para que a escola não absorva o custo extra dessa forma de pagamento.

**Critérios de aceite**
- [ ] Cada escola configura: **a escola absorve a taxa** OU **repassa ao responsável**.
- [ ] Quando "repassar" está ligado e o responsável escolhe cartão, o valor da cobrança é
      acrescido da taxa de cartão (a mensalidade líquida da escola permanece a mesma).
- [ ] O responsável vê claramente o acréscimo ("Mensalidade R$ 450 + taxa cartão R$ X = R$ Y").
- [ ] Boleto e PIX **nunca** têm esse acréscimo — só cartão.
- [ ] A configuração é por escola (uma pode absorver, outra pode repassar).

---

### Feature 4.4 — Reembolso (estorno) de pagamento

> **User story**
> Como **Orientadora**, quero estornar um pagamento de cartão (total ou parcial),
> para devolver dinheiro ao responsável em caso de cancelamento ou cobrança indevida.

**Critérios de aceite**
- [ ] Posso estornar uma cobrança paga no cartão — total ou valor parcial.
- [ ] O estorno debita o valor da conta da escola na Asaas e cancela na fatura do responsável.
- [ ] A cobrança muda para "Estornada" (ou "Estornada parcialmente").
- [ ] O responsável é avisado do estorno; o prazo de até 10 dias úteis para aparecer na fatura é informado.
- [ ] Se já houve nota fiscal emitida, gera-se o cancelamento/nota de estorno correspondente.
- [ ] Todo estorno fica auditado (quem fez, valor, motivo).

---

### Feature 4.5 — Chargeback (contestação pelo banco do responsável)

> **User story**
> Como **Orientadora**, quero apenas **saber** quando um pagamento foi contestado —
> o sistema resolve o resto sozinho, tratando o responsável como inadimplente.

**Comportamento decidido:** a Orientadora **não gerencia** a disputa. O sistema:
1. Notifica a Orientadora ("O pagamento de Maria Silva foi contestado").
2. Reverte o pagamento (cobrança volta para "não paga"/inadimplente).
3. O responsável volta ao **fluxo normal de cobrança e negativação** (Épicos 02 e 03) —
   como qualquer inadimplente. Nada de tela de disputa, nada de ação manual.

**Critérios de aceite**
- [ ] Quando a Asaas notifica um chargeback, a Orientadora recebe um **aviso simples** (sem precisar agir).
- [ ] A cobrança contestada deixa de constar como paga → o responsável fica **inadimplente** automaticamente.
- [ ] O responsável entra na régua de cobrança/atraso normal (Épico 02) e, se persistir, negativação (Épico 03).
- [ ] O histórico do chargeback fica registrado na cobrança (para auditoria), mas não exige ação da escola.
- [ ] **Não** há tela de gestão de disputa — o sistema trata como inadimplência comum.

---

### Feature 4.6 — Gestão de cartões salvos do Responsável

> **User story**
> Como **Responsável**, quero cadastrar, trocar ou adicionar um segundo cartão,
> para gerenciar como minhas mensalidades são cobradas sem redigitar o cartão toda vez.

**Critérios de aceite**
- [ ] Posso salvar um cartão (tokenizado pela Asaas — nunca guardamos o número no nosso sistema).
- [ ] Vejo meus cartões salvos pelos últimos 4 dígitos + bandeira (ex: "Visa final 8829").
- [ ] Posso **adicionar um segundo cartão**.
- [ ] Posso **trocar** o cartão padrão (qual será usado nas próximas cobranças/assinatura).
- [ ] Posso **remover** um cartão salvo.
- [ ] As cobranças recorrentes usam o cartão padrão; se ele falhar, aviso para atualizar.

> **Nota:** esta feature usa a tokenização da Asaas — o número do cartão nunca passa pelo
> nosso banco. Guardamos apenas o token + últimos 4 dígitos + bandeira.

---

## Parte 2 — Subsection técnica

### 2.1 — Cobrança avulsa (redirect, sem PCI)

`POST /v3/lean/payments` `{ customer, billingType: "CREDIT_CARD", value, dueDate }`
→ retorna `invoiceUrl`. Enviamos o link ao responsável; ele digita o cartão na Asaas.
**Não** capturamos dados do cartão no nosso sistema → fora do escopo PCI.

### 2.2 — Assinatura recorrente

`POST /v3/subscriptions` `{ customer, billingType: "CREDIT_CARD", value, cycle: "MONTHLY", nextDueDate, description }`.
A Asaas gera as cobranças mensais. Cancelar: `DELETE /v3/subscriptions/{id}`.

### 2.3 — Repasse de taxa (Feature 4.3)

A taxa de cartão da escola vem de `GET /myAccount/fees` (`creditCard.operationValue` +
`creditCard.oneInstallmentPercentage`). Quando `BillingConfig.creditCardSurchargeToCustomer = true`
e o pagamento é cartão:
```
valorCobrado = valorLiquidoEscola + taxaCartão
```
A taxa é estimada a partir das fees da subconta. **Atenção:** confirmar na implementação se
o cálculo bate exatamente com o que a Asaas debita (pode haver diferença de centavos) — se
sim, considerar margem de tolerância. Boleto/PIX nunca recebem acréscimo.

### 2.4 — Reembolso / Estorno (Feature 4.4)

`POST /v3/payments/{id}/refund` — total (sem body) ou parcial (`{ value }`):
- Só funciona em cobrança `RECEIVED` ou `CONFIRMED`.
- PIX permite múltiplos estornos parciais (soma ≤ total). Cartão: estorno na fatura, até 10 dias úteis.
- Resposta: cobrança com `status: REFUNDED`.
- Se houve NFS-e, acionar cancelamento da nota.

### 2.5 — Chargeback (Feature 4.5)

Tratado via **webhook**. Fluxo Asaas documentado:
```
PAYMENT_CONFIRMED/RECEIVED → CHARGEBACK_REQUESTED → PAYMENT_REFUNDED (se disputa não aberta)
```
Eventos a tratar no `/api/webhooks/asaas`:
- `PAYMENT_CHARGEBACK_REQUESTED` → Invoice "Em contestação", alerta Orientadora.
- `PAYMENT_CHARGEBACK_DISPUTE` / `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` → status da disputa.
- `PAYMENT_REFUNDED` → Invoice "Estornada".

### 2.6 — Gestão de cartões salvos (Feature 4.6)

Tokenização: `POST /v3/creditCard/tokenizeCreditCard` `{ customer, creditCard, creditCardHolderInfo, remoteIp }`
→ retorna `{ creditCardToken, creditCardNumber (últimos 4), creditCardBrand }`.

- Guardamos **apenas** token + últimos 4 dígitos + bandeira (nunca o número completo — PCI-safe).
- Cobrar com cartão salvo: `creditCardToken` no `createPayment`/`subscription` (sem redigitar).
- Múltiplos cartões por responsável; um marcado como padrão.

### 2.7 — Schema

```prisma
model Invoice {
  billingType         String  @default("BOLETO") // BOLETO | CREDIT_CARD | PIX
  asaasSubscriptionId String?
  surchargeAmount     Int?    // taxa repassada ao responsável, em centavos (se aplicável)
  refundedAmount      Int?    // valor estornado, em centavos
  chargebackStatus    String? // REQUESTED | DISPUTE | REVERSED | LOST | null
}

model SavedCard {           // cartões tokenizados do responsável
  id              String  @id @default(cuid())
  guardianId      String
  asaasToken      String  // creditCardToken (não é o número!)
  lastFourDigits  String
  brand           String
  isDefault       Boolean @default(false)
  createdAt       DateTime @default(now())
  @@index([guardianId])
}

model BillingConfig {
  creditCardEnabled            Boolean @default(false)
  creditCardSurchargeToCustomer Boolean @default(false) // true = repassa taxa ao responsável
  creditCardMaxInstallments    Int     @default(1)      // parcelamento máximo (1 = à vista)
}
```

### 2.7 — Testes (≥80%)

- Avulso: retorna invoiceUrl, webhook PAID→PAID.
- Recorrente: cria com asaasSubscriptionId, cancela remove no Asaas.
- billingType persistido corretamente.
- Repasse: surcharge calculado só no cartão, não em boleto/PIX; off quando config=false.
- Reembolso: total e parcial → REFUNDED; bloqueado se não pago; aciona cancelamento de NFS-e.
- Chargeback: webhook CHARGEBACK_REQUESTED → responsável vira inadimplente + avisa Orientadora.
- Cartões: tokeniza e guarda só token+4dígitos+bandeira; troca de padrão; remoção; nunca guarda número.

---

## ✏️ Decisões para você editar

### Q1 — Parcelamento no cartão?
A Asaas permite parcelar (`installmentCount`). Mensalidade de escola geralmente é à vista,
mas matrícula/material pode parcelar.
- [ ] Só à vista (1x)
- [ ] Permitir parcelamento (definir máx de parcelas: ___)
- **Sua resposta:** _______________

### Q2 — Quem paga a taxa do cartão (~2,99% + R$ 0,49)?
✅ **Decidido:** o **responsável** absorve a taxa de cartão se a escola preferir — e isso é
**configurável por unidade** (`BillingConfig.creditCardSurchargeToCustomer`). Uma escola
pode repassar, outra pode absorver. Feature 4.3 + 2.3 (cálculo via `GET /myAccount/fees`).

### Q3 — Recorrência: cartão ou também boleto recorrente?
A Asaas faz assinatura recorrente em boleto/PIX também, não só cartão.
- [ ] Só cartão tem recorrência
- [ ] Oferecer recorrência em boleto/PIX também (cobra automático todo mês)
- **Sua resposta:** _______________

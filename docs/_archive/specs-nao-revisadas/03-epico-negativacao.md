# Épico 03 — Negativação do Responsável (SPC/Serasa)

> **Prioridade:** P1 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Depende de:** Épicos 01 e 02
> **Status:** 🟡 Aguardando aprovação · ⭐ **No MVP** (decisão do Rafa)
> **Entrega:** responsáveis inadimplentes de longa data são negativados no SPC/Serasa —
> com aviso prévio obrigatório por lei — e regularizados automaticamente ao pagar.

---

## Por que este épico

Lembretes (épico 02) não resolvem o devedor crônico. A negativação é a pressão final
para regularização. Mas é uma ação legalmente sensível: a lei (CDC art. 43) **exige
aviso prévio por escrito**. Este épico trata o aviso como obrigatório, não opcional.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 3.1 — Configurar a política de negativação

> **User story**
> Como **Orientadora**, quero definir quando um responsável é negativado (dias de atraso,
> valor mínimo, dias de aviso prévio), para controlar a régua da minha escola.

**Critérios de aceite**
- [ ] Ligo/desligo a negativação automática por escola.
- [ ] Configuro: dias de atraso para negativar, valor mínimo, dias de aviso prévio.
- [ ] Limites de sanidade: dias de atraso ≥ 15, aviso prévio ≥ 5 dias, valor mínimo ≥ R$ 50.

---

### Feature 3.2 — Aviso prévio obrigatório (CDC art. 43)

> **User story**
> Como **Responsável**, quero ser avisado por escrito antes de ser negativado,
> para ter chance de regularizar (e para a escola cumprir a lei).

**Critérios de aceite**
- [ ] Antes de qualquer negativação, o responsável recebe um aviso (email + WhatsApp + SMS) com prazo para pagar.
- [ ] O aviso é registrado com data/hora (prova legal).
- [ ] A negativação **nunca** acontece sem aviso prévio registrado — o sistema bloqueia se o aviso falhou.
- [ ] Como CPF, email e telefone são **obrigatórios** para todo responsável (Épico 01, Feature 1.2),
      sempre há CPF para negativar e canal para avisar — não existe "responsável sem dados".
- [ ] Se a tentativa de envio do aviso falhar tecnicamente (ex: WhatsApp recusado), a negativação
      é adiada e a Orientadora é alertada — o registro de aviso bem-sucedido é a trava.

---

### Feature 3.3 — Negativação e regularização automáticas

> **User story**
> Como **Orientadora**, quero que a negativação e a baixa aconteçam sozinhas,
> para não gerenciar isso manualmente no SPC/Serasa.

**Critérios de aceite**
- [ ] Passado o prazo do aviso e ainda em atraso → o sistema negativa o responsável no SPC/Serasa.
- [ ] Se o responsável paga durante o prazo do aviso → não é negativado (vira "regularizado").
- [ ] Quando um responsável negativado paga → o sistema remove a negativação automaticamente.
- [ ] O responsável recebe confirmação da negativação e, depois, da regularização.
- [ ] Posso pausar/cancelar uma negativação manualmente, e marcar um responsável como "nunca negativar" (opt-out, com motivo).

---

### Feature 3.4 — Painel de negativações

> **User story**
> Como **Orientadora**, quero ver o status das negativações da minha escola,
> para acompanhar quem está em aviso, negativado ou regularizado.

**Critérios de aceite**
- [ ] Vejo um painel com contadores: em aviso, negativados, regularizados, total exposto (R$).
- [ ] Filtro a lista de cobranças por status de negativação.
- [ ] No detalhe do responsável, vejo a linha do tempo das negativações dele.

---

## Parte 2 — Subsection técnica

### 2.1 — API Asaas

- Negativar: `POST /v3/paymentDunnings` `{ payment: "{asaasPaymentId}", type: "CREDIT_BUREAU", description }`.
- Remover: `DELETE /v3/paymentDunnings/{id}`.
- Consultar: `GET /v3/paymentDunnings/{id}`.
- **Requer** `asaasPaymentId` (existe desde o épico 01) — só negativa cobrança já emitida.
- Permissão `PAYMENT_DUNNING:WRITE` precisa ser habilitada com o gerente Asaas.

### 2.2 — Workflow (cron diário)

```
GET /api/cron/negativacao-check (08:00 BRT)
  para cada unidade com asaasEnabled:
    1. Novos elegíveis (OVERDUE ≥ diasAtraso, valor ≥ mínimo, sem opt-out, sem negativação ativa)
       → cria Negativacao(AGUARDANDO_AVISO) → envia aviso → status AVISADO
    2. AVISADO há ≥ diasAviso:
       → ainda OVERDUE? → POST /paymentDunnings → NEGATIVADO
       → já PAID? → REGULARIZADO (sem negativar)
```
Regularização também via webhook `PAYMENT_RECEIVED` → `DELETE /paymentDunnings` → REGULARIZADO.

### 2.3 — Schema Prisma

```prisma
enum NegativacaoStatus { AGUARDANDO_AVISO AVISADO NEGATIVADO REGULARIZADO CANCELADO ERRO }

model AsaasNegativacao {
  id             String @id @default(cuid())
  invoiceId      String @unique
  guardianId     String
  unitId         String
  status         NegativacaoStatus @default(AGUARDANDO_AVISO)
  avisadoAt      DateTime?
  negativadoAt   DateTime?
  regularizadoAt DateTime?
  asaasDunningId String?
  configSnapshot Json
}

model Guardian {
  asaasOptOut       Boolean @default(false)
  asaasOptOutReason String?
}

model BillingConfig {
  asaasNegativacaoEnabled  Boolean @default(false)
  asaasDaysOverdueToNegate Int     @default(30)
  asaasMinAmountToNegate   Int     @default(10000) // centavos
  asaasNoticeDaysBefore    Int     @default(7)
}
```

### 2.4 — Garantia legal (crítico)

`AsaasNegativacao.avisadoAt` deve estar preenchido antes de chamar `POST /paymentDunnings`.
O cron aborta a negativação se `avisadoAt = null`. Test obrigatório cobrindo isso.

### 2.4b — Pré-requisitos de dados (resolvidos no Épico 01)

A negativação SPC/Serasa **exige CPF** do responsável. Como CPF, email e telefone são
obrigatórios desde o Épico 01 (Feature 1.2), este épico **não** precisa tratar o caso de
dados faltando — todo responsável elegível já tem CPF válido e canais de aviso.
Isso simplifica o fluxo: sem branches de "dado ausente", sem negativação bloqueada por
cadastro incompleto.

### 2.5 — Testes (≥80%)

- Elegibilidade: opt-out→skip, valor<mínimo→skip, atraso<dias→skip.
- Cron: AVISADO+prazo+OVERDUE→negativa; AVISADO+PAID→regulariza sem negativar.
- Garantia: avisadoAt=null → não negativa.
- Webhook PAID → remove negativação + REGULARIZADO.
- Painel: contadores corretos.

### 2.6 — Reaproveitamento

Existe spec antiga detalhada em `specs/cobranca/14-feature-asaas-spc-negativacao.md`
(escrita para Kumon single-tenant). ~90% reaproveitável — generalizar para multi-escola
usando a API key da subconta.

---

## ✏️ Decisões para você editar

### Q1 — Negativação precisa de liberação manual da Asaas
A Asaas exige habilitar a permissão `PAYMENT_DUNNING:WRITE` falando com o gerente da conta,
e pode cobrar taxa por negativação. Você já tem isso liberado ou é passo do onboarding?
- **Sua resposta:** _______________

### Q2 — Padrão da régua de negativação
- **Dias de atraso para negativar:** _______________ (recomendado ≥30)
- **Valor mínimo para negativar:** _______________ (recomendado ≥ R$ 100)
- **Dias de aviso prévio (legal):** _______________ (mínimo seguro: 7)

### Q3 — Quem decide negativar: automático ou Orientadora aprova?
- [ ] Automático (cron negativa sozinho após aviso + prazo)
- [ ] Semi-automático (cron prepara, Orientadora aprova na tela antes de negativar)
- **Sua resposta:** _______________

### Q4 — Múltiplos boletos do mesmo responsável
Responsável com 4 boletos vencidos: negativa cada um ou consolida em 1 negativação?
- [ ] 1 por boleto (rastreio granular)
- [ ] 1 consolidada (menos taxas de negativação)
- **Sua resposta:** _______________

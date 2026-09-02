# Spec — Cobrança Automática (Boleto/PIX)

> **Status:** fechada (PRD-aligned, Claude + Rafa, 2026-07-09)
> **Fonte prioritária:** prd-education-hub-mvp.md (second brain) — este doc implementa M2 core (sem Depósito via Cartão, que é pós-MVP).
> **Fonte de verdade:** `src/lib/integration/asaas/types.ts` (contratos reais Asaas) + `prisma/schema.prisma` + doc oficial Asaas (POST /payments, POST /subscriptions, webhooks) + protótipo (`screens-c.jsx?v=9`, `screens-c2.jsx`, `screens-c3.jsx`).
> **DS:** Alfabeto.

---

## 1. Objetivo

Gerar cobranças mensais automaticamente para cada Enrollment ativo, reconciliar o pagamento via webhook Asaas e expor o status em tempo real na tela de cobranças da escola.

**DoD (Rafa):** no dia 1 de cada mês às 08:00, toda Enrollment com status `ACTIVE` e Guardian com `asaasCustomerId` recebe uma Invoice gerada, um boleto com PIX embutido é emitido no Asaas e o Guardian recebe a cobrança por WhatsApp e e-mail. Quando o pagamento chega, o webhook Asaas atualiza o Invoice para `PAID` de forma idempotente.

---

## 2. Dados necessários (o coração)

A pergunta-guia: quais dados são necessários para gerar e reconciliar uma cobrança?

### 2a. Piso Asaas: POST /payments (cobrança avulsa mensal)

Fonte: `AsaasCreatePaymentPayload` em `types.ts` + doc Asaas.

| Campo Asaas | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer` | string | Sim | ID do customer Asaas (Guardian.asaasCustomerId) |
| `billingType` | enum | Sim | `BOLETO` — boleto ja traz PIX embutido |
| `value` | number (reais) | Sim | Valor em reais (converter de centavos no cliente boundary) |
| `dueDate` | string YYYY-MM-DD | Sim | Vencimento calculado de BillingConfig.dueDay |
| `externalReference` | string | Recomendado | Invoice.id — chave de idempotencia na reconciliacao |
| `description` | string | Opcional | Ex: "Matematica — Junho/2026" |
| `fine.value` | number | Opcional | Multa: 2 (= 2%). Vem de BillingConfig.lateFeePercent bp/100 |
| `interest.value` | number | Opcional | Juros a.m.: 1 (= 1%). Vem de BillingConfig.monthlyInterestBp bp/100 |
| `discount.value` | number | Opcional | Desconto negociado (da Enrollment) |
| `discount.dueDateLimitDays` | number | Se discount | Dias antes do vencimento para desconto valer |
| `discount.type` | enum | Se discount | `PERCENTAGE` ou `FIXED` |

**Nota sobre BOLETO com PIX:** o Asaas emite boleto bancario que ja embute linha PIX QR Code no mesmo documento. Nao ha campo separado — e o mesmo `billingType: "BOLETO"`.

### 2b. POST /subscriptions (alternativa recorrente)

Para matrículas com plano definido, o Asaas suporta assinatura recorrente que dispensa o cron.

| Campo Asaas | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer` | string | Sim | Guardian.asaasCustomerId |
| `billingType` | enum | Sim | `BOLETO` |
| `value` | number (reais) | Sim | Mensalidade em reais |
| `cycle` | enum | Sim | `MONTHLY` |
| `nextDueDate` | string YYYY-MM-DD | Sim | Proximo vencimento |
| `externalReference` | string | Recomendado | Enrollment.id — vincula subscription a matricula |
| `description` | string | Opcional | Nome da materia + periodo |
| `fine.value` | number | Opcional | 2 (%) |
| `interest.value` | number | Opcional | 1 (%) |
| `discount.value` | number | Opcional | Desconto se houver |
| `endDate` | string YYYY-MM-DD | Opcional | Fim do contrato (para planos anuais com data de termino) |
| `maxPayments` | integer | Opcional | Alternativa ao endDate — numero maximo de cobranças |

**Decisao de arquitetura (ver secao 10):** usar cobrança avulsa (POST /payments) via cron, nao subscription. Motivo: controle total de logs, idempotencia, e possibilidade de pausar/renegociar por Enrollment sem depender do ciclo da subscription Asaas.

### 2c. Webhook de reconciliacao

O Asaas envia eventos para o endpoint de webhook da subconta. Campos relevantes:

| Campo | Tipo | Descricao |
|---|---|---|
| `event` | string | `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE` etc |
| `payment.id` | string | ID do payment no Asaas |
| `payment.status` | enum | `RECEIVED`, `CONFIRMED`, `OVERDUE`, `PENDING` |
| `payment.value` | number (reais) | Valor pago |
| `payment.paymentDate` | string | Data de creditamento |
| `payment.clientPaymentDate` | string | Data em que o cliente pagou |
| `payment.externalReference` | string | Invoice.id (nosso) |

### 2d. Negocio

| Dado | Origem no sistema | Para que serve |
|---|---|---|
| `BillingConfig.dueDay` | Unit da escola | Calcular `dueDate` de cada cobrança |
| `BillingConfig.closingDay` | Unit da escola | Definir limite de fechamento do mes (nao cobrar após o fechamento do mes corrente) |
| `BillingConfig.firstChargeMode` | Unit da escola | Define regra da 1ª competência: `PROPORTIONAL` (padrão) ou `FREE_FIRST_MONTH` |
| `BillingConfig.lateFeePercent` | Unit | Multa em basis points (200 = 2%) → dividir por 100 pro Asaas |
| `BillingConfig.monthlyInterestBp` | Unit | Juros em basis points (100 = 1%) → dividir por 100 pro Asaas |
| `BillingConfig.autoBilling` | Unit | Flag: false = escola emite manualmente |
| `Guardian.asaasCustomerId` | Cadastrado no onboarding do Guardian | customer do payload |
| `Enrollment.subjectId` | Matricula na materia | Para description e Invoice.description |
| `Enrollment.planType` | Mensal/Trimestral/Semestral/Anual | Define qual priceCents usar |
| `Enrollment.discountType` | Negociacao individual (fluxo 02 — matricula) | `PERCENT \| FIXED \| null`; reusa `DiscountType` do fluxo 02 |
| `Enrollment.discountValueBp` | Negociacao individual (fluxo 02) | Desconto em basis points, so se `discountType = PERCENT` |
| `Enrollment.discountValueCents` | Negociacao individual (fluxo 02) | Desconto em centavos, so se `discountType = FIXED` |
| `Enrollment.finalPriceCents` | Calculado no fluxo 02 (Fatia 1, R5) | Valor mensal ja com desconto aplicado — cobranca usa este campo direto, nao recalcula |
| `Subject.priceCents` | Materia cadastrada | Valor base da mensalidade em centavos |
| `Invoice.id` | Novo model | externalReference — chave de idempotencia |

### 2e. Primeira cobrança (1ª competência por Enrollment)

A Invoice gerada no momento da ativação de um Enrollment (aprovação da matrícula) segue a regra configurada em `BillingConfig.firstChargeMode`:

**PROPORTIONAL (padrão):**
- Valor = `finalPriceCents × (diasRestantes / diasDoCiclo)`, onde:
  - `finalPriceCents` = campo já calculado na Enrollment pelo fluxo 02 (preço acordado com desconto aplicado — ver P-05 resolvida na seção 10).
  - `diasRestantes` = dias entre `Enrollment.startedAt` e o `closingDay` do mês corrente (inclusive).
  - `diasDoCiclo` = total de dias do mês de competência.
- O vencimento (`dueDate`) respeita o `dueDay` padrão da Unit; se já passou no mês corrente, usa o `dueDay` do mês seguinte.
- A configuração `firstChargeMode` só pode ser alterada até 5 dias antes do `closingDay` do mês em curso.

**FREE_FIRST_MONTH:**
- A Invoice da 1ª competência não é emitida (nenhum boleto gerado para o mês de início).
- A cobrança começa a partir do 2º mês, com mensalidade cheia no `dueDay`.

**Cobranças subsequentes (2ª competência em diante):**
- Sempre mensalidade cheia (`Enrollment.finalPriceCents`, já com desconto do fluxo 02 aplicado).
- Vencimento no `dueDay` de cada mês.

### 2g. Fiscal

| Dado | Origem | Descricao |
|---|---|---|
| `Subject.nfseServiceCode` | Cadastrado no onboarding | Codigo de servico da NFS-e por materia |
| `BillingConfig.municipalRegistration` | Cadastrado no onboarding | Inscricao municipal da escola |
| Emissor NFS-e | Asaas (apos RECEIVED) | Asaas emite NFS-e automaticamente se configurado na subconta |

**Nota:** NFS-e e emitida pelo Asaas via POST /invoices após o pagamento confirmado. Fora do escopo desta spec (fluxo 05).

### 2h. Compliance / LGPD

| Campo | Classificacao | Tratamento |
|---|---|---|
| Guardian.cpfEnc | PII — Sensivel | AES-256-GCM no banco; nunca exposto na Invoice |
| Guardian.emailEnc | PII | AES-256-GCM; descriptografar so na hora do envio |
| Guardian.phoneEnc | PII | AES-256-GCM; so para WhatsApp |
| Invoice (novo) | Dado financeiro | unitId obrigatorio; sem PII direto |
| Payment (novo) | Dado financeiro | referencia ao Invoice; sem PII |

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio | Prisma (existe?/falta?) | Campo Asaas | No design | Resolucao |
|---|---|---|---|---|---|---|
| Guardian.asaasCustomerId | Guardian (cadastrado no fluxo de matricula) | Sim | Existe (`asaasCustomerId String?`) | `customer` | Nao exibido | Ja existe; se nulo, cobrança nao pode ser gerada — Invoice fica em `BLOCKED`, escola e notificada |
| BillingConfig.dueDay | BillingConfig | Sim | Existe (`dueDay Int`) | Calculado para `dueDate` | Exibido em C6 como "dia de vencimento" | Converter: `dueDay` do mes de referencia → `YYYY-MM-DD` |
| BillingConfig.lateFeePercent | BillingConfig | Sim | Existe (`lateFeePercent Int` bp) | `fine.value` (%) | Exibido no contrato | Dividir por 100: `lateFeePercent / 100` |
| BillingConfig.monthlyInterestBp | BillingConfig | Sim | Existe (`monthlyInterestBp Int` bp) | `interest.value` (%) | Exibido no contrato | Dividir por 100: `monthlyInterestBp / 100` |
| Subject.priceCents | Subject | Sim | Existe (`priceCents Int`) | `value` (reais) | Exibido em C3 como valor da cobrança | Dividir por 100 no boundary Asaas |
| Enrollment.plan (planType) | Enrollment — definido no fluxo 02 (`EnrollmentPlan`) | Sim | Definido em mvp-02-matricula.md | Influencia `value` indiretamente via `finalPriceCents` | Exibido em C1/C3 como "Plano Mensal/Anual" | Campo do fluxo 02; nao redefinido aqui (ver sec 4) |
| Enrollment.discountType/discountValueBp/discountValueCents/finalPriceCents | Enrollment — definido no fluxo 02 (matricula) | Nao (opcional) | Definido na spec mvp-02-matricula.md, Fatia 1 | `discount.value`, `discount.type` | Exibido em resumo de cobrança (C6) e na tela de matricula (screens-c2) | Reusa model Enrollment do fluxo 02 — nao redefinir aqui. `finalPriceCents` e o valor usado direto na Invoice |
| Invoice.id (externalReference) | Invoice (NOVO model) | Recomendado | Nao existe | `externalReference` | Nao exibido diretamente | Criar Invoice antes do POST /payments; usar Invoice.id |
| Invoice.asaasPaymentId | Invoice (NOVO) | Pos-criacao | Nao existe | Retornado pela API | Exibido como "#cob_xxx" em C3/C4 | Salvar o `id` retornado pela API no Invoice |
| authToken webhook | env var `ASAAS_WEBHOOK_TOKEN` (RN-12 superseded — global, não `BillingConfig.asaasWebhookTokenEnc`) | Sim (seguranca) | N/A (env var, não coluna) | Header `asaas-access-token` | Nao exibido | Validar via `crypto.timingSafeEqual` antes de resolver Unit |
| BillingConfig.autoBilling | BillingConfig | Sim | Existe (`autoBilling Boolean`) | Controla execucao do cron | Nao exibido | Se `false`, cron pula a unidade (emissao manual) |
| BillingConfig.firstChargeMode | BillingConfig | Sim | Nao existe (NOVO enum + campo) | n/a (logica de negocio) | Nao exibido (config interna) | Novo campo: `PROPORTIONAL` (padrao) ou `FREE_FIRST_MONTH`; afeta calculo da 1a Invoice por Enrollment |
| Enrollment.isFirstChargeDone | Enrollment | Sim | Nao existe (NOVO campo Boolean) | n/a (controle interno) | Nao exibido | Flag; garante que a logica de 1a competencia so roda uma vez por Enrollment |
| Description da cobrança | Subject.name + periodo | Nao (boas praticas) | n/a | `description` | Exibido em C4 como "Matematica — Junho/2026" | Montar no servico: `${subject.name} — ${mesAno}` |
| Enrollment.id | Enrollment (definido no fluxo 02) | Referencia interna | Definido em mvp-02-matricula.md | n/a (interno) | Nao exibido | Necessario para vincular Invoice a Enrollment |

---

## 4. Deltas de schema

**P-03 resolvida:** `Enrollment` (e `Student`) NAO sao redefinidos aqui. O model `Enrollment` e UNICO e compartilhado entre fluxos — sua definicao canonica esta na spec `mvp-02-matricula.md` (secao 4, Fatia 1), que ja inclui `planType` (la chamado `plan: EnrollmentPlan`), `discountType`/`discountValueBp`/`discountValueCents`/`finalPriceCents`, `status: EnrollmentStatus`, `studentId`, `guardianId`, `subjectId`. Esta spec (fluxo 03) apenas ADICIONA a relacao `invoices Invoice[]` no model `Enrollment` ja existente e um campo de controle de 1a competencia (`isFirstChargeDone`), listados abaixo. Nenhuma migration desta spec deve recriar `Enrollment` — deve alterar o model criado pela Fatia 1 do fluxo 02 (ou, se a ordem de implementacao inverter, o fluxo 02 assume os campos abaixo como parte do seu proprio schema inicial).

Precisam ser criados nesta spec: `Invoice`, `Payment`.

```prisma
// ─── Billing Domain ──────────────────────────────────────────────────────────

enum InvoiceStatus {
  PENDING       // cobrança gerada, aguardando pagamento
  PAID          // PAYMENT_RECEIVED recebido e processado
  OVERDUE       // vencida (PAYMENT_OVERDUE do webhook)
  CANCELLED     // cancelada manualmente ou pela escola
  BLOCKED       // nao pode ser gerada (Guardian sem asaasCustomerId)
  ERROR         // falha na criacao no Asaas
}

// Campos adicionados ao model Enrollment (canonico em mvp-02-matricula.md):
//   isFirstChargeDone Boolean   @default(false)  // true apos a 1ª Invoice ser gerada
//   invoices          Invoice[]                  // relacao inversa

model Invoice {
  id           String        @id @default(cuid())
  unitId       String
  enrollmentId String

  // Valores em centavos (regra do produto)
  amountCents   Int           // Enrollment.finalPriceCents no momento da emissao (snapshot; ja inclui desconto do fluxo 02).
                               // Na 1a competencia com firstChargeMode = PROPORTIONAL, e o valor proporcional calculado (RN-14)
  netAmountCents Int          // = amountCents (mantido por compatibilidade com o fluxo de pagamento; sem desconto adicional nesta camada)

  referenceMonth String       // "2026-06" — mes de competencia
  dueDate        DateTime     // vencimento calculado

  status         InvoiceStatus @default(PENDING)

  // Vinculo Asaas (preenchido apos POST /payments)
  asaasPaymentId String?      // "pay_xxxxx" retornado pela API
  asaasPaymentUrl String?     // invoiceUrl do Asaas (link do boleto)
  asaasBankSlipUrl String?    // bankSlipUrl (PDF do boleto)
  asaasBarCode   String?      // codigo de barras

  // Campos de controle
  emittedAt     DateTime?     // quando POST /payments foi feito com sucesso
  paidAt        DateTime?     // preenchido pelo webhook PAYMENT_RECEIVED
  paidAmountCents Int?        // valor efetivamente pago (pode diferir por juros)

  // Idempotencia: se o cron rodar duas vezes no mesmo mes, nao duplicar
  // Constraint: (enrollmentId, referenceMonth) deve ser unico
  idempotencyKey String       @unique  // enrollmentId + ":" + referenceMonth

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit       Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  enrollment Enrollment @relation(fields: [enrollmentId], references: [id])
  payments   Payment[]

  @@index([unitId])
  @@index([enrollmentId])
  @@index([asaasPaymentId])
  @@index([referenceMonth])
  @@map("invoices")
}

model Payment {
  id        String @id @default(cuid())
  unitId    String
  invoiceId String

  // Dados do evento webhook Asaas
  asaasPaymentId    String               // mesmo que Invoice.asaasPaymentId
  asaasEvent        String               // PAYMENT_RECEIVED | PAYMENT_OVERDUE etc
  asaasStatus       String               // status retornado pelo Asaas
  amountCents       Int                  // valor em centavos (convertido de reais)
  paidAt            DateTime             // payment.paymentDate do webhook
  clientPaidAt      DateTime?            // payment.clientPaymentDate

  // Idempotencia: nao processar o mesmo evento duas vezes
  webhookEventId    String               @unique  // hash do payload ou id unico do evento

  createdAt DateTime @default(now())

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([invoiceId])
  @@index([asaasPaymentId])
  @@map("payments")
}
```

**Campo a adicionar em BillingConfig (model existente):**

```prisma
enum FirstChargeMode {
  PROPORTIONAL     // cobra proporcional aos dias restantes do ciclo (padrao)
  FREE_FIRST_MONTH // nao emite Invoice na 1a competencia; cobra cheia a partir do 2o mes
}

// Em BillingConfig: adicionar
firstChargeMode FirstChargeMode @default(PROPORTIONAL)
```

**Relacoes a adicionar em models existentes (fluxo 03):**

```prisma
// Em Unit: adicionar
invoices Invoice[]
payments Payment[]
```

`Guardian.enrollments` e `Subject.enrollments` ja sao responsabilidade da migration do fluxo 02 (mvp-02-matricula.md) — nao duplicar aqui.

---

## 5. Contratos Asaas

### 5a. POST /payments (criacao de cobrança mensal)

Endpoint: `POST https://sandbox.asaas.com/api/v3/payments`
Header: `access_token: <subconta-apiKey>`

```json
{
  "customer": "cus_abc123",
  "billingType": "BOLETO",
  "value": 450.00,
  "dueDate": "2026-07-10",
  "externalReference": "inv_cjld2cyuq000h5xb6s3ek5qh",
  "description": "Matematica — Julho/2026",
  "fine": { "value": 2 },
  "interest": { "value": 1 }
}
```

**Conversao de borda:**
- `value`: `Invoice.netAmountCents / 100` (ex: 45000 centavos -> 450.00 reais)
- `fine.value`: `BillingConfig.lateFeePercent / 100` (ex: 200 bp -> 2%)
- `interest.value`: `BillingConfig.monthlyInterestBp / 100` (ex: 100 bp -> 1%)
- `dueDate`: calcular o proximo `dueDay` a partir da data de emissao

**Resposta de sucesso (200):**
```json
{
  "id": "pay_xxx",
  "status": "PENDING",
  "value": 450.00,
  "netValue": 449.10,
  "billingType": "BOLETO",
  "dueDate": "2026-07-10",
  "invoiceUrl": "https://sandbox.asaas.com/i/...",
  "bankSlipUrl": "https://sandbox.asaas.com/b/...",
  "barCode": "34191.79001...",
  "externalReference": "inv_cjld2cyuq000h5xb6s3ek5qh"
}
```

Salvar: `Invoice.asaasPaymentId = response.id`, `Invoice.asaasBankSlipUrl`, `Invoice.asaasBarCode`, `Invoice.emittedAt = now()`.

### 5b. Webhook PAYMENT_RECEIVED (reconciliacao)

Endpoint nosso: `POST /api/webhook`
Validacao: header `asaas-access-token` comparado com env var global `ASAAS_WEBHOOK_TOKEN`
(RN-12 superseded — não é mais por-Unit).

```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_xxx",
    "status": "RECEIVED",
    "value": 450.00,
    "paymentDate": "2026-07-08",
    "clientPaymentDate": "2026-07-08",
    "externalReference": "inv_cjld2cyuq000h5xb6s3ek5qh",
    "billingType": "BOLETO"
  }
}
```

**Fluxo de reconciliacao:**
1. Extrair `payment.externalReference` (Invoice.id) ou `payment.id` (asaasPaymentId).
2. Buscar Invoice por `externalReference` ou `asaasPaymentId`.
3. Se Invoice nao encontrada: logar e retornar `200` (idempotencia — nao retornar 4xx para o Asaas nao reenviar).
4. Se Invoice ja em `PAID`: retornar `200` sem reprocessar (idempotencia).
5. Criar `Payment` com `webhookEventId` unico.
6. Atualizar `Invoice.status = PAID`, `Invoice.paidAt`, `Invoice.paidAmountCents`.
7. Retornar `200 { "received": true }`.

**CONFIRMED vs RECEIVED:** usar `PAYMENT_RECEIVED` como gatilho para `PAID` (nao `PAYMENT_CONFIRMED`). RECEIVED = credito efetivo na conta Asaas. CONFIRMED = apenas confirmacao bancaria preliminar. Para boleto/PIX, RECEIVED e o evento definitivo.

### 5b'. Contrato do roteador de webhook (COMPARTILHADO entre fluxos)

`POST /api/webhook` é um endpoint ÚNICO compartilhado por múltiplos fluxos — não é exclusivo desta spec. **Esta spec (fluxo 03) implementa o roteador base + os handlers `PAYMENT_RECEIVED` e `PAYMENT_OVERDUE`.** Outros fluxos estendem o mesmo roteador com novos `case`:

- `mvp-045-regua-negativacao.md` adiciona cases de dunning (`DUNNING_REQUESTED`, `PAYMENT_DELETED` de negativação, baixa automática ao `RECEIVED`/`CONFIRMED` em Invoice com `Dunning.status = NEGATIVATED`) — ver seção correspondente daquela spec.
- `f2-02-portal-responsavel.md` pode estender com eventos relativos a pagamento via portal (mesmo roteador, novos cases conforme necessidade).

**Contrato do roteador (obrigatório para qualquer fluxo que estenda):**
1. **Validação (RN-12 SUPERSEDED — ver nota abaixo):** validar o header `asaas-access-token`
   contra a env var global `ASAAS_WEBHOOK_TOKEN` via `crypto.timingSafeEqual`, **antes** de
   qualquer lookup de Unit — a autenticação precisa ser possível sem primeiro resolver o
   `unitId` a partir do payload. A Unit é resolvida depois, dentro do handler, a partir da
   Invoice encontrada por `payment.id`/`externalReference`.
2. **Roteamento por `event`:** um `switch`/dispatch central em `src/lib/services/webhook.service.ts` (`processPaymentEvent(payload)`) despacha para o handler do case correspondente. Novo fluxo = novo `case`, nunca um endpoint novo.
3. **Retorno 200 para eventos desconhecidos:** qualquer `event` sem handler registrado retorna `200 { "received": true, "handled": false }` — nunca `4xx`/`5xx`, para o Asaas não reenviar infinitamente (decisão 8, seção 10).
4. **Idempotência por `webhookEventId`:** todo handler que grava efeito colateral (Payment, Dunning, etc.) usa um `webhookEventId` único (hash do payload ou id do evento) para não reprocessar o mesmo evento duas vezes — cada fluxo que estende o roteador é responsável pela idempotência do seu próprio case.

### 5c. Cron de emissao (lote mensal)

Execucao: dia 1 de cada mes, 08:00 BRT. Implementar como endpoint protegido chamado pelo cron.

```
POST /api/cron/billing
Header: Authorization: Bearer <CRON_SECRET>
```

Logica:
1. Buscar todas Units com `BillingConfig.autoBilling = true` e `status = ACTIVE`.
2. Para cada Unit, buscar Enrollments com `status = ACTIVE`.
3. Para cada Enrollment, chamar `BillingService.emitInvoice(enrollmentId, refMonth)` (ver 5d).
4. Salvar resultado (sucesso ou erro) no Invoice.
5. Em caso de erro Asaas: Invoice fica em `ERROR`, retentar automaticamente nas rodadas D+1/D+2 do cron diário da régua + botão "Reemitir" manual (mecanismo de retry — decisão 13, seção 10).

### 5d. Geração manual e em lote (P0 do PRD — módulo Financeiro F2.1)

**Motivação (PRD):** "Geração manual (por aluno) e em lote (todos os ativos de uma turma)" é requisito P0 do módulo 2 do PRD (`prd-education-hub-mvp.md`, linha ~108). O cron (5c) cobre a régua mensal automática; esta seção cobre os dois pontos de emissão sob demanda pela secretaria.

**Núcleo compartilhado — `BillingService.emitInvoice(enrollmentId, referenceMonth)`:**
Todas as três vias de emissão (cron mensal, botão avulso, lote) chamam o MESMO método de serviço, evitando três implementações divergentes de idempotência/cálculo de valor:

```ts
// src/lib/services/billing.service.ts
async function emitInvoice(enrollmentId: string, referenceMonth: string): Promise<Invoice> {
  const idempotencyKey = `${enrollmentId}:${referenceMonth}`;
  const existing = await db.invoice.findUnique({ where: { idempotencyKey } });
  if (existing) return existing; // idempotência: emissão manual do mesmo mês não duplica (RN-03/RN-17)

  const enrollment = await db.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  if (!enrollment.guardian.asaasCustomerId) {
    return db.invoice.create({ data: { ...base, status: 'BLOCKED', idempotencyKey } }); // RN-02/RN-19
  }

  const amountCents = computeAmountCents(enrollment, referenceMonth); // RN-08/RN-09/RN-14/RN-15
  // ... POST /payments no Asaas, salvar Invoice PENDING/ERROR
}
```

`emitMonthlyInvoices` (cron, 5c) vira um laço que chama `emitInvoice` por Enrollment ativa. `POST /api/enrollments/{id}/invoices` (avulsa) e `POST /api/billing/batch` (lote) chamam o mesmo método — ver Fatia 2b.

**(a) Emissão avulsa — 1 Enrollment:**
- Endpoint: `POST /api/enrollments/{enrollmentId}/invoices` — body opcional `{ referenceMonth }` (default: mês corrente).
- UI: botão "Emitir cobrança" na tela C4 (detalhe da Enrollment/aluno) ou linha da lista C1.
- Chama `BillingService.emitInvoice(enrollmentId, referenceMonth)` diretamente.

**(b) Emissão em lote — por matéria/grupo:**
- Endpoint: `POST /api/billing/batch` — body `{ subjectId, referenceMonth? }` (ou `{ unitId, referenceMonth? }` para "todas as matérias").
- UI: botão "Emitir cobrança em lote" na tela de matéria/turma, ou seletor de matéria na tela C3.
- Lógica: busca `Enrollment` com `status = ACTIVE` e `subjectId` informado na Unit da sessão; chama `emitInvoice` para cada uma; agrega resultado (emitidas / puladas / BLOCKED / ERROR) e retorna resumo para a UI.

**Nota de idempotência (RN-17):** se o cron já rodou no mês corrente e a secretaria aciona emissão manual/lote para a mesma Enrollment, `idempotencyKey` já existe → `emitInvoice` retorna a Invoice existente sem duplicar nem re-chamar o Asaas.

---

## 6. Regras de negocio (EARS)

**RN-01:** WHEN `autoBilling = true` AND data e dia 1 do mes as 08:00 THEN o sistema SHALL emitir uma Invoice para cada Enrollment ativo da Unit.

**RN-02:** WHEN Guardian nao tem `asaasCustomerId` THEN o sistema SHALL criar Invoice com status `BLOCKED` e notificar a escola via e-mail, sem chamar o Asaas.

**RN-03:** WHEN ja existe Invoice com `idempotencyKey = enrollmentId:refMonth` THEN o sistema SHALL ignorar a emissao (idempotencia do cron).

**RN-04:** WHEN o Asaas retorna erro na criacao do payment THEN o sistema SHALL marcar Invoice como `ERROR` e registrar o motivo.

**RN-05:** WHEN webhook chega com `event = PAYMENT_RECEIVED` THEN o sistema SHALL buscar Invoice por `externalReference`, criar Payment e mudar Invoice para `PAID`.

**RN-06:** WHEN Invoice ja esta em `PAID` e webhook chega novamente THEN o sistema SHALL retornar `200` sem reprocessar.

**RN-07:** IF `BillingConfig.autoBilling = false` THEN o sistema SHALL pular a Unit no cron; emissao e manual via tela.

**RN-08:** WHEN emitir Invoice para cobranças subsequentes (2ª competência em diante) THEN o sistema SHALL usar `Enrollment.finalPriceCents` (já calculado com desconto pelo fluxo 02, seja `discountType = PERCENT` ou `FIXED`) como `amountCents`, sem recalcular desconto nesta camada.

**RN-09:** WHEN emitir qualquer Invoice (1a competencia ou subsequente) THEN o sistema SHALL usar exclusivamente `Enrollment.finalPriceCents` como base de valor — este campo ja e o snapshot do plano (`Enrollment.plan`/`agreedPriceCents`, calculado no fluxo 02 a partir do `Subject.priceCents` no momento da matricula) com desconto aplicado. O fluxo de cobranca NUNCA relê `Subject.priceCents` diretamente nem mantém campos de preço por periodicidade — mudanças de preço no Subject não afetam Enrollments já criadas.

**RN-10:** WHEN `Invoice.dueDate` e no passado ao tentar emitir THEN o sistema SHALL calcular o proximo `dueDay` do mes seguinte e criar Invoice com esta data.

**RN-11:** WHEN webhook chega com `event = PAYMENT_OVERDUE` THEN o sistema SHALL mudar Invoice para `OVERDUE`.

**RN-12 (SUPERSEDED):** ~~WHEN header `asaas-access-token` do webhook nao bate com
`BillingConfig.asaasWebhookTokenEnc` da Unit THEN o sistema SHALL retornar `401` e nao
processar.~~ Decisão revisada: o token é **global**, via env var `ASAAS_WEBHOOK_TOKEN`
(`crypto.timingSafeEqual`), não por-Unit — validado antes de qualquer resolução de `unitId`,
já que o insert inicial de `WebhookEvent` acontece antes de a Invoice/Unit ser conhecida.
Header errado ainda retorna `401` sem processar; o campo `BillingConfig.asaasWebhookTokenEnc`
fica sem uso neste fluxo.

**RN-13:** WHEN escola cancela uma Enrollment THEN o sistema SHALL mudar `Enrollment.status = CANCELLED`. Invoices ja emitidas com `PENDING` devem ser canceladas no Asaas (DELETE /payments/{id}) e marcadas `CANCELLED`.

**RN-14 (1ª competência — proporcional):** WHEN `Enrollment.isFirstChargeDone = false` AND `BillingConfig.firstChargeMode = PROPORTIONAL` THEN o sistema SHALL calcular `amountCents = Enrollment.finalPriceCents × (diasRestantes / diasDoCiclo)` onde `diasRestantes` = dias entre `Enrollment.startedAt` e `closingDay` do mes corrente (inclusive), e `diasDoCiclo` = total de dias do mes. Após emitir a Invoice, marcar `Enrollment.isFirstChargeDone = true`.

**RN-15 (1ª competência — isenção):** IF `BillingConfig.firstChargeMode = FREE_FIRST_MONTH` AND `Enrollment.isFirstChargeDone = false` THEN o sistema SHALL NOT emitir Invoice para a 1ª competência; marcar `Enrollment.isFirstChargeDone = true` sem gerar cobrança. A 1ª Invoice gerada sera referente ao 2º mes, com mensalidade cheia.

**RN-16 (configuração de firstChargeMode):** WHEN escola tenta alterar `BillingConfig.firstChargeMode` AND faltam 5 dias ou menos para o `closingDay` do mes corrente THEN o sistema SHALL rejeitar a alteracao com erro de validacao informando que a janela de configuracao encerrou.

**RN-17 (emissão manual avulsa — 1 Enrollment):** WHEN secretaria clica em "Emitir cobrança" para uma Enrollment especifica (tela C4 ou C1) THEN o sistema SHALL chamar `BillingService.emitInvoice(enrollmentId, referenceMonth)` — o MESMO metodo usado pelo cron — com `referenceMonth` = mes corrente por padrao. A idempotencia por `idempotencyKey = enrollmentId:referenceMonth` (RN-03) SHALL impedir duplicacao mesmo se o cron ja tiver emitido a Invoice do mes ou se a secretaria clicar duas vezes.

**RN-18 (emissão em lote — por materia/grupo):** WHEN secretaria seleciona uma materia (ou grupo de turma) e aciona "Emitir cobrança em lote" THEN o sistema SHALL buscar todas as Enrollments com `status = ACTIVE` vinculadas aquele `subjectId` na Unit e chamar `BillingService.emitInvoice(enrollmentId, referenceMonth)` para cada uma, sequencialmente ou em paralelo controlado, reutilizando a mesma idempotencia por Enrollment (RN-03/RN-17). O resultado agregado (N emitidas, N puladas por idempotencia, N BLOCKED, N ERROR) SHALL ser exibido ao final.

**RN-19 (emissão manual/lote respeita BLOCKED):** WHEN emissao manual ou em lote encontra Enrollment cujo Guardian nao tem `asaasCustomerId` THEN o sistema SHALL aplicar a mesma regra RN-02 (Invoice `BLOCKED`, sem chamar Asaas) — nao ha bypass para emissao manual.

---

## 7. Estados e transicoes

### Invoice

```
[criacao pelo cron]
      |
      v
   PENDING --------(Asaas retorna erro)--------> ERROR
      |                                              |
      |                                        [retry D2, D3]
      |                                              |
      |<--------------------------------------------+
      |
      +---(webhook PAYMENT_OVERDUE)-----------> OVERDUE
      |
      +---(webhook PAYMENT_RECEIVED)----------> PAID [terminal]
      |
      +---(escola cancela)-------------------> CANCELLED [terminal]

BLOCKED = Guardian sem asaasCustomerId [nao entra no fluxo Asaas]
```

### Payment

Imutavel. Um evento webhook = um Payment. Invoice pode ter multiplos Payments (ex: reenvio de evento pelo Asaas), mas apenas o primeiro com `webhookEventId` unico e inserido.

---

## 8. Fluxo de coleta (UX, referencia ao design)

O fluxo de cobrança e em maioria automatico, mas a secretaria tem controle manual em pontos-chave (emissão avulsa/lote — seção 5d). A escola interage em quatro pontos:

**Tela C1 / detalhe de Enrollment:**
- Botão "Emitir cobrança" — emissão avulsa para a Enrollment (RN-17, seção 5d-a).
- Seletor de matéria/turma + botão "Emitir cobrança em lote" — emissão em lote (RN-18, seção 5d-b).

**Tela C3 — Lista de cobranças** (`screens-c.jsx?v=9`, linha 409-471):
- Filtros: Todas / A vencer / Pagas / Vencidas (aba "Cobranças").
- Tabela: Responsavel, Aluno, Valor, Vencimento, Status, Forma.
- Colunas Status: badge colorido conforme InvoiceStatus, incluindo `BLOCKED` (amarelo, "Aguardando cadastro do responsável") e `ERROR` (vermelho, "Falha na emissão") — decisão 9.
- Botao "Nova cobrança extra" (C5) — cobrança avulsa fora do ciclo mensal (fora do escopo desta spec).

**Tela C4 — Detalhe da cobrança** (`screens-c2.jsx`, linha 19-183):
- Valor atualizado (com multa se OVERDUE).
- Boleto PDF, linha digitavel, PIX copia-e-cola + QR Code.
- Historico da cobrança: emitida, enviada, paga / vencida / a vencer.
- Acoes: reenviar, cancelar, e — se `status = ERROR` — botão "Reemitir" (decisão 13).

**Tela C0 — Dashboard** (`screens-c.jsx?v=9`, linha 193-258):
- Card "Proximo vencimentos" (5 items): Nome responsavel, aluno, data vencimento, valor.
- Metricas: Recebido no mes, A vencer, Vencido, Alunos ativos.

**Design manda na UX; regras de negocio prevalecem sobre visual.** O protótipo original nao exibia `InvoiceStatus.BLOCKED` nem `ERROR` — badges/copy definidos na decisão 9 (seção 10).

---

## 9. Definition of Done (binario)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration rodou sem erro
pnpm prisma migrate dev --name add-invoice-payment

# 3. Schema tem os novos models (Invoice, Payment; Enrollment ja migrado pelo fluxo 02)
pnpm prisma db pull && grep -E "model Invoice|model Payment" prisma/schema.prisma | wc -l | grep -q "^2$"

# 4. Cron de emissao: simular mes com 2 enrollments, verificar 2 invoices criadas
pnpm dlx playwright test billing-cron --reporter=line

# 5. Webhook idempotente: enviar o mesmo evento PAYMENT_RECEIVED duas vezes, verificar que apenas 1 Payment foi criado e Invoice esta PAID
pnpm dlx playwright test billing-webhook --reporter=line

# 6. Cobrança com Guardian sem asaasCustomerId: Invoice deve ficar BLOCKED
pnpm dlx playwright test billing-blocked --reporter=line

# 7. Emissão manual avulsa: POST /api/enrollments/{id}/invoices emite 1 Invoice; 2ª chamada no mesmo mês não duplica (idempotência RN-17)
pnpm dlx playwright test billing-manual-single --reporter=line

# 8. Emissão em lote: POST /api/billing/batch com subjectId de N enrollments ativas gera N invoices (menos as já existentes/BLOCKED); resposta agrega contagem
pnpm dlx playwright test billing-manual-batch --reporter=line

# 9. Isolamento de tenant: criar Invoice na Unit A; autenticar sessão Clerk da Unit B; GET /api/invoices (ou tela C3/C4) NÃO retorna/renderiza a Invoice da Unit A (404 ou lista vazia)
pnpm dlx playwright test billing-tenant-isolation --reporter=line
```

Fluxo toca dinheiro: DoD obrigatoriamente inclui Playwright E2E (itens 4-9), nao apenas typecheck.

---

## 10. Decisoes fechadas

1. **Cobrança avulsa (POST /payments) via cron, nao subscription Asaas.** Motivo: controle fino por Enrollment, possibilidade de pausar/renegociar sem depender do ciclo da subscription, logs proprios de idempotencia.

2. **PAYMENT_RECEIVED (nao PAYMENT_CONFIRMED) dispara Invoice.PAID.** RECEIVED = credito efetivo na subconta Asaas. CONFIRMED e uma etapa bancaria preliminar e pode ser revertida.

3. **`billingType: "BOLETO"` para todos.** Boleto Asaas ja embute PIX QR Code. Nao e necessario emitir PIX separado.

4. **Idempotencia dupla:** `Invoice.idempotencyKey` (cron/manual/lote nao duplicam — RN-03/RN-17) + `Payment.webhookEventId` (webhook nao duplica).

5. **`externalReference` no Asaas = Invoice.id.** E a chave de vinculo para reconciliacao. Sempre presente na criacao do payment.

6. **Centavos no app, reais na borda Asaas.** Conversao feita exclusivamente no cliente Asaas (`/100` ao enviar, `*100` ao receber).

7. **unitId em todos os models novos.** Multi-tenant: toda query filtrada por unitId da sessao Clerk, exceto webhook (validado por authToken por Unit — ver 5b').

8. **Webhook autenticado por `asaasWebhookTokenEnc`.** Token da subconta, criptografado no banco. Endpoint retorna `200` para eventos desconhecidos (nao `4xx`) para evitar reenvios infinitos do Asaas. Roteador COMPARTILHADO com fluxos 05 (negativação) e f2-02 (portal responsável) — contrato completo na seção 5b'.

9. **(ex-P-01) Estados BLOCKED/ERROR na UI:** `BLOCKED` = badge amarelo "Aguardando cadastro do responsável"; `ERROR` = badge vermelho "Falha na emissão" com CTA "Reemitir" (tela C4 — botão detalhado na decisão 13).

10. **(ex-P-02) Cron = Vercel Cron.** Configurado via `vercel.json`, schedule `"0 11 1 * *"` (UTC) = dia 1 do mês às 08:00 BRT. Rota `GET/POST /api/cron/billing` protegida por `Authorization: Bearer <CRON_SECRET>` (env var, nunca hardcoded).

11. **(ex-P-03) Model Student e Enrollment são únicos e compartilhados**, definidos na spec `mvp-02-matricula.md` (Fatia 1). Esta spec não redefine esses models — apenas estende `Enrollment` com `isFirstChargeDone` e a relação `invoices` (seção 4).

12. **(ex-P-05) Desconto reusa `DiscountType` do fluxo 02.** `Enrollment.discountType` (`PERCENT | FIXED | null`), `discountValueBp`, `discountValueCents` e `finalPriceCents` — todos definidos em `mvp-02-matricula.md`. O `discountCents` simples proposto originalmente nesta spec foi descartado; toda referência a valor de cobrança usa `Enrollment.finalPriceCents` diretamente (RN-08/RN-09/RN-14).

13. **(ex-P-06) Retry de Invoice ERROR:** automático nas próximas rodadas do cron diário da régua (D+1, D+2 — reaproveitando a mesma passagem que já roda para a régua de cobrança do fluxo 05) + botão "Reemitir" manual na tela C4 (chama `BillingService.emitInvoice` novamente para a mesma Invoice/Enrollment; se `idempotencyKey` já existe e está em `ERROR`, permite nova tentativa de POST /payments — não é bloqueado pela idempotência, que só previne duplicação de Invoice bem-sucedida).

14. **(ex-P-07) Notificação de emissão = Asaas built-in da subconta.** O Asaas envia notificação (WhatsApp/e-mail) automaticamente ao gerar o payment, configurada na subconta. Verificar habilitação em sandbox durante a implementação; se desabilitada, ativar via API de notificações do Asaas (`POST /notifications` ou configuração no painel da subconta) antes do lançamento.

15. **NEGATIVATED não pertence a este fluxo.** A transição `OVERDUE → negativação` (incluindo o estado `NEGATIVATED`/`Dunning`) é de responsabilidade exclusiva da spec `mvp-045-regua-negativacao.md`. Este fluxo (03) só entrega `PENDING/PAID/OVERDUE/CANCELLED/BLOCKED/ERROR`.

---

## 11. Pendências

Nenhuma pendência aberta — todas resolvidas na seção 10.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de ate 400 linhas. WIP = 1 por vez.

### Fatia 1 — Migration: Invoice + Payment (+ extensão de Enrollment)

**Objetivo:** criar os models `Invoice`/`Payment` no Prisma e aplicar a migration. `Student`/`Enrollment` já são responsabilidade da Fatia 1 do fluxo 02 (mvp-02-matricula.md) — se esta fatia rodar antes, apenas adiciona `isFirstChargeDone` + relação `invoices` ao `Enrollment` já criado; se rodar depois, coordenar ordem com o fluxo 02.

**Scope in:**
- `prisma/schema.prisma`: adicionar enum `InvoiceStatus`; models `Invoice`, `Payment`; campo `isFirstChargeDone` + relação `invoices` em `Enrollment`; relações `invoices`/`payments` em `Unit`; campo `firstChargeMode` em `BillingConfig`.
- `prisma/migrations/`: migration resultante.
- `pnpm prisma generate`.

**Nao inclui:** nenhum servico, rota ou UI.

**DoD:**
```bash
pnpm prisma migrate dev --name add-invoice-payment && pnpm typecheck
```

---

### Fatia 2 — Serviço de emissão: BillingService.emitInvoice (núcleo compartilhado)

**Objetivo:** implementar a lógica de criação de Invoice e chamada ao Asaas para 1 Enrollment — reusada por cron, emissão avulsa e lote (seção 5d).

**Scope in:**
- `src/lib/services/billing.service.ts` (novo): `emitInvoice(enrollmentId, referenceMonth)` — núcleo único.
- `emitMonthlyInvoices(unitId, refMonth)`: laço sobre Enrollments ativas chamando `emitInvoice`.
- Calcular `dueDate` a partir de `BillingConfig.dueDay`; calcular `amountCents` via `Enrollment.finalPriceCents` (RN-08/RN-09) com regra de 1ª competência (RN-14/RN-15).
- Converter centavos para reais na borda Asaas.
- Idempotencia por `idempotencyKey = enrollmentId:referenceMonth` (RN-03/RN-17).
- Salvar Invoice com `asaasPaymentId`, `emittedAt`, `asaasBankSlipUrl`, `asaasBarCode`.
- Tratar `asaasCustomerId` nulo: marcar `BLOCKED` (RN-02/RN-19).
- Testes unitarios com `AsaasMockClient`.

**Nao inclui:** cron, endpoints HTTP, webhook, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/billing.service.test.ts
```

---

### Fatia 2b — Endpoints de emissão manual e em lote

**Objetivo:** expor `emitInvoice` via API para a secretaria (P0 do PRD — geração manual e em lote).

**Scope in:**
- `src/app/api/enrollments/[id]/invoices/route.ts` (novo): `POST`, valida sessão Clerk + `unitId`, chama `BillingService.emitInvoice(enrollmentId, referenceMonth ?? mêsCorrente)` (RN-17).
- `src/app/api/billing/batch/route.ts` (novo): `POST` com `{ subjectId, referenceMonth? }`, busca Enrollments `ACTIVE` do `subjectId` na Unit da sessão, chama `emitInvoice` para cada uma, agrega resultado (RN-18/RN-19).
- Testes unitários/integração cobrindo idempotência cruzada com o cron (mesma Enrollment, mesmo mês, chamada manual após o cron não duplica).

**Nao inclui:** UI (botões) — ver Fatia 5/5b.

**DoD:**
```bash
pnpm dlx playwright test billing-manual-single --reporter=line
pnpm dlx playwright test billing-manual-batch --reporter=line
```

---

### Fatia 3 — Endpoint do cron + agendamento (Vercel Cron)

**Objetivo:** expor endpoint protegido para o cron e configurar o agendamento.

**Scope in:**
- `src/app/api/cron/billing/route.ts`: valida `Authorization: Bearer <CRON_SECRET>`, itera Units ativas, chama `BillingService.emitMonthlyInvoices`.
- `vercel.json`: configurar cron `{ "path": "/api/cron/billing", "schedule": "0 11 1 * *" }` (08:00 BRT = 11:00 UTC, dia 1 do mês — decisão 10, seção 10).
- Log de execucao por Unit (sucesso, erro, total emitido).
- Retry D+1/D+2 para Invoices em `ERROR` (decisão 13): reaproveita a mesma rota, filtrando Invoices `ERROR` do mês corrente além das novas emissões.

**Nao inclui:** UI de historico de emissao.

**DoD:**
```bash
pnpm dlx playwright test billing-cron --reporter=line
```

---

### Fatia 4 — Webhook de reconciliação (roteador compartilhado)

**Objetivo:** processar eventos Asaas e atualizar Invoice/Payment de forma idempotente, implementando o roteador base que os fluxos 05 e f2-02 vão estender (contrato completo na seção 5b').

**Scope in:**
- `src/app/api/webhook/route.ts` (novo): valida `asaas-access-token` contra env var global
  `ASAAS_WEBHOOK_TOKEN` (RN-12 superseded — não por-Unit).
- `src/lib/services/webhook.service.ts` (novo): `processPaymentEvent(payload)` — dispatch central por `event`; cases `PAYMENT_RECEIVED` e `PAYMENT_OVERDUE` implementados aqui; eventos desconhecidos retornam `200 { handled: false }`.
- Idempotencia por `Payment.webhookEventId`.

**Nao inclui:** NFS-e, dunning/negativação (cases adicionados por `mvp-045-regua-negativacao.md`).

**DoD:**
```bash
pnpm dlx playwright test billing-webhook --reporter=line
# cenario 1: PAYMENT_RECEIVED -> Invoice PAID
# cenario 2: mesmo evento duas vezes -> apenas 1 Payment
# cenario 3: authToken errado -> 401
# cenario 4: event desconhecido -> 200 handled:false (nao quebra fluxos futuros)
```

---

### Fatia 5 — UI: tela C3 (lista de cobranças) + isolamento de tenant

**Objetivo:** exibir Invoices reais em `/cobrancas`, com badges BLOCKED/ERROR e isolamento por Unit validado.

**Scope in:**
- `src/app/(app)/cobrancas/page.tsx`: buscar Invoices por `unitId` (da sessao Clerk).
- Filtros por status (Todas / A vencer / Pagas / Vencidas).
- Tabela conforme design C3: Responsavel, Aluno, Valor, Vencimento, Status, Forma.
- Badge por `InvoiceStatus`, incluindo `BLOCKED` (amarelo) e `ERROR` (vermelho) — decisão 9.
- Navegacao para C4 ao clicar.

**Nao inclui:** C4 detalhe, acoes de reenviar/cancelar, botões de emissão manual/lote (Fatia 5b).

**DoD:**
```bash
pnpm dlx playwright test cobrancas-list --reporter=line
pnpm dlx playwright test billing-tenant-isolation --reporter=line
# cenario: Invoice criada na Unit A não aparece na lista renderizada para sessão da Unit B
```

---

### Fatia 5b — UI: botões de emissão manual e em lote

**Objetivo:** expor os endpoints da Fatia 2b na interface da secretaria.

**Scope in:**
- Botão "Emitir cobrança" no detalhe/linha da Enrollment (C1/C4) → chama `POST /api/enrollments/{id}/invoices`.
- Seletor de matéria + botão "Emitir cobrança em lote" (C3 ou tela de turma) → chama `POST /api/billing/batch`, exibe resumo (N emitidas / N puladas / N BLOCKED / N ERROR).

**DoD:**
```bash
pnpm dlx playwright test cobrancas-emissao-manual --reporter=line
```

---

### Fatia 6 — UI: tela C4 (detalhe da cobrança)

**Objetivo:** exibir detalhe, boleto PDF, linha digitavel, PIX, historico e botão Reemitir.

**Scope in:**
- `src/app/(app)/cobrancas/[id]/page.tsx`: buscar Invoice por id + unitId (404/sem dados se Invoice pertence a outra Unit — reforça isolamento de tenant).
- Exibir valor (com multa se OVERDUE), boleto, linha digitavel, PIX copia-e-cola, QR Code.
- Historico de eventos baseado em `Invoice.status` e `Payment[]`.
- Acoes: reenviar cobrança (POST Asaas), cancelar cobrança (DELETE Asaas + Invoice CANCELLED), e — se `status = ERROR` — botão "Reemitir" (chama `emitInvoice` novamente, decisão 13).

**DoD:**
```bash
pnpm dlx playwright test cobranca-detail --reporter=line
```

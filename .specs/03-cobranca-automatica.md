# Spec — Cobrança Automática (Boleto/PIX)

> **Status:** rascunho (2026-06-19)
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
| `Enrollment.discountCents` | Negociacao individual | Desconto a subtrair do valor base |
| `Subject.priceCents` | Materia cadastrada | Valor base da mensalidade em centavos |
| `Invoice.id` | Novo model | externalReference — chave de idempotencia |

### 2e. Primeira cobrança (1ª competência por Enrollment)

A Invoice gerada no momento da ativação de um Enrollment (aprovação da matrícula) segue a regra configurada em `BillingConfig.firstChargeMode`:

**PROPORTIONAL (padrão):**
- Valor = `priceCents × (diasRestantes / diasDoCiclo)`, onde:
  - `diasRestantes` = dias entre `Enrollment.startedAt` e o `closingDay` do mês corrente (inclusive).
  - `diasDoCiclo` = total de dias do mês de competência.
- O vencimento (`dueDate`) respeita o `dueDay` padrão da Unit; se já passou no mês corrente, usa o `dueDay` do mês seguinte.
- A configuração `firstChargeMode` só pode ser alterada até 5 dias antes do `closingDay` do mês em curso.

**FREE_FIRST_MONTH:**
- A Invoice da 1ª competência não é emitida (nenhum boleto gerado para o mês de início).
- A cobrança começa a partir do 2º mês, com mensalidade cheia no `dueDay`.

**Cobranças subsequentes (2ª competência em diante):**
- Sempre mensalidade cheia (`priceCents - discountCents`).
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
| Enrollment.planType | Enrollment (NOVO) | Sim | Nao existe | Influencia `value` | Exibido em C1/C3 como "Plano Mensal/Anual" | Novo campo em Enrollment (ver sec 4) |
| Enrollment.discountCents | Enrollment (NOVO) | Nao | Nao existe | `discount.value` | Exibido em resumo de cobrança (C6) | Novo campo opcional em Enrollment |
| Invoice.id (externalReference) | Invoice (NOVO model) | Recomendado | Nao existe | `externalReference` | Nao exibido diretamente | Criar Invoice antes do POST /payments; usar Invoice.id |
| Invoice.asaasPaymentId | Invoice (NOVO) | Pos-criacao | Nao existe | Retornado pela API | Exibido como "#cob_xxx" em C3/C4 | Salvar o `id` retornado pela API no Invoice |
| authToken webhook | BillingConfig.asaasWebhookTokenEnc | Sim (seguranca) | Existe (`asaasWebhookTokenEnc String?`) | Header `asaas-access-token` | Nao exibido | Validar no middleware do endpoint webhook; descriptografar em runtime |
| BillingConfig.autoBilling | BillingConfig | Sim | Existe (`autoBilling Boolean`) | Controla execucao do cron | Nao exibido | Se `false`, cron pula a unidade (emissao manual) |
| BillingConfig.firstChargeMode | BillingConfig | Sim | Nao existe (NOVO enum + campo) | n/a (logica de negocio) | Nao exibido (config interna) | Novo campo: `PROPORTIONAL` (padrao) ou `FREE_FIRST_MONTH`; afeta calculo da 1a Invoice por Enrollment |
| Enrollment.isFirstChargeDone | Enrollment | Sim | Nao existe (NOVO campo Boolean) | n/a (controle interno) | Nao exibido | Flag; garante que a logica de 1a competencia so roda uma vez por Enrollment |
| Description da cobrança | Subject.name + periodo | Nao (boas praticas) | n/a | `description` | Exibido em C4 como "Matematica — Junho/2026" | Montar no servico: `${subject.name} — ${mesAno}` |
| Enrollment.id | Enrollment (NOVO) | Referencia interna | Nao existe | n/a (interno) | Nao exibido | Necessario para vincular Invoice a Enrollment |

---

## 4. Deltas de schema

Nenhum model de cobrança existe hoje. Precisam ser criados Invoice, Payment e Enrollment.

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

enum PlanType {
  MONTHLY
  QUARTERLY
  SEMIANNUAL
  ANNUAL
}

model Enrollment {
  id        String   @id @default(cuid())
  unitId    String
  guardianId String
  studentId  String  // referencia ao aluno (futuro model Student)
  subjectId  String

  planType        PlanType   @default(MONTHLY)
  discountCents   Int        @default(0)  // desconto negociado em centavos
  customDueDay    Int?       // override do dueDay da BillingConfig (opcional)
  isFirstChargeDone Boolean  @default(false)  // true apos a 1ª Invoice ser gerada (controla logica de proporcional vs FREE)
  status          String     @default("ACTIVE") // ACTIVE | PAUSED | CANCELLED

  startedAt   DateTime @default(now())
  cancelledAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id])
  subject  Subject  @relation(fields: [subjectId], references: [id])
  invoices Invoice[]

  @@index([unitId])
  @@index([guardianId])
  @@index([subjectId])
  @@map("enrollments")
}

model Invoice {
  id           String        @id @default(cuid())
  unitId       String
  enrollmentId String

  // Valores em centavos (regra do produto)
  amountCents   Int           // valor base da materia no mes
  discountCents Int           @default(0)
  netAmountCents Int          // amountCents - discountCents (calculado)

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

**Relacoes a adicionar em models existentes:**

```prisma
// Em Guardian: adicionar
enrollments Enrollment[]

// Em Subject: adicionar
enrollments Enrollment[]

// Em Unit: adicionar
enrollments Enrollment[]
invoices    Invoice[]
payments    Payment[]
```

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

Endpoint nosso: `POST /api/webhooks/asaas`
Validacao: header `asaas-access-token` comparado com `BillingConfig.asaasWebhookTokenEnc` descriptografado.

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

### 5c. Cron de emissao (lote mensal)

Execucao: dia 1 de cada mes, 08:00 BRT. Implementar como endpoint protegido chamado pelo cron.

```
POST /api/cron/billing
Header: Authorization: Bearer <CRON_SECRET>
```

Logica:
1. Buscar todas Units com `BillingConfig.autoBilling = true` e `status = ACTIVE`.
2. Para cada Unit, buscar Enrollments com `status = ACTIVE`.
3. Para cada Enrollment, verificar se ja existe Invoice com `idempotencyKey = enrollmentId + ":" + refMonth`.
4. Se nao existe, criar Invoice (status `PENDING`) e chamar POST /payments no Asaas.
5. Salvar resultado (sucesso ou erro) no Invoice.
6. Em caso de erro Asaas: Invoice fica em `ERROR`, retentar no dia 2 e dia 3.

---

## 6. Regras de negocio (EARS)

**RN-01:** WHEN `autoBilling = true` AND data e dia 1 do mes as 08:00 THEN o sistema SHALL emitir uma Invoice para cada Enrollment ativo da Unit.

**RN-02:** WHEN Guardian nao tem `asaasCustomerId` THEN o sistema SHALL criar Invoice com status `BLOCKED` e notificar a escola via e-mail, sem chamar o Asaas.

**RN-03:** WHEN ja existe Invoice com `idempotencyKey = enrollmentId:refMonth` THEN o sistema SHALL ignorar a emissao (idempotencia do cron).

**RN-04:** WHEN o Asaas retorna erro na criacao do payment THEN o sistema SHALL marcar Invoice como `ERROR` e registrar o motivo.

**RN-05:** WHEN webhook chega com `event = PAYMENT_RECEIVED` THEN o sistema SHALL buscar Invoice por `externalReference`, criar Payment e mudar Invoice para `PAID`.

**RN-06:** WHEN Invoice ja esta em `PAID` e webhook chega novamente THEN o sistema SHALL retornar `200` sem reprocessar.

**RN-07:** IF `BillingConfig.autoBilling = false` THEN o sistema SHALL pular a Unit no cron; emissao e manual via tela.

**RN-08:** WHEN Enrollment tem `discountCents > 0` THEN o sistema SHALL calcular `netAmountCents = priceCents - discountCents` e usar este valor no Asaas.

**RN-09:** WHEN `planType != MONTHLY` THEN o sistema SHALL usar o campo de preco correspondente do Subject (`quarterlyPriceCents`, `semiannualPriceCents`, `annualPriceCents`). Se o campo for nulo, usar `priceCents` e logar aviso.

**RN-10:** WHEN `Invoice.dueDate` e no passado ao tentar emitir THEN o sistema SHALL calcular o proximo `dueDay` do mes seguinte e criar Invoice com esta data.

**RN-11:** WHEN webhook chega com `event = PAYMENT_OVERDUE` THEN o sistema SHALL mudar Invoice para `OVERDUE`.

**RN-12:** WHEN header `asaas-access-token` do webhook nao bate com `BillingConfig.asaasWebhookTokenEnc` da Unit THEN o sistema SHALL retornar `401` e nao processar.

**RN-13:** WHEN escola cancela uma Enrollment THEN o sistema SHALL mudar `Enrollment.status = CANCELLED`. Invoices ja emitidas com `PENDING` devem ser canceladas no Asaas (DELETE /payments/{id}) e marcadas `CANCELLED`.

**RN-14 (1ª competência — proporcional):** WHEN `Enrollment.isFirstChargeDone = false` AND `BillingConfig.firstChargeMode = PROPORTIONAL` THEN o sistema SHALL calcular `amountCents = priceCents × (diasRestantes / diasDoCiclo)` onde `diasRestantes` = dias entre `Enrollment.startedAt` e `closingDay` do mes corrente (inclusive), e `diasDoCiclo` = total de dias do mes. Após emitir a Invoice, marcar `Enrollment.isFirstChargeDone = true`.

**RN-15 (1ª competência — isenção):** IF `BillingConfig.firstChargeMode = FREE_FIRST_MONTH` AND `Enrollment.isFirstChargeDone = false` THEN o sistema SHALL NOT emitir Invoice para a 1ª competência; marcar `Enrollment.isFirstChargeDone = true` sem gerar cobrança. A 1ª Invoice gerada sera referente ao 2º mes, com mensalidade cheia.

**RN-16 (configuração de firstChargeMode):** WHEN escola tenta alterar `BillingConfig.firstChargeMode` AND faltam 5 dias ou menos para o `closingDay` do mes corrente THEN o sistema SHALL rejeitar a alteracao com erro de validacao informando que a janela de configuracao encerrou.

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

O fluxo de cobrança e em maioria automatico. A escola interage em tres pontos:

**Tela C3 — Lista de cobranças** (`screens-c.jsx?v=9`, linha 409-471):
- Filtros: Todas / A vencer / Pagas / Vencidas (aba "Cobranças").
- Tabela: Responsavel, Aluno, Valor, Vencimento, Status, Forma.
- Colunas Status: badge colorido conforme InvoiceStatus.
- Botao "Nova cobrança extra" (C5) — cobrança avulsa fora do ciclo mensal (fora do escopo desta spec).

**Tela C4 — Detalhe da cobrança** (`screens-c2.jsx`, linha 19-183):
- Valor atualizado (com multa se OVERDUE).
- Boleto PDF, linha digitavel, PIX copia-e-cola + QR Code.
- Historico da cobrança: emitida, enviada, paga / vencida / a vencer.
- Acoes: reenviar, cancelar.

**Tela C0 — Dashboard** (`screens-c.jsx?v=9`, linha 193-258):
- Card "Proximo vencimentos" (5 items): Nome responsavel, aluno, data vencimento, valor.
- Metricas: Recebido no mes, A vencer, Vencido, Alunos ativos.

**Design manda na UX; regras de negocio prevalecem sobre visual.** O design nao exibe `InvoiceStatus.BLOCKED` nem `ERROR` — sao estados tecnicos a definir (ver pendencias).

---

## 9. Definition of Done (binario)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration rodou sem erro
pnpm prisma migrate dev --name add-enrollment-invoice-payment

# 3. Schema tem os 3 novos models
pnpm prisma db pull && grep -E "model Invoice|model Payment|model Enrollment" prisma/schema.prisma | wc -l | grep -q "^3$"

# 4. Cron de emissao: simular mes com 2 enrollments, verificar 2 invoices criadas
pnpm dlx playwright test billing-cron --reporter=line

# 5. Webhook idempotente: enviar o mesmo evento PAYMENT_RECEIVED duas vezes, verificar que apenas 1 Payment foi criado e Invoice esta PAID
pnpm dlx playwright test billing-webhook --reporter=line

# 6. Cobrança com Guardian sem asaasCustomerId: Invoice deve ficar BLOCKED
pnpm dlx playwright test billing-blocked --reporter=line
```

Fluxo toca dinheiro: DoD obrigatoriamente inclui Playwright E2E (itens 4-6), nao apenas typecheck.

---

## 10. Decisoes fechadas

1. **Cobrança avulsa (POST /payments) via cron, nao subscription Asaas.** Motivo: controle fino por Enrollment, possibilidade de pausar/renegociar sem depender do ciclo da subscription, logs proprios de idempotencia.

2. **PAYMENT_RECEIVED (nao PAYMENT_CONFIRMED) dispara Invoice.PAID.** RECEIVED = credito efetivo na subconta Asaas. CONFIRMED e uma etapa bancaria preliminar e pode ser revertida.

3. **`billingType: "BOLETO"` para todos.** Boleto Asaas ja embute PIX QR Code. Nao e necessario emitir PIX separado.

4. **Idempotencia dupla:** `Invoice.idempotencyKey` (cron nao duplica) + `Payment.webhookEventId` (webhook nao duplica).

5. **`externalReference` no Asaas = Invoice.id.** E a chave de vinculo para reconciliacao. Sempre presente na criacao do payment.

6. **Centavos no app, reais na borda Asaas.** Conversao feita exclusivamente no cliente Asaas (`/100` ao enviar, `*100` ao receber).

7. **unitId em todos os models novos.** Multi-tenant: toda query filtrada por unitId da sessao Clerk, exceto webhook (validado por authToken).

8. **Webhook autenticado por `asaasWebhookTokenEnc`.** Token da subconta, criptografado no banco. Endpoint retorna `200` para eventos desconhecidos (nao `4xx`) para evitar reenvios infinitos do Asaas.

---

## 11. Pendencias

**P-01 — Estado BLOCKED e ERROR no design:** o prototipo nao exibe estes estados. Definir badge/copy para C3 e C4 antes de implementar a tela. Recomendacao: BLOCKED como badge amarelo "Aguardando cadastro do responsavel", ERROR como badge vermelho "Falha na emissao".

**P-02 — Cron: infraestrutura de agendamento.** O projeto ainda nao tem cron configurado. Opcoes: (a) Vercel Cron Jobs (se usar plano Pro), (b) endpoint HTTP chamado por servico externo (GitHub Actions, n8n, launchd). Decidir antes da Fatia 3.

**P-03 — Model Student nao existe.** `Enrollment.studentId` referencia um aluno que nao tem model proprio no schema. Opcoes: (a) criar model `Student` simples (nome, nascimento) na mesma migration, (b) usar `Guardian` como aluno adulto com flag `isSelfPayer`. Decisao afeta Fatia 1.

**P-04 — Enrollment: quando e criada?** O fluxo de matricula (EDX-02) ainda nao tem spec fechada. Esta spec assume que `Enrollment` e criada quando a escola aprova a matricula (tela C2 — "Aprovar matricula"). Validar com spec do fluxo 02.

**P-05 — Desconto de negociacao por Enrollment.** O design C6 exibe campo "Desconto de negociacao" com tipo (% ou R$). O schema proposto tem `discountCents` (valor fixo em centavos). Se o desconto for percentual, precisa de campo `discountType` adicional. Definir antes de implementar Enrollment.

**P-06 — Retry de Invoice em ERROR.** A regra diz "retentar no dia 2 e dia 3". O mecanismo de retry nao esta definido (nova rodada do cron? endpoint manual?). Definir antes da Fatia 3.

**P-07 — Notificacao por WhatsApp/e-mail.** O design (C6 — "confirmado", botao WhatsApp) e o texto do prototipo mencionam envio automatico. O mecanismo de envio (Asaas notificacoes automaticas vs servico proprio) nao esta definido. Asaas tem notificacoes built-in configuradas na subconta — verificar se ja cobrem o caso.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de ate 400 linhas. WIP = 1 por vez.

### Fatia 1 — Migration: Enrollment + Invoice + Payment

**Objetivo:** criar os 3 models no Prisma e aplicar a migration.

**Scope in:**
- `prisma/schema.prisma`: adicionar enums `InvoiceStatus`, `PlanType`; models `Enrollment`, `Invoice`, `Payment`; relacoes em `Unit`, `Guardian`, `Subject`.
- `prisma/migrations/`: migration resultante.
- `pnpm prisma generate`.

**Nao inclui:** nenhum servico, rota ou UI.

**DoD:**
```bash
pnpm prisma migrate dev --name add-enrollment-invoice-payment && pnpm typecheck
```

**Pendencia a resolver antes:** P-03 (Student model?) + P-05 (discount tipo).

---

### Fatia 2 — Servico de emissao: BillingService.emitMonthlyInvoices

**Objetivo:** implementar a logica de criacao de Invoice e chamada ao Asaas.

**Scope in:**
- `src/lib/services/billing.service.ts` (novo): `emitMonthlyInvoices(unitId, refMonth)`.
- Calcular `dueDate` a partir de `BillingConfig.dueDay`.
- Converter centavos para reais na borda Asaas.
- Idempotencia por `idempotencyKey`.
- Salvar Invoice com `asaasPaymentId`, `emittedAt`, `asaasBankSlipUrl`, `asaasBarCode`.
- Tratar `asaasCustomerId` nulo: marcar `BLOCKED`.
- Testes unitarios com `AsaasMockClient`.

**Nao inclui:** cron, endpoint HTTP, webhook, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/billing.service.test.ts
```

---

### Fatia 3 — Endpoint do cron + agendamento

**Objetivo:** expor endpoint protegido para o cron e configurar o agendamento.

**Scope in:**
- `src/app/api/cron/billing/route.ts`: valida `Authorization: Bearer <CRON_SECRET>`, itera Units ativas, chama `BillingService.emitMonthlyInvoices`.
- `vercel.json` (ou alternativa): configurar cron `"0 11 1 * *"` (08:00 BRT = 11:00 UTC).
- Log de execucao por Unit (sucesso, erro, total emitido).

**Nao inclui:** UI de historico de emissao.

**Pendencia a resolver antes:** P-02 (infraestrutura de cron).

**DoD:**
```bash
pnpm dlx playwright test billing-cron --reporter=line
```

---

### Fatia 4 — Webhook de reconciliacao

**Objetivo:** processar eventos Asaas e atualizar Invoice/Payment de forma idempotente.

**Scope in:**
- `src/app/api/webhooks/asaas/route.ts` (novo ou refatorar se existir): validar authToken, processar `PAYMENT_RECEIVED` e `PAYMENT_OVERDUE`.
- `src/lib/services/webhook.service.ts` (novo): `processPaymentEvent(payload)`.
- Idempotencia por `Payment.webhookEventId`.
- Retornar `200` para eventos desconhecidos ou Invoice ja processada.

**Nao inclui:** NFS-e, dunning (negativacao).

**DoD:**
```bash
pnpm dlx playwright test billing-webhook --reporter=line
# cenario 1: PAYMENT_RECEIVED -> Invoice PAID
# cenario 2: mesmo evento duas vezes -> apenas 1 Payment
# cenario 3: authToken errado -> 401
```

---

### Fatia 5 — UI: tela C3 (lista de cobranças)

**Objetivo:** exibir Invoices reais em `/cobrancas`.

**Scope in:**
- `src/app/(app)/cobrancas/page.tsx`: buscar Invoices por `unitId` (da sessao Clerk).
- Filtros por status (Todas / A vencer / Pagas / Vencidas).
- Tabela conforme design C3: Responsavel, Aluno, Valor, Vencimento, Status, Forma.
- Badge por `InvoiceStatus`.
- Navegacao para C4 ao clicar.

**Nao inclui:** C4 detalhe, acoes de reenviar/cancelar.

**DoD:**
```bash
pnpm dlx playwright test cobrancas-list --reporter=line
```

---

### Fatia 6 — UI: tela C4 (detalhe da cobrança)

**Objetivo:** exibir detalhe, boleto PDF, linha digitavel, PIX e historico.

**Scope in:**
- `src/app/(app)/cobrancas/[id]/page.tsx`: buscar Invoice por id + unitId.
- Exibir valor (com multa se OVERDUE), boleto, linha digitavel, PIX copia-e-cola, QR Code.
- Historico de eventos baseado em `Invoice.status` e `Payment[]`.
- Acoes: reenviar cobrança (POST Asaas), cancelar cobrança (DELETE Asaas + Invoice CANCELLED).

**DoD:**
```bash
pnpm dlx playwright test cobranca-detail --reporter=line
```

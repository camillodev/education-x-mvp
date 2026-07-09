# Schema Consolidado — Education X MVP

> Delta Prisma único e definitivo, reconciliando `mvp-02-matricula.md`, `mvp-03-cobranca-automatica.md`,
> `mvp-05-negativacao.md`, `f2-01-painel-escola.md` e `f2-02-portal-responsavel.md` contra
> `prisma/schema.prisma` atual. Decisões fechadas em 2026-07-09 (não reabrir). Este documento **não**
> altera `prisma/schema.prisma` — é o plano a ser executado em migrations faseadas (seção 3).
>
> Bloco Prisma completo validado com `npx prisma validate` contra uma cópia mesclada do schema atual +
> este delta — 0 erros.

---

## 1. Sumário das reconciliações (conflito → resolução)

| # | Conflito entre specs | Resolução adotada | Fonte da decisão |
|---|---|---|---|
| 1 | `Enrollment` definido **duas vezes** — versão simplificada em mvp-03 (`discountCents` único, `status String`) vs. versão completa em mvp-02 (`discountType`+`discountValueBp`+`discountValueCents`+`finalPriceCents`, `status EnrollmentStatus` enum) | **Um único model `Enrollment`**, formato mvp-02 vence integralmente. `discountCents` do 03 morre. `status String` do 03 morre — usa enum. | Decisão 1 (usuário) |
| 2 | `Enrollment.asaasSubscriptionId` (mvp-02) — presume cobrança recorrente via Asaas Subscription | **Removido.** Modelo de cobrança é payments avulsos mês a mês (Invoice), não subscription Asaas. | Decisão 1 (usuário) |
| 3 | `Enrollment.isFirstChargeDone` só existe em mvp-03, como comentário de "campo a adicionar" — não estava no bloco canônico do 02 | Incorporado ao model único, `@default(false)`. | Decisão 1 (usuário) |
| 4 | `Enrollment.dunningPaused` não existe em nenhuma spec lida (nasce só na spec nova mvp-045, não fornecida) | Campo **novo**, incorporado por instrução explícita do usuário — pausa individual da régua de cobrança por matrícula. | Decisão 1 (usuário) |
| 5 | `GuardianType` en mvp-02 usa valores em português (`MAE`, `PAI`, `RESPONSAVEL_LEGAL`) | Traduzido para inglês (`FATHER`, `MOTHER`, `LEGAL_GUARDIAN`), consistente com a convenção do resto do schema (100% inglês). **Conflito adicional encontrado** — ver seção 6. | Decisão 6 (usuário) |
| 6 | `DunningStatus` em mvp-05 tem 4 estados (`EMAVISO`, `ELEGIVEL`, `NEGATIVADO`, `REGULARIZADO`) presumindo fluxo com decisão manual da escola em cada etapa | Reduzido a 2 estados (`NEGATIVATED`, `REGULARIZADO`→`REGULARIZED`) porque a régua passa a ser **automática** (`DunningConfig`/`DunningLog` cobrem os avisos intermediários via `DunningAction`, não via `DunningStatus`). `EMAVISO`/`ELEGIVEL` não fazem mais sentido como *status* — viram *log entries*. | Decisão 5 (usuário) |
| 7 | `Dunning.actorId` obrigatório (`String`) em mvp-05, presumindo acionamento sempre manual pela escola | Tornado **opcional** (`String?`) — `null` = negativação automática pela régua; preenchido = ação manual de um operador. | Decisão 5 (usuário) |
| 8 | `Dunning.optOut` (por dívida, mvp-05) vs. necessidade de opt-out permanente por responsável | **Duas coisas diferentes, mantidas separadas.** `Dunning.optOut` do 05 **morre** — opt-out não é por cobrança individual. Vira `Guardian.dunningOptOut` (por responsável, permanente). | Decisão 6 (usuário) + reconciliação adicional |
| 9 | `Dunning.invoiceId` em mvp-05 era comentário solto ("FK -> Invoice"), sem `@relation` real nem `@unique`, e `Invoice.dunning` no 05 não declarava a contraparte formalmente | Formalizado como relação 1:1 bidirecional: `Dunning.invoiceId @unique` + `@relation` completo + `Invoice.dunning Dunning?`. Sem isso o Prisma trata como 1:N e a relação singular do lado Invoice quebra. | Reconciliação técnica (advisor) |
| 10 | `CardToken.guardian` e `PortalSession.guardian` declaravam `onDelete: Cascade` em f2-02 | **Removido** o cascade da relação `guardian` — mantido **só** na relação `unit`, conforme invariante "onDelete Cascade só de Unit" (seção 4). Deletar um Guardian sem deletar a Unit não deve arrastar tokens de cartão/sessões; a exclusão de Unit já cobre via cascade transitivo (Unit→Guardian→... não existe cascade automático em cadeia no Prisma, então isso é tratado a nível de aplicação/queda em cascade explícita se necessário — fora de escopo deste schema). | Invariante 4 (usuário) + reconciliação técnica (advisor) |
| 11 | `DunningLog` (spec nova mvp-045, campos ditados pelo usuário) não incluía `unitId` na lista de campos | **Adicionado `unitId`** — invariante "unitId em tudo" é mais forte que a omissão pontual na lista de campos da decisão 5. | Invariante 4 (usuário) + reconciliação técnica (advisor) |
| 12 | `DunningConfig.unitId` — decisão 5 não especifica se é 1:1 com Unit | Modelado como 1:1 (`unitId @unique` + `Unit.dunningConfig DunningConfig?`), simétrico a `BillingConfig`. | Reconciliação técnica (analogia com BillingConfig) |
| 13 | Índices de dashboard (f2-01) foram descritos como "adicionar ao model Invoice/Enrollment/Dunning propostos nos fluxos 02/03/05" — nenhuma spec fonte tinha esses índices no bloco original | Todos os índices compostos de f2-01 (`[unitId,status]`, `[unitId,paidAt]`, `[unitId,dueDate]`, `[unitId,referenceMonth]` em Invoice; `[unitId,status]`, `[unitId,cancelledAt]` em Enrollment; `[unitId,status]` em Dunning) incorporados diretamente nos models. | Decisão 9 (usuário) |
| 14 | `Invoice.billingType` — f2-01 dizia explicitamente "buscar via GET /payments no Extrato; **não persistir** no banco agora" | **Revertido por instrução direta do usuário** nesta consolidação: campo `billingType String?` passa a ser persistido (evita round-trip ao Asaas toda vez que o dashboard carrega o Extrato). | Decisão 3 (usuário) — sobrepõe f2-01 |
| 15 | Campos NFS-e (mvp-04, não lido nesta consolidação — só referenciado pelo usuário) | Incorporados como campos **dormentes** em `Invoice` (`nfseId`, `nfseStatus`, `nfseNumber`, `nfsePdfUrl`, `nfseXmlUrl`, `nfseEmittedAt`), todos opcionais, sem lógica de emissão no MVP (P1). | Decisão 3 (usuário) |

---

## 2. Bloco Prisma — delta completo

### 2.1 Enums novos

```prisma
enum EnrollmentPlan {
  MONTHLY
  QUARTERLY
  SEMIANNUAL
  ANNUAL
}

enum EnrollmentStatus {
  PENDING_CONFIRMATION    // fluxo manual: orientador criou, aguardando responsavel revisar e aceitar termos
  PENDING_SCHOOL_APPROVAL // responsavel revisou/aceitou termos, aguardando aprovacao da escola
  ACTIVE                  // escola aprovou + Asaas customer criado
  CANCELLED
  SUSPENDED
}

enum GuardianType {
  FATHER
  MOTHER
  LEGAL_GUARDIAN
}

enum InvoiceStatus {
  PENDING   // cobranca gerada, aguardando pagamento
  PAID      // PAYMENT_RECEIVED recebido e processado
  OVERDUE   // vencida (PAYMENT_OVERDUE do webhook)
  CANCELLED // cancelada manualmente ou pela escola
  BLOCKED   // nao pode ser gerada (Guardian sem asaasCustomerId)
  ERROR     // falha na criacao no Asaas
}

enum FirstChargeMode {
  PROPORTIONAL     // cobra proporcional aos dias restantes do ciclo (padrao)
  FREE_FIRST_MONTH // nao emite Invoice na 1a competencia; cobra cheia a partir do 2o mes
}

enum DunningAction {
  REMINDER     // lembrete antes do vencimento
  WARNING1     // 1o aviso pos-vencimento
  WARNING2     // 2o aviso pos-vencimento
  NEGATIVATION // negativacao automatica (POST /paymentDunnings)
  CANCELLATION // baixa da negativacao (DELETE /paymentDunnings ou pagamento recebido)
}

enum DunningStatus {
  NEGATIVATED // POST /paymentDunnings confirmado pelo Asaas
  REGULARIZED // baixa dada (DELETE /paymentDunnings ou pagamento recebido)
}
```

### 2.2 Models novos

```prisma
// ─── Pessoas / Matrícula ──────────────────────────────────────────────────────

model Student {
  id     String @id @default(cuid())
  unitId String

  // PII encrypted with AES-256-GCM
  nameEnc      String // nome do aluno
  birthDateEnc String // data de nascimento

  notes String? // observacoes livres (nao PII)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  enrollments Enrollment[]

  @@index([unitId])
  @@map("students")
}

model Enrollment {
  id         String @id @default(cuid())
  unitId     String
  guardianId String
  studentId  String
  subjectId  String

  plan             EnrollmentPlan
  agreedPriceCents Int // valor mensal do plano selecionado (snapshot do Subject.priceCents no momento da matricula)

  // Desconto por aluno (negociacao no fluxo manual)
  discountType       DiscountType? // reusa enum existente
  discountValueBp    Int?          // basis points, so se PERCENT
  discountValueCents Int?          // centavos, so se FIXED
  finalPriceCents    Int           // agreedPriceCents apos desconto; salvo para auditoria

  status EnrollmentStatus @default(PENDING_CONFIRMATION)

  // Link de confirmacao (fluxo manual)
  confirmationToken          String?   @unique
  confirmationTokenExpiresAt DateTime?
  confirmedAt                DateTime?

  // Cobranca (fluxo 03)
  customDueDay      Int?    // dia de vencimento customizado; senao usa BillingConfig.dueDay
  isFirstChargeDone Boolean @default(false) // true apos a 1a Invoice ser gerada

  // Regua de negativacao (spec nova mvp-045)
  dunningPaused Boolean @default(false) // pausa individual da regua para esta matricula

  startedAt   DateTime? // quando ACTIVE foi atingido
  cancelledAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit      @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian  @relation(fields: [guardianId], references: [id])
  student  Student   @relation(fields: [studentId], references: [id])
  subject  Subject   @relation(fields: [subjectId], references: [id])
  invoices Invoice[]

  @@index([unitId])
  @@index([guardianId])
  @@index([studentId])
  @@index([subjectId])
  @@index([unitId, status])      // dashboard (f2-01)
  @@index([unitId, cancelledAt]) // dashboard (f2-01)
  @@map("enrollments")
}

// ─── Billing ──────────────────────────────────────────────────────────────────

model Invoice {
  id           String @id @default(cuid())
  unitId       String
  enrollmentId String

  // Valores em centavos (regra do produto)
  amountCents    Int // Enrollment.finalPriceCents no momento da emissao (snapshot).
                      // Na 1a competencia com firstChargeMode = PROPORTIONAL, e o valor proporcional calculado (RN-14)
  netAmountCents Int // = amountCents (mantido por compatibilidade com o fluxo de pagamento)

  referenceMonth String   // "2026-06" — mes de competencia
  dueDate        DateTime // vencimento calculado

  status InvoiceStatus @default(PENDING)

  // Vinculo Asaas (preenchido apos POST /payments)
  asaasPaymentId   String? // "pay_xxxxx" retornado pela API
  asaasPaymentUrl  String? // invoiceUrl do Asaas (link do boleto)
  asaasBankSlipUrl String? // bankSlipUrl (PDF do boleto)
  asaasBarCode     String? // codigo de barras
  billingType      String? // forma de pagamento persistida do webhook (ex: "BOLETO", "CREDIT_CARD", "PIX") — evita round-trip ao GET /payments no Extrato (f2-01)

  // NFS-e — campos dormentes, sem logica de emissao no MVP (P1, ver mvp-04)
  nfseId        String?
  nfseStatus    String?
  nfseNumber    String?
  nfsePdfUrl    String?
  nfseXmlUrl    String?
  nfseEmittedAt DateTime?

  // Campos de controle
  emittedAt       DateTime? // quando POST /payments foi feito com sucesso
  paidAt          DateTime? // preenchido pelo webhook PAYMENT_RECEIVED
  paidAmountCents Int?      // valor efetivamente pago (pode diferir por juros)

  // Idempotencia: se o cron rodar duas vezes no mesmo mes, nao duplicar
  idempotencyKey String @unique // enrollmentId + ":" + referenceMonth

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  enrollment  Enrollment   @relation(fields: [enrollmentId], references: [id])
  payments    Payment[]
  dunning     Dunning?
  dunningLogs DunningLog[]

  @@index([unitId])
  @@index([enrollmentId])
  @@index([asaasPaymentId])
  @@index([referenceMonth])
  @@index([unitId, status])         // dashboard (f2-01)
  @@index([unitId, paidAt])         // dashboard (f2-01)
  @@index([unitId, dueDate])        // dashboard (f2-01)
  @@index([unitId, referenceMonth]) // dashboard (f2-01)
  @@map("invoices")
}

model Payment {
  id        String @id @default(cuid())
  unitId    String
  invoiceId String

  // Dados do evento webhook Asaas
  asaasPaymentId String    // mesmo que Invoice.asaasPaymentId
  asaasEvent     String    // PAYMENT_RECEIVED | PAYMENT_OVERDUE etc
  asaasStatus    String    // status retornado pelo Asaas
  amountCents    Int       // valor em centavos (convertido de reais)
  paidAt         DateTime  // payment.paymentDate do webhook
  clientPaidAt   DateTime? // payment.clientPaymentDate

  // Idempotencia: nao processar o mesmo evento duas vezes
  webhookEventId String @unique // hash do payload ou id unico do evento

  createdAt DateTime @default(now())

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([invoiceId])
  @@index([asaasPaymentId])
  @@map("payments")
}

// ─── Regua de negativacao (spec nova mvp-045) ─────────────────────────────────

model DunningConfig {
  id     String @id @default(cuid())
  unitId String @unique

  reminderDaysBefore    Int     @default(5)  // dias antes do vencimento pro lembrete
  warning1DaysAfter     Int     @default(3)  // dias apos vencimento pro 1o aviso
  warning2DaysAfter     Int     @default(10) // dias apos vencimento pro 2o aviso
  negativationDaysAfter Int     @default(30) // dias apos vencimento pra negativacao automatica
  active                Boolean @default(true) // liga/desliga a regua inteira pra unidade

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@map("dunning_configs")
}

model DunningLog {
  id        String        @id @default(cuid())
  unitId    String
  invoiceId String
  action    DunningAction
  result    String        // resultado da acao (ex: "sent", "skipped_opt_out", "failed")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([invoiceId, action])
  @@map("dunning_logs")
}

model Dunning {
  id        String @id @default(cuid())
  unitId    String
  invoiceId String @unique // 1:1 com Invoice

  // Asaas
  asaasDunningId String?
  status         DunningStatus @default(NEGATIVATED)

  // Valores em centavos (converter na borda Asaas)
  valueCents Int? // divida
  feeCents   Int? // taxa negativacao (R$29,90 = 2990)

  warningSentAt DateTime? // quando Asaas confirmou envio do aviso CDC
  requestedAt   DateTime? // quando POST /paymentDunnings foi feito
  resolvedAt    DateTime? // quando baixa foi dada ou pagamento recebido

  // Auditoria — null quando a negativacao foi automatica (regua), preenchido (clerkUserId) quando manual
  actorId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([unitId, status]) // dashboard (f2-01)
  @@map("dunnings")
}

// ─── Portal do Responsável (f2-02) ────────────────────────────────────────────

// PCI DSS: NUNCA salvar numero completo, CVV ou validade completa.
// asaasCardToken e o unico dado sensivel — restrito ao servidor.
model CardToken {
  id         String @id @default(cuid())
  unitId     String
  guardianId String

  asaasCardToken String  // retornado por POST /creditCard/tokenizeCreditCard
  last4          String  // ultimos 4 digitos mascarados (ex: "4242")
  brand          String? // "VISA" | "MASTERCARD" | "ELO" etc
  holderName     String  // nome impresso no cartao (sem CPF)

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id]) // sem cascade — ver invariante 4

  @@index([unitId])
  @@index([guardianId])
  @@map("card_tokens")
}

// Token de sessao do portal do responsavel (sem Clerk)
// Um link enviado por email/WhatsApp contem um token unico e de curta duracao.
model PortalSession {
  id         String    @id @default(cuid())
  unitId     String
  guardianId String
  token      String    @unique // UUID v4 — invalidado apos uso ou expiracao
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id]) // sem cascade — ver invariante 4

  @@index([unitId])
  @@index([guardianId])
  @@index([token])
  @@map("portal_sessions")
}
```

### 2.3 Alterações em models existentes

```prisma
// ─── Unit ───────────────────────────────────────────────────────────────────
// Adicionar relações inversas:
model Unit {
  // ...campos existentes inalterados...

  dunningConfig  DunningConfig? // NOVO
  students       Student[]      // NOVO
  enrollments    Enrollment[]   // NOVO
  invoices       Invoice[]      // NOVO
  payments       Payment[]      // NOVO
  dunnings       Dunning[]      // NOVO
  dunningLogs    DunningLog[]   // NOVO
  cardTokens     CardToken[]    // NOVO
  portalSessions PortalSession[] // NOVO
}

// ─── BillingConfig ────────────────────────────────────────────────────────────
// Adicionar campo:
model BillingConfig {
  // ...campos existentes inalterados...

  firstChargeMode FirstChargeMode @default(PROPORTIONAL) // NOVO
}

// ─── Subject ────────────────────────────────────────────────────────────────
// Adicionar relação inversa:
model Subject {
  // ...campos existentes inalterados...

  enrollments Enrollment[] // NOVO
}

// ─── Guardian ─────────────────────────────────────────────────────────────────
// Adicionar campos + relações:
model Guardian {
  // ...campos existentes inalterados...

  selfPayer       Boolean       @default(false) // NOVO — aluno paga a propria mensalidade
  type            GuardianType? // NOVO — FATHER | MOTHER | LEGAL_GUARDIAN (opcional: nem todo Guardian legado tera preenchido)
  serasaScore     Int?          // NOVO — score numerico da ultima consulta Serasa
  serasaCheckedAt DateTime?     // NOVO — timestamp da ultima consulta - evita reconsulta
  dunningOptOut   Boolean       @default(false) // NOVO — responsavel saiu da regua de negativacao permanentemente

  enrollments    Enrollment[]    // NOVO
  cardTokens     CardToken[]     // NOVO
  portalSessions PortalSession[] // NOVO
}
```

**Nota sobre `selfPayer`:** quando `Guardian.selfPayer = true`, o formulário esconde "Dados do aluno" e usa o próprio Guardian como Student (nome + CPF já coletados). `Enrollment.studentId` aponta para um Student automaticamente criado com os dados do Guardian.

**Nota sobre `Guardian.type` opcional:** diferente do `type GuardianType` obrigatório da spec original mvp-02, aqui é `GuardianType?` — necessário porque a migration 1 roda sobre uma tabela `guardians` que já pode ter linhas (dependendo da ordem real de deploy); tornar obrigatório sem backfill quebraria. Se o time confirmar que a tabela está vazia antes da migration 1, pode virar `GuardianType` obrigatório na própria migration — decisão de implementação, não de schema.

---

## 3. Ordem de migrations sugerida (faseada por feature/PR)

Recomendação: **faseada**, uma migration por fluxo de produto, na ordem abaixo — não uma migration monolítica. Justificativa: cada fluxo (matrícula, cobrança, negativação, portal, dashboard) é uma PR e um deploy independente no roadmap do MVP; migrations pequenas são mais fáceis de revisar, têm rollback mais barato, e permitem shipar matrícula sem esperar negativação estar pronta. O único custo é `Invoice.enrollmentId` referenciar um model que só existe a partir da migration 1 — mitigado emitindo migration 2 sempre depois da 1 em qualquer ambiente.

| Ordem | Migration | Conteúdo | Depende de |
|---|---|---|---|
| 1 | `add-enrollment-matricula` | Enums `EnrollmentPlan`, `EnrollmentStatus`, `GuardianType`. Models `Student`, `Enrollment` (sem `invoices` relation ainda funcional — Invoice não existe, mas Prisma permite declarar a relação e criar a tabela `invoices` só na migration seguinte não é possível pois a FK seria inválida; **portanto a migration 1 já deve incluir os campos de `Enrollment` que dependem de billing** — `customDueDay`, `isFirstChargeDone`, `dunningPaused` — mesmo que sua lógica de negócio só ligue na migration 2/3. Ver nota abaixo). Alterações em `Guardian` (`selfPayer`, `type`, `serasaScore`, `serasaCheckedAt`). Relações inversas em `Unit`/`Subject`. | schema atual |
| 2 | `add-billing-invoice-payment` | Enum `InvoiceStatus`, `FirstChargeMode`. Models `Invoice`, `Payment`. Campo `BillingConfig.firstChargeMode`. Relação `Enrollment.invoices`, `Unit.invoices`/`payments`. | migration 1 |
| 3 | `add-dunning` | Enums `DunningAction`, `DunningStatus`. Models `DunningConfig`, `DunningLog`, `Dunning`. Campo `Guardian.dunningOptOut`. Relações `Invoice.dunning`/`dunningLogs`, `Unit.dunningConfig`/`dunnings`/`dunningLogs`. | migration 2 (FK `Dunning.invoiceId` → `Invoice`) |
| 4 | `add-portal-responsavel` | Models `CardToken`, `PortalSession`. Relações `Guardian.cardTokens`/`portalSessions`, `Unit.cardTokens`/`portalSessions`. | migration 1 (FK `guardianId` → `Guardian`) |
| 5 | `add-dashboard-indexes` | Índices compostos de performance: `Invoice[unitId,status]`, `[unitId,paidAt]`, `[unitId,dueDate]`, `[unitId,referenceMonth]`; `Enrollment[unitId,status]`, `[unitId,cancelledAt]`; `Dunning[unitId,status]`. Campo `Invoice.billingType`, campos NFS-e dormentes. Sem models novos — puramente índices + colunas leitura. | migrations 1–3 |

**Nota sobre a migration 1 antecipar campos de billing/dunning em `Enrollment`:** `customDueDay`, `isFirstChargeDone` e `dunningPaused` vivem fisicamente na tabela `enrollments`, que só é criada na migration 1. Não há como "adicionar" esses campos numa migration posterior sem um `ALTER TABLE` redundante — então a opção mais limpa é declarar os 3 campos já na migration 1 (com defaults seguros: `false`/`null`), mesmo que a *lógica* de negócio que os popula (cron de cobrança, régua de negativação) só seja implementada nas migrations/PRs 2 e 3. Isso é diferente de "pular a ordem" — a coluna existe cedo, mas fica ociosa até o fluxo dono da lógica ligar.

Alternativa rejeitada: migration única (`add-education-x-mvp-core`) cobrindo tudo de uma vez. Rejeitada porque quebra o princípio anti-over-engineering do produto (shippar o menor loop primeiro) e acopla deploys que são independentes no roadmap (ex: dashboard de leitura pura do f2-01 não deveria esperar negativação implementada).

---

## 4. Invariantes (valem para todo o delta)

1. **Todo valor monetário é `Int` em centavos.** Nunca `Float`/`Decimal` para dinheiro. Conversão pra reais só na borda do cliente Asaas.
2. **Todo PII é `*Enc String` (AES-256-GCM: `iv:authTag:ciphertext`), nunca plaintext.** Aplica-se a `Student.nameEnc`/`birthDateEnc`, `Guardian.cpfEnc`/`emailEnc`/`phoneEnc`. Exceção documentada: `CardToken.holderName` é plaintext porque não é PII sensível isolado (nome impresso no cartão, sem CPF) — mas `asaasCardToken` nunca é armazenado fora do token retornado pela Asaas (nunca número completo/CVV).
3. **`unitId` em todo model tenant-scoped**, sempre indexado (`@@index([unitId])` no mínimo). Toda query da aplicação filtra por `unitId` da sessão Clerk — nunca de parâmetro HTTP. `DunningLog` inclui `unitId` mesmo não estando na lista literal de campos da decisão 5, por este invariante.
4. **`onDelete: Cascade` só a partir de `Unit`.** Nenhuma outra relação (`Guardian`, `Enrollment`, `Invoice` etc.) declara cascade entre si — evita deleção em cascata multi-nível não intencional (ex: apagar um Guardian não deve arrastar `CardToken`/`PortalSession` automaticamente; a aplicação decide isso explicitamente). `CardToken.guardian` e `PortalSession.guardian` foram corrigidos nesta consolidação para remover o cascade que a spec f2-02 original tinha.
5. **Relações 1:1 exigem `@unique` no lado FK.** `BillingConfig.unitId`, `DunningConfig.unitId`, `Dunning.invoiceId` são todos `@unique` — sem isso o Prisma trata como 1:N e a declaração singular do lado inverso (`Unit.billingConfig BillingConfig?`, `Invoice.dunning Dunning?`) falha na validação.
6. **Idempotência explícita onde há webhook/cron.** `Invoice.idempotencyKey` (`enrollmentId:referenceMonth`) e `Payment.webhookEventId` são `@unique` — nunca processar o mesmo evento Asaas duas vezes.
7. **Enums sempre em inglês, maiúsculo.** Consistente com o schema atual (`UnitStatus`, `FeePayer`, `DiscountType`, `TermsKind`). `GuardianType` foi corrigido nesta consolidação para seguir a convenção (spec original estava em português).

---

## 5. Checklist de compatibilidade com cada spec

| Spec | Compatível? | Notas |
|---|---|---|
| `mvp-02-matricula.md` | Sim, com alterações | `Enrollment.asaasSubscriptionId` removido (decisão 1). `GuardianType` traduzido pra inglês. `Guardian.type` virou opcional (nota seção 2.3). `isFirstChargeDone`/`dunningPaused` incorporados ao model canônico em vez de "adicionar depois". |
| `mvp-03-cobranca-automatica.md` | Sim, com alterações | `Enrollment` simplificado do 03 (`discountCents`, `status String`) descartado a favor do formato completo do 02, conforme a própria spec 03 já delegava a definição canônica ao 02. `Invoice`/`Payment` mantidos como especificados, com adição de `billingType` (ver linha f2-01 abaixo) e campos NFS-e dormentes. |
| `mvp-05-negativacao.md` | Sim, com alterações estruturais | `DunningStatus` reduzido de 4 para 2 estados (regra automática substitui decisão manual em cada etapa). `actorId` virou opcional. `optOut` por-dívida removido, substituído por `Guardian.dunningOptOut` permanente. `Dunning.invoiceId` formalizado como relação 1:1 real (`@unique` + `@relation`) em vez de comentário solto. Modelos novos `DunningConfig`/`DunningLog` não existiam nesta spec — vêm da spec nova mvp-045 citada na decisão 5. |
| `f2-02-portal-responsavel.md` | Sim, com correção de invariante | `CardToken`/`PortalSession` mantidos como especificados, exceto remoção do `onDelete: Cascade` na relação `guardian` (violava invariante 4) — cascade mantido apenas via `unit`. |
| `f2-01-painel-escola.md` | Sim, com uma reversão explícita | Todos os índices compostos de dashboard incorporados. `billingType` — a spec original dizia explicitamente "não persistir agora"; esta consolidação **reverte** essa decisão por instrução direta do usuário (decisão 3) e persiste o campo. Nenhum model novo, conforme a spec original ("este fluxo é de leitura pura"). |

---

## 6. Conflito adicional encontrado (além dos listados na tarefa)

Nenhuma das 5 specs lidas menciona `DunningConfig`/`DunningLog`/os detalhes de `Dunning` (2 estados, `actorId` opcional) — esses vêm inteiramente da "spec nova mvp-045" citada apenas na instrução do usuário, que não foi fornecida como arquivo para leitura. Não há como confrontar essa spec contra o texto de `mvp-05-negativacao.md` além do que já foi reconciliado na seção 1 (itens 6–9, 11–12); se `mvp-045` existir como arquivo físico em `.specs/`, vale uma segunda passada para confirmar que este documento não diverge dela.

Adicionalmente, durante a montagem e validação (`npx prisma validate`) dos deltas mesclados, dois problemas técnicos que nenhuma spec individual sinalizava foram corrigidos nesta consolidação (detalhados na seção 1, itens 9 e 10):
- `Dunning`↔`Invoice` sem `@unique`/`@relation` bidirecional formal (spec 05 tratava como comentário).
- `onDelete: Cascade` na relação `guardian` de `CardToken`/`PortalSession` (spec f2-02), violando a invariante "cascade só de Unit".

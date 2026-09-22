# ADR-0008: Schema da régua de cobrança e negativação automática

**Status:** Proposed (aguarda Gate 2 — assinatura do Rafa)
**Data:** 2026-09-21

## Contexto

A régua D-5/D+3/D+10/D+30 (`.specs/mvp-045-regua-negativacao.md`) precisa de estrutura de dados
antes de qualquer linha de código. O schema atual não tem nenhum dos três models de dunning, e o
enum `InvoiceStatus` não expressa "negativada" nem "regularizada". A decisão é irreversível por
dois motivos que não se revertem num PR pequeno: (1) estender `InvoiceStatus` muda a semântica de
toda query de receita já escrita e de todas as futuras; (2) `Dunning` guarda o `asaasDunningId` de
uma negativação real no SPC/Serasa — errar a cardinalidade aqui significa negativar o mesmo
responsável duas vezes, com custo de R$ 9,90 por chamada e dano de reputação de crédito de um
terceiro.

As duas fontes de verdade (`mvp-045` §4 e `.specs/SCHEMA-CONSOLIDADO.md` §2.2) **divergem em dois
pontos** — este ADR resolve ambos. `mvp-05-negativacao.md` está SUPERSEDED e não foi usado.
ADR-0007 não é contrariado: sua seção "fora de escopo" exclui explicitamente régua e negativação,
e sua Emenda 2 já resolveu a dúvida de janela (geração antecipada de 14 dias > lembrete D-5, logo
a `Invoice` sempre existe quando a régua olha) e declarou reconciliação como dependência à parte.

## Decisão

Três models novos (`DunningConfig` 1:1 `Unit`, `DunningLog` 1:N `Invoice`, `Dunning` 1:1
`Invoice`), dois enums novos (`DunningAction`, `DunningStatus`), dois valores novos em
`InvoiceStatus`, e um campo booleano em model existente (`Guardian.dunningOptOut`;
`Enrollment.dunningPaused` **já existe**, `schema.prisma:257` — não recriar). Bloco Prisma exato
no Anexo A.

### Divergências entre as fontes — resolvidas aqui

**D1 — vocabulário de `DunningLog.result`: `"success"` é canônico.** `mvp-045` §4 define
`"success" | "error: <msg>"`; `SCHEMA-CONSOLIDADO` linha 276 sugere `"sent" | "skipped_opt_out" |
"failed"`. Vence `"success"` porque é **load-bearing em quatro lugares** de `mvp-045` (R2 e R8 —
o guard de idempotência; §7b — a derivação de etapa do dashboard; §9 — o DoD binário), contra um
comentário parentético no consolidado. Se o implementador gravar `"sent"`, o guard de R2
(`SHALL NOT disparar uma action que já possua DunningLog com result = "success"`) **nunca casa**, e
todo cron re-dispara todas as etapas de todas as invoices — silenciosamente, a R$ 0,55 por
mensagem e R$ 9,90 por negativação repetida. `"skipped_opt_out"` é morto por construção e **não
deve ser implementado**: R7 manda não gravar log nenhum sob pausa, e o DoD §9 item 7 prova que
opt-out não gera log de `NEGATIVATION`. Não existe caminho de skip-logging neste desenho.

**D2 — `feeCents` é ~990 (R$ 9,90), não 2990.** O comentário `// taxa negativacao (R$29,90 = 2990)`
em `SCHEMA-CONSOLIDADO` linha 300 está obsoleto; `mvp-045` §10.3 corrige explicitamente o valor do
rascunho `mvp-05`. Sem `@default` no schema — o campo é `Int?` preenchido sempre a partir do
`feeValue` da resposta Asaas (× 100), nunca chutado pelo código.

### Os quatro pontos de design não triviais

**(a) `DunningLog` não tem `@@unique([invoiceId, action])`.** A idempotência é regra de negócio, não
constraint de banco, porque o log serve a **dois propósitos ao mesmo tempo**: guard de repetição e
trilha de auditoria de tentativas. Um `@@unique` só conseguiria servir ao primeiro. R13/R14 exigem
que uma etapa que falhou (`result = "error: ..."`) seja retentada no próximo cron — com a
constraint, a segunda tentativa lançaria `P2002` em vez de retentar, e a única forma de contornar
seria sobrescrever a linha de erro, destruindo o registro de que a primeira tentativa falhou.
Numa operação que toca reputação de crédito, o histórico de tentativas é o que permite explicar
depois por que uma negativação aconteceu (ou não). O guard fica no service: só pula a `action` se
já existir log com `result = "success"` para aquela `invoiceId`+`action` — exatamente o que
`@@index([invoiceId, action])` torna barato.

**(b) `Dunning.invoiceId` é `@unique` (1:1 real, não 1:N).** Duas razões, uma técnica e uma de
segurança. Técnica: invariante 5 do `SCHEMA-CONSOLIDADO` — sem `@unique` o Prisma trata como 1:N e
a contraparte singular `Invoice.dunning Dunning?` falha na validação. De segurança, e essa é a que
justifica o ADR: no caminho de retry de R14, se o `POST /paymentDunnings` falhou e a linha
`Dunning` já existe, a próxima rodada do cron tem que fazer **upsert por `invoiceId`**, não insert.
Com `@unique`, "duas negativações para a mesma cobrança" é um estado **não-representável** no
banco; sem ele, depende do implementador lembrar — e a falha silenciosa custa R$ 9,90 e uma
segunda inclusão indevida no bureau. Modelar 1:1 é o que permite que o banco, não a disciplina,
seja o guard. Conceitualmente também está correto: uma Invoice tem no máximo uma dívida negativada,
que transita `NEGATIVATED → REGULARIZED` no lugar de virar uma segunda linha.

**(c) `dunningOptOut` é global no `Guardian`, não por dívida.** O argumento decisivo é estrutural,
não de preferência: uma linha `Dunning` **só passa a existir no momento da negativação** (§5a — é
criada a partir da resposta do `POST /paymentDunnings`). Um opt-out guardado ali seria fisicamente
incapaz de impedir a primeira negativação — só a segunda, que não existe (ver (b)). Por isso
`SCHEMA-CONSOLIDADO` linha 24 declara que o `Dunning.optOut` do `mvp-05` "morre". Semanticamente
também é o certo: opt-out é uma decisão da escola sobre uma **pessoa** ("este responsável nunca vai
para o SPC"), não sobre uma fatura; R8 e R16 confirmam que ele vale para todas as Invoices daquele
Guardian em qualquer Enrollment. Consequência para o cron: a varredura precisa carregar
`enrollment.guardian` com `select` explícito para ler `dunningPaused` e `dunningOptOut` na mesma
query (regra N+1 do `backend.md`), nunca num loop.

**(d) `actorId String?` com `null` = automático, em vez de um enum `origin`.** Um campo booleano ou
enum separado (`AUTOMATIC | MANUAL`) mais um `actorId` permitiria escrever dois estados
contraditórios: `MANUAL` sem ator, e `AUTOMATIC` com ator. Nenhum dos dois tem significado, e nada
no banco os impediria — sobraria validação de aplicação para uma invariante que o schema podia
garantir sozinho. Com um campo só, a origem é **derivada do dado** em vez de declarada em paralelo
a ele: `actorId == null` ⇔ régua automática; `actorId != null` ⇔ ação manual, e o valor já é o
`clerkUserId` de quem respondeu pela decisão. Uma fonte de verdade, estados inconsistentes
não-representáveis. É a mesma escolha já feita em `TermsAcceptance.guardianId` (`schema.prisma:296`),
onde `null` distingue aceite da escola do aceite do responsável — consistência com o padrão do repo,
não invenção nova.

### Índices extras do SCHEMA-CONSOLIDADO: `[unitId, dueDate]` entra, `[unitId, paidAt]` fica fora

O critério é "esta feature consome a query?", não "o consolidado lista o índice".

- **`@@index([unitId, dueDate])` entra.** R1 varre `Invoice` por Unit e o `DunningEngine` calcula
  `diasVsVencimento` a partir de `dueDate` — é literalmente a query central desta feature, rodando
  diariamente sobre a tabela que mais cresce. Sem ele a varredura cai no `@@index([unitId])` simples
  e filtra o resto em memória (anti-padrão explícito de `database.md`).
- **`@@index([unitId, paidAt])` fica fora.** É índice de dashboard f2-01, com zero consumidor nesta
  feature. Adicionar índice sem query que o use é custo de escrita em toda emissão de cobrança sem
  benefício de leitura.

O precedente para essa separação já existe no repo: `SCHEMA-CONSOLIDADO` §3 aloca os quatro índices
de dashboard à migration 5 (`add-dashboard-indexes`), separada da migration 3 (`add-dunning`), e
`@@index([unitId, status])` já foi puxado para o schema atual com um comentário explicando a query
EDU-27 que o exigia. Este ADR segue a mesma regra: índice entra junto com a query que o justifica.

> **Nota para o `code-implementer`:** a varredura de R1 filtra `status IN (PENDING, OVERDUE)` **e**
> `dueDate`. O índice teoricamente mais apertado seria `[unitId, status, dueDate]`. Seguimos
> `[unitId, dueDate]` por ser a leitura literal da fonte, e porque `[unitId, status]` já existe — o
> planner escolhe um dos dois. Se a varredura diária aparecer lenta em `EXPLAIN ANALYZE` depois, o
> composto de três colunas é a correção; não é motivo para mudar a decisão agora.

## Consequências

✅ **Idempotência auditável.** `DunningLog` registra toda tentativa, inclusive as que falharam, e o
guard de `result = "success"` impede repetir etapa cumprida sem impedir retry de etapa falha.

✅ **Dupla negativação vira estado não-representável**, garantido pelo banco (`invoiceId @unique`),
não por disciplina de código.

✅ **Opt-out e pausa são legíveis numa query só** (`Enrollment.dunningPaused` + `Guardian.dunningOptOut`),
sem N+1 no cron diário.

✅ **Índice da query central da régua entra junto com a régua** — a varredura diária nasce indexada
em vez de virar um incidente de performance quando a base crescer.

⚠️ **`status = 'PAID'` deixa de significar "dinheiro entrou" — este é o principal efeito
irreversível.** Depois de R17, uma cobrança **paga** fica em `REGULARIZED`, não em `PAID`, com
`paidAt` preenchido. Toda agregação de receita que filtra `where: { status: 'PAID' }` passa a
subcontar silenciosamente. **Regra que substitui:** query de dinheiro recebido usa
`paidAt != null`, nunca `status = 'PAID'`. Simetricamente, uma invoice `NEGATIVATED` não está mais
em `OVERDUE`, então qualquer relatório de inadimplência precisa incluir os dois valores. Hoje o
impacto é pequeno (`src/app/(app)/cobrancas/page.tsx:13` usa `'PAID'` como filtro de UI, o que
continua correto como filtro literal), mas a regra vale de agora em diante.

⚠️ **O handler de webhook atual promove incondicionalmente para `PAID`
(`src/lib/services/webhook.service.ts:87`, `invoiceUpdateData.status = 'PAID'`), o que conflita com
R17.** Quando `PAYMENT_RECEIVED` chega para uma Invoice `NEGATIVATED`, o destino tem que ser
`REGULARIZED` + `DELETE /paymentDunnings`, não `PAID`. O comentário "guard assimétrico: sempre
promove para PAID" (linhas 116-117) precisa ganhar essa exceção na Fatia 4. Não é mudança deste ADR
— é integração que ele torna obrigatória, e que o `code-implementer` precisa ver declarada.

⚠️ **O cron precisa de duas queries, não uma.** Como a varredura de R1 filtra
`status IN (PENDING, OVERDUE)`, uma Invoice `NEGATIVATED` sai do escopo dela — correto, porque a
baixa é webhook-driven (R17). Mas isso significa que a reconciliação de polling de R18 tem que ser
uma **segunda query sobre `Dunning`** (status pendente há > 1h), não um ramo da varredura de Invoice.

⚠️ **`DunningLog` cresce sem limite** (até 4-5 linhas por Invoice por ciclo, mais retries). Aceito:
é tabela de auditoria de uma operação que toca crédito de terceiro, e `@@index([invoiceId, action])`
mantém a leitura barata. Arquivamento é problema de escala, não de MVP.

⚠️ **Estado real do banco não verificado.** O contrato deste agente pede checar o schema real via
`supabase` read-only porque `schema.prisma` pode estar dessincronizado de produção — o servidor MCP
`supabase` falhou ao conectar nesta sessão (`JWT could not be decoded`). A conferência continua
**devida antes de rodar a migration**, não feita.

## Alternativas consideradas

- **`@@unique([invoiceId, action])` em `DunningLog`**: transformaria o retry de R13/R14 em `P2002`;
  a única saída seria sobrescrever a linha de erro, apagando a trilha de tentativas falhas.
- **`Dunning` 1:N com `Invoice`** (uma linha por tentativa): tornaria dupla negativação
  representável no banco e exigiria "pegar a última linha" em toda leitura; o ciclo
  `NEGATIVATED → REGULARIZED` já cabe numa linha só.
- **`Dunning.optOut` por dívida** (desenho do `mvp-05`): impossível de funcionar — a linha `Dunning`
  nasce na negativação, então o opt-out nunca poderia impedir a primeira.
- **Enum `origin: AUTOMATIC | MANUAL` + `actorId`**: permite dois estados contraditórios que o banco
  não impede; `actorId` nullable carrega a mesma informação sem redundância.
- **Campo persistido `currentStage` na `Invoice`**: seria um segundo lugar para a verdade que o
  `DunningLog` já contém, com risco de divergir; `mvp-045` §7b define `getReguaEtapa()` derivada.
- **Adicionar os quatro índices de dashboard nesta migration**: custo de escrita sem query
  consumidora; contraria o faseamento já decidido em `SCHEMA-CONSOLIDADO` §3 (migration 5).
- **Enum `DunningStatus` com 4 estados** (`EMAVISO`/`ELEGIVEL`/..., desenho do `mvp-05`): pressupõe
  decisão manual em cada etapa; com régua automática esses estados viram entradas de `DunningLog`
  via `DunningAction`, não status.

## O que fica irreversível

1. **A semântica de `InvoiceStatus`.** Adicionar valores ao enum é aditivo e seguro no banco; o que
   não se reverte é o contrato de leitura — "receita = `paidAt != null`" passa a valer para todo
   código futuro, e voltar atrás exigiria reescrever toda query de dinheiro já escrita sobre a nova
   regra.
2. **Cardinalidade `Invoice ↔ Dunning` 1:1.** Migrar para 1:N depois exigiria migration destrutiva
   sobre linhas que referenciam negativações reais no SPC/Serasa.
3. **Opt-out no `Guardian`.** Mover para outro nível depois exigiria backfill com decisão humana por
   responsável — não há como inferir a intenção original a partir do booleano.
4. **`DunningLog` sem unique constraint.** Adicionar a constraint depois falharia contra as linhas
   de retry já gravadas.

## Anexo A — Bloco Prisma final (pronto para `prisma/schema.prisma`)

> Valores conferidos contra `mvp-045` §4 e `SCHEMA-CONSOLIDADO` §2.2, com D1 e D2 aplicados.
> `Enrollment.dunningPaused` **já existe** (`schema.prisma:257`) e não aparece abaixo — não recriar.

```prisma
// ─── Enums novos ──────────────────────────────────────────────────────────────

enum DunningAction {
  REMINDER     // D-5: lembrete pré-vencimento
  WARNING1     // D+3: primeiro aviso de atraso
  WARNING2     // D+10: aviso final (negativação iminente)
  NEGATIVATION // D+30: negativação automática (POST /paymentDunnings)
  CANCELLATION // baixa da negativação (DELETE /paymentDunnings ou pagamento recebido)
}

enum DunningStatus {
  NEGATIVATED // POST /paymentDunnings confirmado pelo Asaas
  REGULARIZED // baixa dada (DELETE /paymentDunnings ou pagamento recebido)
}

// ─── Estender enum existente (schema.prisma:60) ───────────────────────────────
// Adicionar DUAS entradas ao fim de InvoiceStatus, sem tocar nas existentes:
//
// enum InvoiceStatus {
//   PENDING
//   PAID
//   OVERDUE
//   CANCELLED
//   BLOCKED
//   ERROR
//   NEGATIVATED // ADR-0008 — negativada no SPC/Serasa
//   REGULARIZED // ADR-0008 — negativação cancelada (pagamento recebido)
// }

// ─── Models novos ─────────────────────────────────────────────────────────────

model DunningConfig {
  id     String @id @default(cuid())
  unitId String @unique // 1:1 com Unit (invariante 5, simétrico a BillingConfig)

  reminderDaysBefore    Int @default(5)  // D-5: lembrete antes do vencimento
  warning1DaysAfter     Int @default(3)  // D+3: primeiro aviso de atraso
  warning2DaysAfter     Int @default(10) // D+10: aviso final
  negativationDaysAfter Int @default(30) // D+30: negativação automática

  active Boolean @default(true) // liga/desliga a régua inteira da unidade

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
  // Vocabulário canônico (ADR-0008 D1): "success" | "error: <mensagem curta, sem PII>".
  // NÃO usar "sent"/"failed"/"skipped_opt_out" — o guard de idempotência (R2/R8) compara
  // literalmente contra "success" e silenciosamente re-dispara a régua se o valor divergir.
  result    String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  // SEM @@unique([invoiceId, action]) — proposital (ADR-0008 (a)): idempotência é regra de
  // negócio no service, e a constraint impediria o retry de etapa falha exigido por R13/R14.
  @@index([unitId])
  @@index([invoiceId, action])
  @@map("dunning_logs")
}

model Dunning {
  id        String @id @default(cuid())
  unitId    String
  invoiceId String @unique // 1:1 real com Invoice (ADR-0008 (b)) — torna dupla negativação
  //                          não-representável e permite upsert no retry de R14

  // Asaas
  asaasDunningId String? // preenchido após POST /paymentDunnings
  status         DunningStatus @default(NEGATIVATED)

  // Valores em centavos — conversão na borda do cliente Asaas (response * 100)
  valueCents Int? // dívida negativada (response.value * 100)
  feeCents   Int? // taxa de negativação (response.feeValue * 100; ~990 = R$ 9,90 na prática).
  //                 Sem @default: persistir sempre o valor real retornado pelo Asaas.

  // Auditoria / timeline
  warningSentAt DateTime? // quando o Asaas confirmou o aviso CDC (10 dias antes)
  requestedAt   DateTime? // quando POST /paymentDunnings foi confirmado
  resolvedAt    DateTime? // quando a baixa foi dada ou o pagamento recebido

  // null = negativação automática pela régua; preenchido (clerkUserId) = ação manual (ADR-0008 (d))
  actorId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([unitId])
  @@index([unitId, status])
  @@map("dunnings")
}

// ─── Adicionar ao model Guardian existente (schema.prisma:192) ────────────────
// Campo novo, junto aos demais escalares (antes de createdAt):
//
//   dunningOptOut Boolean @default(false) // avisos continuam; negativação NUNCA ocorre (R8)

// ─── Adicionar ao model Invoice existente (schema.prisma:312) ─────────────────
// Relações inversas, junto a `payments   Payment[]`:
//
//   dunning     Dunning?
//   dunningLogs DunningLog[]
//
// Índice novo, junto aos existentes (ver seção de índices deste ADR):
//
//   @@index([unitId, dueDate]) // ADR-0008 — varredura diária do cron da régua (R1)
//
// NÃO adicionar @@index([unitId, paidAt]) — fica para a migration de dashboard (f2-01).

// ─── Adicionar ao model Unit existente (schema.prisma:76) ─────────────────────
// Relações inversas, junto a `payments  Payment[]`:
//
//   dunningConfig DunningConfig?
//   dunnings      Dunning[]
//   dunningLogs   DunningLog[]
```

**Migration:** `prisma/migrations/YYYYMMDDHHMMSS_add-dunning/` (padrão do repo). Puramente aditiva —
nenhuma coluna existente vira `NOT NULL`, nenhum `DROP`. Os dois booleanos novos entram com
`@default(false)`, então não exigem backfill.

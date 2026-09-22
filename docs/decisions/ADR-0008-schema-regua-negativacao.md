# ADR-0008: Schema da negativação (régua de avisos nativa Asaas + negativação manual)

**Status:** Accepted (Gate 2 assinado por Rafa em 2026-09-22)
**Data:** 2026-09-21 · **Revisado:** 2026-09-22 (ver Emenda 1 e Emenda 2)

## Contexto

A negativação (`.specs/mvp-045-regua-negativacao.md`, parcialmente superada — ver Emenda 2) precisa
de estrutura de dados antes de qualquer linha de código. O schema atual não tem nenhum dos models
de dunning, e o enum `InvoiceStatus` não expressa "negativada" nem "regularizada". A decisão é
irreversível por dois motivos que não se revertem num PR pequeno: (1) estender `InvoiceStatus`
muda a semântica de toda query de receita já escrita e de todas as futuras; (2) `Dunning` guarda o
`asaasDunningId` de uma negativação real no SPC/Serasa — errar a cardinalidade aqui significa
negativar o mesmo responsável duas vezes, com custo de R$ 9,90 por chamada e dano de reputação de
crédito de um terceiro.

O **timing dos avisos pré-negativação** é da régua nativa do Asaas (D-3 / D0 / D+1, fixa, a nível
de subconta) — decisão de produto do Rafa em 2026-09-22, ver Emenda 1. A **negativação em si é
ação manual do orientador**, não automática por cron — decisão de produto do Rafa, mesmo dia, ver
Emenda 2. O sistema só calcula em D+60 que a Invoice está elegível e habilita um botão; o
`POST /paymentDunnings` só é disparado quando o orientador clica.

As duas fontes de verdade (`mvp-045` §4 e `.specs/SCHEMA-CONSOLIDADO.md` §2.2) **divergem em dois
pontos** — este ADR resolve ambos. `mvp-05-negativacao.md` está SUPERSEDED e não foi usado.
ADR-0007 não é contrariado: sua seção "fora de escopo" exclui explicitamente régua e negativação,
e sua Emenda 2 já resolveu a dúvida de janela (geração antecipada de 14 dias, logo a `Invoice`
sempre existe muito antes de D+60) e declarou reconciliação como dependência à parte.

## Decisão

Dois models novos (`DunningLog` 1:N `Invoice`, `Dunning` 1:1 `Invoice`), dois enums novos
(`DunningAction`, `DunningStatus`), dois valores novos em `InvoiceStatus`, um campo booleano em
model existente (`Guardian.dunningOptOut`; `Enrollment.dunningPaused` **já existe**,
`schema.prisma:257` — não recriar), e uma constante `NEGATIVATION_DAYS_AFTER_OVERDUE = 60` em
`src/lib/dunning.ts`. **Não existe model `DunningConfig`** — ver Emenda 1. Bloco Prisma exato no
Anexo A.

### Onde mora a constante: `src/lib/dunning.ts`, não dentro do service

`NEGATIVATION_DAYS_AFTER_OVERDUE = 60` fica em `src/lib/dunning.ts` — arquivo novo, puro, sem I/O,
irmão de `src/lib/pricing.ts`. É uma regra de negócio pura, e o padrão do repo para isso já existe:
`pricing.ts` é exatamente isso — cálculo testável isolado, sem I/O, importável dos dois lados.
`src/lib/data/plans.ts` não serve de molde aqui porque é um *catálogo* (array de registros); isto
é uma regra única.

O critério de posicionamento não é estético, é **fan-out de import**. `backend.md` coloca tudo que
toca Prisma sob `src/lib/services/`. Hoje o único leitor da constante é o engine de negativação, e
pela regra anti-over-engineering do repo isso por si só não justificaria arquivo novo — mas o custo
de criá-lo é zero e ele preserva a opção: qualquer string de UI que venha a exibir o prazo ("a
dívida vai para o SPC/Serasa 60 dias após o vencimento") importa a constante sem arrastar Prisma
para a fronteira do cliente. Se morasse em `dunning-engine.service.ts`, essa porta ficaria fechada.

Não vira `DunningConfig` com `@default(60)` nem env var: o valor é a mesma regra para toda escola
(é disso que se trata a reversão), e env var esconderia uma regra de negócio num lugar onde teste
não alcança.

### Divergências entre as fontes — resolvidas aqui

**D1 — vocabulário de `DunningLog.result`: o valor canônico da v1/v2 deste ADR era a string
`"success"`.** `mvp-045` §4 define `"success" | "error: <msg>"`; `SCHEMA-CONSOLIDADO` linha 276
sugere `"sent" | "skipped_opt_out" | "failed"`. `"success"` vencia porque era **load-bearing** em
`mvp-045` (R2 e R8 — o guard de idempotência; §9 — o DoD binário), contra um comentário parentético
no consolidado. `"skipped_opt_out"` é morto por construção e **não deve ser implementado**: R7
manda não gravar log nenhum sob pausa, e o DoD §9 item 7 prova que opt-out não gera log de
`NEGATIVATION`. Não existe caminho de skip-logging neste desenho. **A partir da Emenda 3, o campo
`result` é o enum `DunningLogResult` (`SUCCESS`/`ERROR`), não mais `String` livre** — o vocabulário
correto passa a ser garantido pelo tipo, não por convenção de comentário. Ver Emenda 3 para o
raciocínio completo; esta seção fica como registro histórico da decisão original.

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

- **`@@index([unitId, dueDate])` entra.** O cron varre `Invoice` por Unit e calcula
  `diasVsVencimento` a partir de `dueDate` — é literalmente a query central desta feature, rodando
  diariamente sobre a tabela que mais cresce. A reversão da Emenda 1 não muda isso: a varredura
  continua idêntica, só compara `diasVsVencimento` contra a constante fixa
  `NEGATIVATION_DAYS_AFTER_OVERDUE` em vez de contra `DunningConfig.negativationDaysAfter`. Sem o
  índice a varredura cai no `@@index([unitId])` simples e filtra o resto em memória (anti-padrão
  explícito de `database.md`).
- **`@@index([unitId, paidAt])` fica fora.** É índice de dashboard f2-01, com zero consumidor nesta
  feature. Adicionar índice sem query que o use é custo de escrita em toda emissão de cobrança sem
  benefício de leitura.

O precedente para essa separação já existe no repo: `SCHEMA-CONSOLIDADO` §3 aloca os quatro índices
de dashboard à migration 5 (`add-dashboard-indexes`), separada da migration 3 (`add-dunning`), e
`@@index([unitId, status])` já foi puxado para o schema atual com um comentário explicando a query
EDU-27 que o exigia. Este ADR segue a mesma regra: índice entra junto com a query que o justifica.

> **Nota para o `code-implementer`:** a varredura filtra `status IN (PENDING, OVERDUE)` **e**
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

✅ **Índice da query central entra junto com a query** — a varredura diária nasce indexada
em vez de virar um incidente de performance quando a base crescer.

✅ **Superfície irreversível menor que a da v1.** Sem `DunningConfig`, não existe tabela de
configuração por escola para migrar, nem defaults gravados em linha que virem dado legado se o
produto mudar de ideia sobre os prazos. Mudar `60` é um PR de uma linha; mudar uma coluna
`negativationDaysAfter` já preenchida em N escolas seria backfill com decisão por tenant.

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

⚠️ **Não existe mais kill-switch de régua por escola.** `DunningConfig.active` era o que R1 e R9
usavam para pular uma Unit inteira no cron; com o model removido, a leitura literal é que **a
negativação automática roda para toda Unit, incondicionalmente**. `Enrollment.dunningPaused` e
`Guardian.dunningOptOut` continuam existindo, mas são granulares — nenhum dos dois desliga a
feature para uma escola de uma vez. Se o Rafa quiser o kill-switch de volta (ex.: `Unit.dunningActive`),
é **decisão nova de Gate 2**, não algo para o `code-implementer` inventar na migration. Declarado
aqui exatamente para que essa lacuna não seja preenchida por conta própria.

⚠️ **Janela de ~59 dias sem contato próprio entre o último aviso nativo e a elegibilidade pra
negativar.** A régua nativa Asaas termina em D+1; a Invoice fica elegível para negativação manual
em D+60. Nesse intervalo o Education X não dispara nada por conta própria. O aviso legal do CDC
(art. 43, 10 dias antes da inclusão, ~D+50) é responsabilidade do Asaas e continua registrado em
`Dunning.warningSentAt` — **não confundir com os avisos D-3/D0/D+1**, são mecanismos diferentes.
Nota sobre R8: `Guardian.dunningOptOut` **não consegue** suprimir os avisos nativos, porque eles
são configurados a nível de subconta, não por responsável — ou seja, a semântica de R8 ("avisos
continuam, negativação não") sobrevive à reversão, mas agora por mecanismo, não por desenho. Aceito
como consequência da escolha de simplicidade (confirmado com Rafa — ver Gate 2 e Emenda 2); se a
conversão de inadimplência ficar ruim, a correção é adicionar um aviso próprio intermediário, o que
não exige mudar nada deste schema. Com a Emenda 2, o intervalo também deixou de ser "sem ação
possível" — a partir de D+60 o orientador já pode agir manualmente a qualquer momento, então a
janela real de inação é só D+1 a D+60, não D+1 até "algo automático acontecer".

⚠️ **O cron precisa de duas queries, não uma.** Como a varredura filtra
`status IN (PENDING, OVERDUE)`, uma Invoice `NEGATIVATED` sai do escopo dela — correto, porque a
baixa é webhook-driven (R17). Mas isso significa que a reconciliação de polling de R18 tem que ser
uma **segunda query sobre `Dunning`** (status pendente há > 1h), não um ramo da varredura de Invoice.

⚠️ **`DunningLog` cresce sem limite** (agora ~1-2 linhas por Invoice negativada, mais retries —
menos que na v1, que logava 4-5 etapas). Aceito: é tabela de auditoria de uma operação que toca
crédito de terceiro, e `@@index([invoiceId, action])` mantém a leitura barata. Arquivamento é
problema de escala, não de MVP.

⚠️ **Estado real do banco não verificado.** O contrato deste agente pede checar o schema real via
`supabase` read-only porque `schema.prisma` pode estar dessincronizado de produção — o servidor MCP
`supabase` falhou ao conectar nas duas sessões (`JWT could not be decoded`). A conferência continua
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
  decisão manual em cada etapa; com negativação automática esses estados viram entradas de
  `DunningLog` via `DunningAction`, não status.
- **Manter `DunningConfig` só para o prazo de negativação** (um campo em vez de quatro): tabela,
  migration, relação 1:1, endpoint e tela para guardar um número que é igual em toda escola —
  ver Emenda 1.
- **`NEGATIVATION_DAYS_AFTER_OVERDUE` como env var**: esconde regra de negócio fora do código
  testável e permite divergência silenciosa entre preview e produção.

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

**Não entra nesta lista:** o valor `60` e a régua nativa. Trocar o número é um PR de uma linha;
voltar a uma régua própria configurável é adicionar `DunningConfig` depois, aditivamente, sem
desfazer nada do que está aqui. A Emenda 1 **reduziu** a superfície irreversível deste ADR — os
quatro itens acima são exatamente os mesmos da v1, nenhum dependia de `DunningConfig`.

## Emenda 1 (2026-09-22) — régua de avisos nativa do Asaas, negativação fixa em D+60

**Origem: decisão de produto do Rafa, não achado técnico.** A v1 deste ADR (2026-09-21) desenhava
um model `DunningConfig` 1:1 com `Unit`, com quatro prazos configuráveis por escola
(`reminderDaysBefore` D-5 / `warning1DaysAfter` D+3 / `warning2DaysAfter` D+10 /
`negativationDaysAfter` D+30) mais um toggle `active`. Em 2026-09-22 o Rafa reverteu essa direção:
**o timing dos avisos pré-negativação passa a ser a régua nativa do Asaas** (D-3 antes do
vencimento / D0 no vencimento / D+1 após, fixa, configurada a nível de subconta).

O raciocínio de `mvp-045` §1 e §10.1 — que a régua nativa é rígida e não configurável por escola —
**continua factualmente correto**; não foi invalidado por nenhuma descoberta técnica nova. A
reversão é uma escolha consciente de **simplicidade sobre configurabilidade na v1**, feita pelo
Rafa, aceitando a rigidez que a spec original rejeitava. É consistente com o ICP já declarado no
`CLAUDE.md` ("franquias micro, dono decide, sem TI dedicado → simplicidade > configurabilidade"),
mas o registro honesto é que a causa é a decisão dele, não uma dedução a partir do ICP.

**Escopo exato da reversão (confirmado com o Rafa em duas perguntas):**

1. **Só o TIMING dos avisos vira nativo.** O Asaas envia os avisos; **ele não decide negativar**.
   A decisão de quando negativar continua sendo feature própria do Education X — cron próprio,
   `POST /paymentDunnings` próprio, `DunningLog` próprio.
2. **Prazo de negativação fixo em D+60**, especificado explicitamente pelo Rafa (não 30, não 15).

**Mudanças no schema:**

- **`DunningConfig` é removido inteiro** — model, relação inversa `Unit.dunningConfig`, e todas as
  menções no corpo do ADR. Nunca chegou a existir no banco (o ADR estava `Proposed`, sem migration
  rodada), então não há migration de remoção: é só não criar.
- **`NEGATIVATION_DAYS_AFTER_OVERDUE = 60`** passa a viver em `src/lib/dunning.ts` (justificativa
  na seção "Onde mora a constante").
- **`DunningAction` encolhe de 5 para 2 valores.** Ver abaixo — é a parte menos óbvia da emenda,
  **e é uma decisão do `system-architect`, não do Rafa** — está listada no Gate 2 abaixo para
  assinatura explícita, não como fato consumado.

**Por que `REMINDER`/`WARNING1`/`WARNING2` saem do enum (decisão do arquiteto, sujeita ao Gate 2).**
Esses três valores só existiam porque a régua própria decidia o momento de cada aviso e registrava
o disparo (`mvp-045` §5d). Com o timing delegado ao Asaas, **nenhum código do Education X escreve
esses logs**: não há callback por notificação enviada (`mvp-045` §2a — não existe endpoint
dedicado de aviso; a pendência P1 da spec morre junto com a régua própria), e o cliente tipado
Asaas expõe apenas `createDunning`, `removeDunning` e `getDunning`
(`src/lib/integration/asaas/asaas-client.interface.ts:39-42`) — nenhum método de envio de
notificação. Verificado por varredura: hoje há **zero escritores** dos três valores em `src/`.
Manter enum value que nada escreve é dívida com custo assimétrico — em Postgres, **adicionar**
valor a enum é trivial e **remover** exige migration. Na dúvida, o enum menor. Se um aviso próprio
voltar (ver a ⚠️ da janela de 59 dias), `ALTER TYPE ... ADD VALUE` resolve sem tocar em nada mais.

**Consequência derivada:** a derivação de etapa de `mvp-045` §7b colapsa de seis estados para três
— `NONE` → `NEGATIVATED` → `REGULARIZED`. A coluna "Etapa da régua" do dashboard F5 fica com três
badges, não seis.

**Contradição declarada com `mvp-045`, para não ser reimplementada por engano.** Esta emenda
contraria diretamente a **decisão fechada #1** da spec ("Régua própria e configurável substitui a
régua nativa Asaas — a régua nativa descrita no mvp-04 é abandonada"). Também tornam-se **void**:
R3, R4, R5 (etapas D-5/D+3/D+10), R9 (`DunningConfig.active`), a parte de R1 que filtra por
`Unit.dunningConfig.active`, as cinco primeiras linhas da tabela de confronto §3, a Fatia 1 na
parte de `DunningConfig`, e a tela de settings da Fatia 5 (os 4 campos numéricos + toggle deixam de
ter o que configurar). R2, R6, R7, R8, R10-R18 seguem válidos, com `DunningConfig.negativationDaysAfter`
lido como `NEGATIVATION_DAYS_AFTER_OVERDUE`. **A spec `mvp-045` não foi editada** (fora do escopo
deste ADR) — quem for implementar deve ler este ADR como a fonte que prevalece, e não recriar
`DunningConfig` a partir da spec.

**O que esta emenda NÃO toca:** os quatro pontos de design não triviais (a/b/c/d), o índice
`@@index([unitId, dueDate])`, as duas divergências D1/D2, e as ⚠️ sobre `PAID→REGULARIZED` e o
achado de `webhook.service.ts:87`. Nenhum deles dependia de `DunningConfig`.

## Gate 2 — respondido por Rafa em 2026-09-22

1. **`DunningAction` com 2 valores** (`NEGATIVATION`/`CANCELLATION`) — **confirmado**. Enum menor,
   como proposto pelo `system-architect`.
2. **Sem kill-switch de negativação por escola** — **confirmado, OK pro MVP**. Negativação sempre
   habilitada (D+60), sem toggle por `Unit`. Vira ticket novo se a necessidade for real.
3. **Janela de ~59 dias sem contato próprio** — **superada pela Emenda 2**: a pergunta 3 revelou
   que a negativação é manual, não automática, então "janela sem contato" deixa de ser o ponto
   certo — o que existe agora é "janela sem contato até o orientador decidir agir", que é aceito
   por design (ver Emenda 2).

## Emenda 2 (2026-09-22) — negativação é ação manual do orientador, não automática por cron

**Origem: decisão de produto do Rafa, resposta à pergunta 3 do Gate 2 original.** Ao perguntar
sobre a janela sem contato entre o aviso nativo e a negativação automática, a resposta do Rafa
revelou uma mudança maior do que a pergunta antecipava: **"o que devemos fazer é aparecer após 60
dias a opção do orientador negativar. Mas ele irá clicar no botão de negativar, sendo a decisão
dele."** Confirmado explicitamente: o sistema só **habilita** a ação em D+60 (calcula que a Invoice
está elegível); o `POST /paymentDunnings` só é disparado quando um humano clica.

Isso reverte a premissa central de `mvp-045` (negativação automática via cron, "sem intervenção
humana", `actorId` tipicamente `null`) de volta para o comportamento de `mvp-05-negativacao.md`
(SUPERSEDED até esta emenda) — **mas só na parte de "quem decide negativar"**. A régua de avisos
nativa (Emenda 1) e o prazo fixo D+60 (em vez do D+15 de `mvp-05`) continuam como decidido.

**O que muda no design:**

- **Não existe cron que chama `POST /paymentDunnings` automaticamente.** Existe, no máximo, um
  job/query que calcula diariamente (ou em tempo real, sem persistir estado — a decidir no
  `feature-architect` do EDU-73) quais Invoices `OVERDUE` passaram de D+60, para popular a UI
  ("elegível para negativar"). Nenhuma escrita em `Dunning`/`DunningLog` acontece nessa varredura.
- **`Dunning.actorId` deixa de ser tipicamente `null`.** Como toda negativação agora nasce de um
  clique, `actorId` (`clerkUserId` de quem clicou) é preenchido **sempre** que uma linha `Dunning`
  é criada. O campo continua `String?` no schema (nullable) — não vira obrigatório — porque a
  nulidade ainda é o mecanismo correto para expressar "automático" se algum fluxo automático voltar
  a existir no futuro (ver ponto (d) da seção de design, que não muda). Mas na prática de hoje, o
  código do EDU-73 sempre vai preencher esse campo.
- **`DunningAction.NEGATIVATION`** passa a ser registrado no `DunningLog` como resultado de uma
  ação de API disparada pelo clique (`POST /api/invoices/:id/negativar` ou rota equivalente, a
  definir no EDU-73), não de um cron. O guard de idempotência (D1, "success") continua igual — só
  muda quem inicia a chamada.
- **O título do ticket EDU-73 ("Negativação automática cron + webhook") está desatualizado** — a
  parte de webhook (baixa automática ao `PAYMENT_RECEIVED`, regra R17) continua automática e válida;
  só a parte de "cron dispara a negativação" deixa de existir. Renomear/reescopar o ticket é parte
  do Task Contract do EDU-73, não deste ADR.

**O que esta emenda NÃO muda:** todos os pontos de schema já decididos — `Dunning`, `DunningLog`,
extend `InvoiceStatus`, `Guardian.dunningOptOut`, os 4 pontos de design (a/b/c/d), o índice
`[unitId, dueDate]` (continua necessário — agora para popular a lista de "elegíveis" na UI, em vez
de para o cron decidir sozinho), e o enum `DunningAction` de 2 valores (Emenda 1, confirmado no
Gate 2). A régua nativa Asaas para avisos (Emenda 1) também não muda.

## Emenda 3 (2026-09-22) — `DunningLog.result` vira enum, não mais `String` livre

**Origem: revisão de spec-compliance (pergunta do Rafa sobre a decisão original).** D1 justificava
não usar `@@unique([invoiceId, action])` — uma decisão correta sobre a **chave** de idempotência,
que precisa permitir múltiplas tentativas (retry de falha). Mas a v1/v2 deste ADR estendeu esse
mesmo raciocínio ao **tipo do campo `result`**, deixando-o `String` livre "porque enum quebraria o
retry" — e essa segunda parte não se sustenta: as duas decisões são ortogonais. Nenhuma delas
depende da outra.

**Por que são ortogonais.** O que o retry precisa é poder gravar uma segunda linha em
`DunningLog` (mesma `invoiceId`+`action`) sem colidir com a primeira — isso é resolvido só pela
ausência de `@@unique`. O *tipo* de `result` nessa segunda linha pode ser um enum de 2 valores sem
afetar em nada essa capacidade: `ERROR` continua gravável quantas vezes for preciso, exatamente
como `"error: ..."` gravava. Nada em `@@unique` versus enum se toca.

**O problema real que ficou sem endereçamento na v1/v2.** O comentário no schema dizia
"vocabulário canônico: `"success"` | `"error: <msg>"`" — mas isso é convenção de comentário, sem
constraint de banco. Se o `code-implementer` do EDU-73 gravar `"Success"` (maiúscula), `"sent"`,
ou qualquer variação, o guard de idempotência (`result === "success"`) nunca casa, e a negativação
é retentada indevidamente — silenciosamente, a R$ 9,90 por repetição (mesmo cenário que D1 já
descrevia como risco, sem notar que o próprio design escolhido não o mitigava).

**Decisão:** `result` vira `enum DunningLogResult { SUCCESS, ERROR }`. A mensagem de erro (antes
concatenada em `"error: <mensagem>"`) migra para um campo novo, `errorDetail String?`, preenchido
só quando `result = ERROR`. Isso:
- Move o guard de idempotência de comparação de string literal para comparação de enum, verificada
  em tempo de compilação pelo Prisma Client — um typo no service vira erro de build, não bug
  silencioso em produção.
- Preserva 100% da flexibilidade de retry que D1 já garantia (nenhuma mudança em `@@unique`).
- Separa "o que aconteceu" (`result`, estruturado) de "por que" (`errorDetail`, texto livre e sem
  PII) — mais fácil de agregar/filtrar no futuro (ex.: dashboard de erros de negativação) do que
  fazer parsing de prefixo `"error: "` em uma coluna de texto.

**O que esta emenda NÃO muda:** a ausência de `@@unique([invoiceId, action])` (D1's argumento
original sobre a chave continua correto e intacto), os 4 pontos de design (a/b/c/d), as Emendas 1
e 2, e qualquer outro campo do schema. É uma correção pontual e local ao tipo de um campo.

**Migration:** como esta migration (`add_dunning`) ainda não foi aplicada em produção nenhuma vez
(gerada só com `--create-only`, nunca `deploy`), o campo foi corrigido no mesmo arquivo de
migration em vez de empilhar uma segunda migration para uma feature que ainda não existe em
produção — mais limpo para quem for ler o histórico depois.

## Anexo A — Bloco Prisma final (pronto para `prisma/schema.prisma`)

> Valores conferidos contra `mvp-045` §4 e `SCHEMA-CONSOLIDADO` §2.2, com D1 e D2 aplicados, a
> Emenda 1 (sem `DunningConfig`, `DunningAction` com 2 valores), a Emenda 2 (negativação manual,
> `actorId` sempre preenchido na prática) e a Emenda 3 (`DunningLog.result` como enum) incorporadas.
> `Enrollment.dunningPaused` **já existe** (`schema.prisma:257`) e não aparece abaixo — não recriar.

```prisma
// ─── Enums novos ──────────────────────────────────────────────────────────────

enum DunningAction {
  NEGATIVATION // negativação MANUAL (orientador clica; elegível a partir de D+60) — Emenda 2
  CANCELLATION // baixa da negativação (DELETE /paymentDunnings ou pagamento recebido)
  // SEM REMINDER/WARNING1/WARNING2 (ADR-0008 Emenda 1, confirmado Gate 2): o timing dos avisos
  // pré-negativação é da régua nativa do Asaas (D-3/D0/D+1, nível de subconta) — nenhum código
  // nosso os escreve.
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

enum DunningLogResult {
  SUCCESS // etapa concluída — guard de idempotência (R2/R8) pula re-disparo quando já SUCCESS
  ERROR // etapa falhou — DunningLog.errorDetail carrega a mensagem curta (sem PII); pode ser
  // retentada no próximo cron, já que não há @@unique([invoiceId, action]) bloqueando
}

model DunningLog {
  id          String           @id @default(cuid())
  unitId      String
  invoiceId   String
  action      DunningAction
  // Guard de idempotência (R2/R8) compara contra DunningLogResult.SUCCESS — verificado em tempo
  // de compilação, não mais string literal (ADR-0008 Emenda 3). errorDetail carrega a mensagem
  // curta e sem PII, só preenchida quando result = ERROR.
  result      DunningLogResult
  errorDetail String? // só preenchido quando result = ERROR; nunca contém PII

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  // SEM @@unique([invoiceId, action]) — proposital (ADR-0008 (a)): idempotência é regra de
  // negócio no service, e a constraint impediria o retry de etapa falha exigido por R13/R14.
  // Ortogonal ao tipo de `result` (Emenda 3) — nenhum dos dois exige o outro.
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
  warningSentAt DateTime? // quando o Asaas confirmou o aviso CDC (10 dias antes, ~D+50).
  //                         NÃO é um dos avisos D-3/D0/D+1 da régua nativa — mecanismo distinto.
  requestedAt   DateTime? // quando POST /paymentDunnings foi confirmado
  resolvedAt    DateTime? // quando a baixa foi dada ou o pagamento recebido

  // clerkUserId de quem clicou "negativar" (ADR-0008 (d) + Emenda 2). Nullable por design (uma
  // futura negativação automática usaria null), mas na prática atual é SEMPRE preenchido — toda
  // negativação hoje nasce de um clique do orientador, nunca de um cron.
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
//   dunningOptOut Boolean @default(false) // negativação NUNCA ocorre para este responsável (R8)

// ─── Adicionar ao model Invoice existente (schema.prisma:312) ─────────────────
// Relações inversas, junto a `payments   Payment[]`:
//
//   dunning     Dunning?
//   dunningLogs DunningLog[]
//
// Índice novo, junto aos existentes (ver seção de índices deste ADR):
//
//   @@index([unitId, dueDate]) // ADR-0008 — varredura diária do cron de negativação
//
// NÃO adicionar @@index([unitId, paidAt]) — fica para a migration de dashboard (f2-01).

// ─── Adicionar ao model Unit existente (schema.prisma:76) ─────────────────────
// Relações inversas, junto a `payments  Payment[]`:
//
//   dunnings    Dunning[]
//   dunningLogs DunningLog[]
//
// SEM dunningConfig — o model não existe (ADR-0008 Emenda 1).
```

**Constante de negócio (não é schema — `src/lib/dunning.ts`, arquivo novo):**

```typescript
// Prazo fixo de negativação, contado a partir do vencimento da Invoice.
// Decisão de produto (Rafa, 2026-09-22) — ADR-0008 Emenda 1. Igual para toda escola:
// não é configurável por Unit, por isso é constante e não coluna.
// Os avisos pré-negativação (D-3/D0/D+1) são da régua nativa do Asaas, não daqui.
export const NEGATIVATION_DAYS_AFTER_OVERDUE = 60
```

**Migration:** `prisma/migrations/YYYYMMDDHHMMSS_add-dunning/` (padrão do repo). Puramente aditiva —
nenhuma coluna existente vira `NOT NULL`, nenhum `DROP`. O booleano novo entra com
`@default(false)`, então não exige backfill.

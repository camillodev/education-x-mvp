# ADR-0007: Emissão híbrida — `POST /payments` na 1ª competência, `subscriptions` a partir da 2ª

**Status:** Accepted (Gate 2 — Rafa, 2026-09-08)
**Data:** 2026-09-08

## Contexto

A emissão hoje (`emitInvoice()`, `src/lib/services/billing.service.ts`) cria uma `Invoice` local
e um `POST /payments` avulso na Asaas por `Enrollment`/competência, para todas as competências,
via cron. A Asaas oferece `subscriptions` nativo (`cycle: MONTHLY` + `nextDueDate`), que geraria
as cobranças futuras sem chamada nossa a partir da criação.

Esta decisão nasceu de duas frentes: (1) uma dúvida de robustez arquitetural — será que emissão
100% própria é a escolha certa; e (2) uma preocupação explícita do Rafa sobre **conformidade** —
"queremos seguir à risca o que é documentado e sugerido pela Asaas, evitando problemas com
terceiros", e um princípio orientador mais forte que emergiu na discussão: **não fazer gestão de
cobrança que a Asaas já resolve nativamente — usar o modelo deles onde ele já resolve um
problema nosso, e só manter lógica própria onde a Asaas genuinamente não cobre**.

A investigação passou por duas rodadas de análise (`system-architect`, verificação direta do
schema OpenAPI via MCP `asaas-docs`) e terminou com o Rafa decidindo o desenho final. Este
documento registra a decisão fechada, não uma proposta aberta.

## Decisão

**Modelo híbrido, por `Enrollment`:**

1. **1ª competência de cada `Enrollment`** (ou qualquer competência que exija RN-10 rolar o
   vencimento por `dueDay` já ter passado) → `POST /payments` avulso, como hoje. Cobre RN-14
   (proporcional), RN-15 (`FREE_FIRST_MONTH`), e a decisão nova de RN-10 abaixo.
2. **A partir da 2ª competência "limpa"** (a que não precisa de rolagem) → `POST /subscriptions`
   com `cycle: MONTHLY` e `nextDueDate` = vencimento do próximo ciclo. A Asaas assume a geração
   das cobranças seguintes.
3. **`dueDay` fica imutável no MVP.** Uma vez definido para a `Unit`, não há tela/fluxo que
   permita alterá-lo. Isso elimina a única falha real identificada na análise: se `dueDay` fosse
   editável, a mudança afetaria todas as `Enrollment`s de uma escola de uma vez
   (`BillingConfig` é `@unique` por `unitId`), e cada `subscription` já criada ficaria com um
   `nextDueDate`/offset de competência dessincronizado do novo `dueDay`, sem nada detectar.
   Travando a edição, essa classe de bug deixa de poder existir.
4. **RN-10 (rolagem) sempre sai como avulso, nunca dentro de uma `subscription` já criada.** Se
   uma competência cair depois do `dueDay` (matrícula tardia, atraso de processamento), ela vira
   `payment` avulso com vencimento curto (`dueDate = D+7`), e uma `subscription` nova é criada
   com `nextDueDate` já apontando pro próximo ciclo "limpo". Isso mantém cada `subscription`
   sempre alinhada 1:1 com `referenceMonth`, sem precisar de um offset guardado no `Enrollment`
   para recuperar a competência a partir do `dueDate` do evento.
5. **Geração antecipada da cobrança em 14 dias** (não os 40 padrão da Asaas) — parâmetro de
   configuração da `subscription`, escolhido para reduzir a janela de incerteza sem gerar
   cobrança longe demais do vencimento real.
6. **Cancelamento (`Enrollment.cancelledAt`) aciona `DELETE /subscriptions/{id}`.** A Asaas
   remove cobranças pendentes/vencidas da assinatura ao cancelar — comportamento aceito
   conscientemente: o histórico de `Invoice`s já pagas permanece no nosso banco de qualquer
   forma, então não há perda de rastro fiscal.
7. **A `Invoice` de cada ciclo gerado pela `subscription` nasce reativamente**, no momento em
   que o webhook `PAYMENT_CREATED` chega com o `payment.id` daquele ciclo — não é mais criada
   proativamente por nós como hoje. `payment.id` (não `externalReference`, que é fixo por
   `subscription` inteira, não por ciclo) vira a chave persistida em `Invoice.asaasPaymentId`.

## Por que o híbrido (não avulso puro, não `subscriptions` pura)

**Avulso puro (o modelo anterior a este ADR) tem um custo real que o princípio do Rafa não
aceita mais como padrão:** pagamos uma chamada de API por `Enrollment`/mês para algo que a
própria Asaas já resolve de graça a partir da 2ª competência, quando o valor já é fixo
(`finalPriceCents`, RN-08/RN-09) e não há mais rolagem a decidir.

**`subscriptions` pura (criar a assinatura já na matrícula, incluindo a 1ª competência) foi
descartada** pelos mesmos motivos que sempre existiram: a 1ª competência frequentemente precisa
de proporcional (RN-14) ou isenção (RN-15), que não são valores que a Asaas gera sozinha — o
recipe oficial de "valor variável" da Asaas é uma correção pós-geração (gera com o valor padrão,
você corrige depois via `PUT /payments/{id}`, antes do pagamento), não definição na criação. Usar
isso já na 1ª competência criaria uma janela em que um boleto com valor errado existe e pode ser
pago antes da correção.

**O híbrido é o ponto de equilíbrio:** a 1ª competência (onde a Asaas genuinamente não resolve —
proporcional, isenção, rolagem) continua sendo nossa; a partir da 2ª (onde o valor é fixo e a
Asaas resolve nativamente), delegamos pra ela.

## Consequências

✅ **Reduz chamadas de API nossas** para o caso comum (matrícula sem desconto que muda, maioria
das competências). Cai de ~1 chamada/`Enrollment`/mês para 1 chamada de criação de
`subscription`, feita uma vez.

✅ **`dueDay` travado no MVP remove a única falha de sincronização real identificada** — sem
edição, não existe cenário de N `subscriptions` ficando desalinhadas de uma vez.

✅ **RN-14, RN-15 continuam expressáveis em código nosso**, porque continuam vivendo no caminho
avulso da 1ª competência — nada muda aí.

✅ **RN-10 nunca precisa de heurística de recuperação de `referenceMonth` a partir de
`payment.dueDate`.** A rolagem é sempre resolvida antes de qualquer `subscription` existir para
aquela competência — a `subscription`, quando criada, sempre corresponde a um ciclo "limpo".

✅ **O estado `BLOCKED` deixa de poder existir — não é troca de nome, é remover a causa.** A
investigação mostrou que a janela real é entre a matrícula ser aceita (CPF já validado em
`GuardianStepSchema`, obrigatório) e a escola aprovar a matrícula (que é quando
`asaasCustomerId` é de fato criado na Asaas, ver EDU-15). Decisão do Rafa: **nem `Invoice` nem
`subscription` devem ser criadas antes de `asaasCustomerId` existir** — a dependência é
verificada antes de chamar `emitInvoice`/criar a `subscription`, não depois. Isso exige um filtro
adicional em `emitBatchInvoices` (`src/lib/services/billing.service.ts:194`, hoje filtra só
`status: 'ACTIVE'`, não `guardian.asaasCustomerId != null`) e equivalente no cron — mudança de
implementação separada deste ADR, mas decidida aqui como consequência direta do modelo. Sem essa
lacuna, o ramo `BLOCKED` de `emitInvoice` (linhas 104, 121-122) e o contador `result.blocked`
(linha 175) ficam mortos e devem ser removidos quando a implementação acontecer — não deixar
código morto por trás.

⚠️ **O vínculo `Invoice ↔ payment` deixa de ser sempre proativo.** Para a 1ª competência, nada
muda — `Invoice` continua sendo criada antes da chamada à Asaas, com o guard de
`idempotencyKey @unique` intacto. Para os ciclos gerados por `subscription`, a `Invoice` nasce
reativamente ao webhook `PAYMENT_CREATED`. Isso significa que, nesse trecho específico, deixamos
de ter uma reserva local que impede a cobrança de existir — passamos a reconciliar depois que ela
já foi gerada pela Asaas. Aceito conscientemente: é a mesma troca de responsabilidade que
justifica usar `subscriptions` em primeiro lugar — delegar a geração é delegar também esse
controle específico.

⚠️ **Handler de webhook de cobrança (`PAYMENT_CREATED`, `PAYMENT_RECEIVED`, etc.) precisa existir
antes de qualquer `subscription` entrar em produção.** Hoje não existe rota de webhook
implementada — é pré-requisito de implementação, não deste ADR em si.

## O que fica fora de escopo deste ADR

- Régua de avisos (notificações automáticas) e negativação (`POST /paymentDunning`) — recursos
  nativos da Asaas que funcionam igual independente do modelo de emissão escolhido aqui.
- Implementação do filtro `guardian.asaasCustomerId != null` em `emitBatchInvoices`/cron, e a
  remoção do ramo `BLOCKED` morto em `emitInvoice` — decidido aqui, implementado à parte
  (Task Contract próprio, passa por `code-implementer` + `test-writer`).
- Implementação do handler de webhook em si — depende deste ADR, mas não é parte dele.

## Verificação pendente antes de implementar

Conforme `.claude/rules/asaas.md`: confirmar em sandbox, via MCP, que:
1. `PAYMENT_CREATED` de fato dispara para cobranças geradas automaticamente por `subscription`
   (não só para `payments` avulsos), com `payment.subscription` preenchido.
2. O parâmetro de antecedência de geração (14 dias) é configurável por `subscription` ou só por
   conta — se for só por conta, isso é uma configuração de conta a fazer uma vez, não por
   chamada de criação.

## Fontes

- [Guia de Cobranças](https://docs.asaas.com/docs/guia-de-cobrancas) — `payments` avulso
  recomendado para "mensalidades controladas pela sua aplicação"
- [Introdução — Assinaturas](https://docs.asaas.com/docs/assinaturas) — geração gradual de
  cobranças, 40 dias padrão configurável para 14/7
- [FAQ — Assinaturas](https://docs.asaas.com/docs/faq-assinaturas)
- [Eventos para cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas) — payload de
  `PAYMENT_CREATED`, campos `payment.id`/`payment.subscription`
- [Como implementar idempotência em Webhooks](https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks) —
  dedup por `id` do evento, não por `externalReference`
- Recipe oficial "Configure uma assinatura com valores variáveis" — confirma que ajuste de valor
  é correção pós-geração (`GET /subscriptions/{id}/payments` → `PUT /payments/{id}`), não
  definição na criação
- Schema OpenAPI oficial (`SubscriptionSaveRequestDTO`, `PaymentGetResponseDTO`) — confirma que
  `externalReference` é fixo por `subscription`, não distinto por ciclo gerado
- `docs/api-contracts/asaas-modelos-cobranca.md` (este repo, se existir na branch — verificar)
- ADR-0003 (cliente tipado Asaas) — este ADR estende, adicionando `createSubscription`/
  `updateSubscription`/`deleteSubscription` ao escopo do `AsaasClient`

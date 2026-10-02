# Épico 06 — Planos da Escola e Cancelamento

> **Prioridade:** P1 (base do cálculo de cobrança) · **Doc-mãe:** [00-visao.md](./00-visao.md)
> **Status:** 🟡 Aguardando aprovação
> **MVP:** matéria+valor e planos por período são base da cobrança (entram). Cancelamento com
> multa automática e suspensão avançada = pós-MVP.
> **Entrega:** cada escola cadastra seus planos (mensal/trimestral/semestral/anual) com
> regras próprias de cancelamento e multa. O cancelamento de um responsável encerra a
> matrícula e cobra a multa devida automaticamente.

---

## Por que este épico

A cobrança (Épico 01) precisa saber **quanto** e **com que recorrência** cobrar — isso vem
do plano. E quando um responsável sai antes do fim (ex: cancela um anual no mês 3), a escola
precisa cobrar a multa contratual. Sem planos e regras de cancelamento, a cobrança não tem
base e o cancelamento vira negociação manual.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 6.1 — Cadastrar matérias, valores e planos da escola (no onboarding)

> **User story**
> Como **admin IX / Orientadora**, quero cadastrar as matérias com seus valores e os planos
> por período, para que as cobranças usem o valor e a periodicidade corretos.

**Modelo decidido (matéria + valor fixo, configurável por escola):**
- Cada escola cadastra suas **matérias/disciplinas**, cada uma com um **valor fixo**.
- No Kumon, todas as matérias têm o mesmo valor (configura igual), mas o modelo suporta
  valores diferentes por matéria (para Wizard e outras).
- A mensalidade do aluno = soma das matérias que ele cursa (× recorrência do plano).
- **Desconto por volume:** escola pode dar desconto se o responsável contrata 2+ matérias
  (config opcional).

**Recorrências do MVP:** **mensal, trimestral, semestral, anual** (todas no MVP).

**Critérios de aceite**
- [ ] No onboarding, cadastro as matérias da escola, cada uma com seu valor.
- [ ] Aprendo a alterar os valores das matérias depois (a escola ajusta sozinha).
- [ ] Cadastro planos por recorrência: mensal, trimestral, semestral, anual.
- [ ] A mensalidade é calculada como soma das matérias do aluno (× período do plano).
- [ ] Posso configurar desconto por volume (2+ matérias) — opcional.
- [ ] Os planos ficam disponíveis na matrícula — o responsável escolhe matérias + plano.

---

### Feature 6.2 — Cancelamento (MVP sem multa automática, com cobrança extra opcional)

> **User story**
> Como **Orientadora**, quero cancelar uma matrícula encerrando as cobranças futuras, e
> poder gerar uma cobrança extra manualmente se a escola quiser cobrar multa.

**Decisão MVP:** **sem multa automática**. O cancelamento encerra a matrícula e para as
cobranças futuras. Se a escola quiser cobrar multa, gera uma **cobrança extra manual**
(reusa a emissão avulsa do Épico 01). O cálculo automático de multa fica para fase 2.

**Critérios de aceite**
- [ ] Cancelar uma matrícula encerra as cobranças recorrentes futuras.
- [ ] **Não** há multa automática no MVP.
- [ ] A Orientadora pode gerar uma **cobrança extra** (boleto/PIX) manualmente, se quiser cobrar multa ou pendência.
- [ ] Assinaturas de cartão recorrente vinculadas são canceladas na Asaas.
- [ ] O cancelamento fica auditado (quem, quando, motivo).
- [ ] **Fase 2 (futuro):** regra de multa automática por plano, respeitando limite legal (CDC).

---

### Feature 6.3 — Pro-rata na entrada e na saída

> **User story**
> Como **Orientadora**, quero que alunos que entram ou saem no meio do período paguem
> proporcional aos dias usados, seguindo a prática do mercado e a lei brasileira.

**Decisão:** pro-rata na **entrada e na saída** (proporcional aos dias). Segue a prática
da lei brasileira (cobrança proporcional ao serviço efetivamente prestado).

**Critérios de aceite**
- [ ] Aluno que entra no meio do período paga proporcional aos dias restantes.
- [ ] Aluno que cancela no meio do período tem o valor ajustado proporcionalmente (abate dias não usados).
- [ ] O cálculo de pro-rata é uma função pura, testável (reusa lógica de pro-rata já existente no projeto).

> **Reuso:** o projeto já tem lógica de pro-rata no billing (`specs/cobranca` menciona
> `proRataThresholdDay`, `proRataMode`). Reaproveitar.

---

### Feature 6.4 — Suspensão da Escola por inadimplência com a IX

> **User story**
> Como **admin da Education X**, quero suspender os serviços de uma escola que não nos paga,
> para interromper o uso da plataforma após o período de tolerância.

**Cobrança IX→Escola é operacional (não software):** a IX cobra a escola pelo painel Asaas
(D16). Aqui o sistema só precisa de um **flag de suspensão** que pausa os processos da escola.

**Critérios de aceite**
- [ ] Admin IX pode marcar uma escola como **suspensa** (toggle manual).
- [ ] Escola suspensa → processos de cobrança dela com os responsáveis são **pausados** (não emite, não negativa, não envia régua).
- [ ] Admin IX pode reativar a escola quando ela regularizar.
- [ ] **Pós-MVP:** automação de suspensão (cron que lê pagamento Asaas da IX e suspende após 30 dias) — no MVP é manual.

> A regra de "30 dias após o último pagamento" é a política comercial; a **automação** dela
> é pós-MVP. No MVP, o admin IX suspende/reativa manualmente.

---

## Parte 2 — Subsection técnica

### 2.1 — Planos e recorrência
- Recorrência mapeia para o ciclo Asaas em assinaturas (`cycle: MONTHLY | QUARTERLY | SEMIANNUALLY | YEARLY`) ou para emissão por parcelas.
- Mensal → emissão no fechamento (Épico 02). Anual/semestral/trimestral → parcelas ou cobrança única conforme o plano.

### 2.2 — Matérias, valores e pro-rata
- `Subject` por escola, cada uma com `priceCents`. Mensalidade = soma das matérias do aluno.
- Desconto por volume opcional (`Plan.volumeDiscount`).
- **Pro-rata entrada/saída:** função pura `computeProRata(plan, startOrEndDate, referencePeriod)`
  → reusa lógica existente do billing. Testável isoladamente.
- **Multa de cancelamento:** **fora do MVP**. Cancelamento não calcula multa automática;
  escola gera cobrança extra manual (emissão avulsa, Épico 01). Fase 2: `computeCancellationFee`
  respeitando teto legal (CDC).

### 2.3 — Suspensão da escola (flag manual no MVP)
- `Unit.suspended` (boolean) + `suspendedAt`. Toggle manual pelo admin IX.
- **Guard global:** todo cron/serviço de cobrança e negativação verifica `Unit.suspended`
  antes de agir — escola suspensa não emite, não negativa, não envia régua.
- **Pós-MVP:** cron que lê o pagamento da IX no Asaas e automatiza a suspensão (30 dias).
  A cobrança IX→Escola em si é feita no painel Asaas (não é software nosso — D16).

### 2.4 — Schema Prisma

```prisma
enum PlanRecurrence { MONTHLY QUARTERLY SEMIANNUAL ANNUAL }

model Subject {            // matéria/disciplina com valor (já pode existir — confirmar)
  id         String  @id @default(cuid())
  unitId     String
  name       String
  priceCents Int            // valor fixo da matéria (Kumon: todas iguais)
  isActive   Boolean @default(true)
  @@index([unitId])
}

model Plan {
  id             String         @id @default(cuid())
  unitId         String
  name           String
  recurrence     PlanRecurrence
  volumeDiscount Json?          // desconto por nº de matérias (opcional): { minSubjects, percent }
  isActive       Boolean        @default(true)
  @@index([unitId])
  // sem cancellationPolicy no MVP — multa é cobrança extra manual
}

model Enrollment {
  planId        String?
  cancelledAt   DateTime?
  cancelReason  String?
  // sem cancelFeeId no MVP — multa não é automática
}

model Unit {
  suspended         Boolean   @default(false) // toggle manual admin IX (MVP)
  suspendedAt       DateTime?
}
```

### 2.5 — Testes (≥80%)
- `computeCancellationFee`: anual mês 3 com regra "2 mensalidades" → valor correto; mensal → zero.
- Cancelamento: encerra matrícula, cancela assinatura Asaas, gera Invoice de multa.
- Suspensão: 30 dias sem pagamento IX → suspended=true; cobranças pausadas; reativa ao pagar.
- Cron de cobrança respeita `Unit.suspended` (não emite para escola suspensa).

---

## ✏️ Decisões para você editar

### Q1 — Planos: catálogo fixo ou livre por escola?
✅ **Decidido:** cada escola cadastra **matéria + valor fixo** no onboarding e monta seus
planos por período (mensal/tri/sem/anual). Aprendemos a escola a alterar valores depois.

### Q2 — Multa de cancelamento
✅ **Decidido (MVP):** **sem multa automática**. Cancelamento encerra a matrícula; escola
gera cobrança extra manual se quiser cobrar. Cálculo automático (respeitando teto CDC) = fase 2.

### Q5 — Pro-rata
✅ **Decidido:** pro-rata na **entrada e na saída** (proporcional aos dias), seguindo a lei.

### Q6 — Desconto por volume (2+ matérias)
A escola pode dar desconto por contratar 2+ matérias. Confirma que entra no MVP?
- [ ] Sim — config opcional por plano
- [ ] Não — fase 2
- **Sua resposta:** _______________

### Q3 — Cobrança da escola pela IX
✅ **Decidido:** feita no **painel Asaas** (operacional, não software — D16). O sistema só
tem o flag `Unit.suspended` para pausar escola inadimplente.

### Q4 — Suspensão
✅ **Decidido (MVP):** flag manual pelo admin IX. Automação dos 30 dias = pós-MVP.

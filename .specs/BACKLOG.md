# BACKLOG — Education X MVP

> Backlog consolidado das specs 02–09 da Education X, fatiado em tasks de ≤400 linhas, cada uma com DoD binário (exit 0). Ordenado por **dependência de schema** (a cadeia de models manda), agrupado em 6 ondas. Cada task é um Task Contract independente, pronto pro board Multica → Claude Code.

---

## Decisões pendentes (Rafa decide antes de codar)

- **[EDX-DEC-01] Pricing dos planos IX (Básico / Crescimento / Pro)** — `P0`. Hoje é **MOCK** na spec 09 (constantes `39900 / 59900 / 79900` centavos). Rafa precisa definir os valores reais antes de EDX-26/EDX-27 irem pra produção. Bloqueante pro billing da plataforma, não pra implementação (mock destrava o dev).
- **[EDX-DEC-02] Conflito de shape do `Enrollment` (spec 02 vs 03)** — `P0`. **A spec 02 (Matrícula) é a DONA do shape.** Schema canônico = spec 02 Fatia 1: `plan` (enum `EnrollmentPlan`), `status` (enum `EnrollmentStatus`), `discountType?` / `discountValueBp?` / `discountValueCents?`, `agreedPriceCents`, `finalPriceCents`. A spec 03 propõe uma versão simplificada (`discountCents` único + `planType`) — **descartada**. A 03 apenas **referencia** Enrollment, não redefine. Billing (spec 03) lê `finalPriceCents` e aplica desconto via os campos da 02. Confirmar com Rafa que `EnrollmentPlan` cobre os planos de cobrança (MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL) — provavelmente sim, mesmos valores.
- **[EDX-DEC-03] Fluxo manual — dupla aprovação** — `P1`. **DECIDIDO.** Fluxo manual usa **dupla aprovação**: orientador cadastra → Enrollment fica `PENDING_CONFIRMATION` → responsável recebe link por email → revisa e edita apenas dados pessoais (nome/CPF/email/telefone do responsável + nome/data de nascimento do aluno; matéria/plano/valor travados) → aceita termos → status passa a `AWAITING_SCHOOL_APPROVAL` → escola aprova → `ACTIVE`. A edição do responsável sobrescreve o que o orientador digitou nos dados pessoais. **Não é PENDING como default genérico — é fluxo de dupla aprovação intencional.**
- **[EDX-DEC-04] NFS-e via proxy ou redirect direto do Asaas (spec 04/07)** — `P2`. A URL do PDF/XML do Asaas é exposta ao cliente ou proxificada pelo servidor? Recomendação: proxy com validação de sessão. Rafa decide se vale o custo.
- **[EDX-DEC-05] Re-auth Clerk para ações fiscais/sensíveis (spec 09 / P-04)** — `P2`. Hoje **SKIP** (Admin já logado). Revisitar se Rafa exigir 2FA pra editar dados bancários/fiscais.

---

## Tabela-resumo

| ID | Onda | Título | Prio | Depende de |
|----|------|--------|------|------------|
| EDX-01 | 0 | Schema: Student + Enrollment (DONO do shape) | P0 | — |
| EDX-02 | 0 | E2E do onboarding faltante (spec 01) | P1 | — |
| EDX-03 | 1 | API: fluxo link (GET + POST submit) | P1 | EDX-01 |
| EDX-04 | 1 | UI mobile: fluxo link (4 passos + confirmação) | P1 | EDX-03 |
| EDX-05 | 1 | UI desktop: fluxo manual (orientador, PENDING) | P1 | EDX-03 |
| EDX-06 | 1 | Link de confirmação do responsável | P1 | EDX-05 |
| EDX-07 | 2 | Infra: Webhook Asaas base (receiver `/api/webhooks/asaas`) | P0 | EDX-01 |
| EDX-08 | 2 | Schema: Invoice + Payment (Student/Enrollment já existem) | P0 | EDX-01 |
| EDX-09 | 2 | BillingService: emitMonthlyInvoices | P0 | EDX-08 |
| EDX-10 | 2 | Endpoint cron + agendamento Vercel | P0 | EDX-09 |
| EDX-11 | 2 | Webhook Asaas: reconciliação de pagamento | P0 | EDX-07, EDX-08 |
| EDX-12 | 2 | UI: Lista de cobranças (C3) | P1 | EDX-09 |
| EDX-13 | 2 | UI: Detalhe da cobrança (C4) | P1 | EDX-12 |
| EDX-14 | 3 | NfseConfig + coleta alíquota ISS/regime | P0 | EDX-08 |
| EDX-15 | 3 | Emitir NFS-e ao receber pagamento | P1 | EDX-14, EDX-11 |
| EDX-16 | 3 | Receber confirmação NFS-e + exibir PDF/XML | P1 | EDX-15 |
| EDX-17 | 3 | Schema: Dunning + enum DunningStatus | P0 | EDX-08 |
| EDX-18 | 3 | Tipos Asaas: AsaasCreateDunningPayload + AsaasDunning | P0 | — |
| EDX-19 | 3 | DunningService (criar, opt-out, elegibilidade, baixa) | P1 | EDX-17, EDX-18 |
| EDX-20 | 3 | API routes POST /dunnings + PATCH /dunnings/[id] | P1 | EDX-19 |
| EDX-21 | 3 | UI: painel negativação + modais | P1 | EDX-20 |
| EDX-22 | 3 | Webhook Asaas dunning + reconciliação | P2 | EDX-19, EDX-20, EDX-07 |
| EDX-23 | 4 | Migration: índices de agregação (dashboard) | P0 | EDX-08, EDX-17 |
| EDX-24 | 4 | Service: KPIs + RecoveryHero | P0 | EDX-23 |
| EDX-25 | 4 | Service: 4 relatórios | P1 | EDX-23 |
| EDX-26 | 4 | Service: Extrato + reconciliação Asaas | P1 | EDX-23 |
| EDX-27 | 4 | API + UI Dashboard (KPIs + RecoveryHero) | P1 | EDX-24 |
| EDX-28 | 4 | UI: aba Relatórios (4 gráficos) | P2 | EDX-25 |
| EDX-29 | 4 | UI: aba Extrato + reconciliação | P2 | EDX-26 |
| EDX-30 | 4 | Schema: CardToken + PortalSession | P0 | EDX-08 |
| EDX-31 | 4 | Auth do portal: magic link + PortalSession | P0 | EDX-30 |
| EDX-32 | 4 | API: dados do portal (Invoices + Dunnings + CardToken) | P1 | EDX-31, EDX-08, EDX-17 |
| EDX-33 | 4 | Serviço de tokenização de cartão (PCI) | P1 | EDX-31 |
| EDX-34 | 4 | UI: portal completo (5 telas) | P1 | EDX-33, EDX-32 |
| EDX-35 | 5 | Schema: BankAccount + Transfer + Anticipation | P0 | EDX-08 |
| EDX-36 | 5 | FinanceiroService: saldo + saque | P1 | EDX-35 |
| EDX-37 | 5 | AntecipacaoService: listar, simular, criar | P1 | EDX-35 |
| EDX-38 | 5 | API: /financeiro/balance, /transfers, /anticipations | P1 | EDX-36, EDX-37 |
| EDX-39 | 5 | UI: página /financeiro + modal saque | P1 | EDX-38 |
| EDX-40 | 5 | UI: modal antecipação com simulação | P1 | EDX-38 |
| EDX-41 | 5 | Webhooks: TRANSFER_* + ANTICIPATION_* | P1 | EDX-35, EDX-36, EDX-37, EDX-07 |
| EDX-42 | 5 | Schema + service: PlatformInvoice + cobrança cartão | P0 | EDX-07 |
| EDX-43 | 5 | UI: Meu Plano (Settings) | P1 | EDX-42 |
| EDX-44 | 5 | Importação CSV (upload, validação, import atômico) | P1 | EDX-42, EDX-01 |
| EDX-45 | 5 | Settings abas Dados e Taxas | P1 | EDX-42 |
| EDX-46 | 5 | Config firstChargeMode na UI de Settings | P1 | EDX-45, EDX-08 |

---

## Onda 0 — Fundação

### EDX-01 · Schema: Student + Enrollment (DONO do shape)
- **Spec 02 / Fatia 1 · P0 · Depende de: —**
- **Objetivo:** Criar models `Student`, `Enrollment` + enums no schema Prisma. Este é o shape **canônico** do Enrollment (ver EDX-DEC-02) — a spec 03 só referencia.
- **Scope:**
  - enum `EnrollmentPlan` (MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL)
  - enum `EnrollmentStatus` (PENDING_CONFIRMATION, AWAITING_SCHOOL_APPROVAL, ACTIVE, CANCELLED, SUSPENDED)
  - model `Student` (id, unitId, nameEnc, birthDateEnc, notes, createdAt, updatedAt, relations)
  - model `Enrollment` (id, unitId, guardianId, studentId, subjectId, plan, agreedPriceCents, discountType?, discountValueBp?, discountValueCents?, finalPriceCents, status, confirmationToken?, confirmationTokenExpiresAt?, confirmedAt?, asaasSubscriptionId?, createdAt, updatedAt, relations)
  - campo `Guardian.selfPayer Boolean`
  - Relations: Guardian↔Enrollment, Subject↔Enrollment, Unit↔Student, Unit↔Enrollment
- **Not-Included:**
  - Nenhuma lógica de aplicação, rota ou componente
  - Nenhuma integração Asaas
- **DoD-comando:** `pnpm prisma migrate dev --name add-student-enrollment && pnpm typecheck`
- **TDD (RED primeiro):** typecheck deve passar sem erros (Student e Enrollment ainda não existem antes da migration).
- **Decisões adotadas:** Schema exato da seção 4 da spec 02. Tenant isolation via `unitId` (sem RLS). Valores sempre em centavos (Int). PII encrypted no Student (`nameEnc`, `birthDateEnc`). **Esta task é a fonte de verdade do Enrollment** — a versão simplificada da spec 03 (`discountCents`/`planType`) foi descartada.
- **Arquivos-alvo:** `prisma/schema.prisma`

### EDX-02 · Escrever E2E do onboarding faltante (spec 01)
- **Spec 01 (já implementada) · P1 · Depende de: —**
- **Objetivo:** A spec 01 (onboarding) já está implementada, mas o teste Playwright está **vazio**. Escrever o E2E real do fluxo de 4 passos → `Unit` + `BillingConfig` + `Subject`. Este é o **smoke recomendado pro fluxo Multica → Claude Code**.
- **Scope:**
  - E2E Playwright cobrindo os 4 passos do onboarding
  - Assert: ao final, existem 1 `Unit`, 1 `BillingConfig` e ≥1 `Subject` persistidos
  - Cobrir validações de formulário básicas por passo
- **Not-Included:**
  - Mudanças na implementação do onboarding (só teste)
  - Billing, matrícula ou qualquer fluxo posterior
- **DoD-comando:** `pnpm dlx playwright test onboarding --reporter=line`
- **TDD (RED primeiro):** o teste já existe vazio → escrever os asserts faz o arquivo falhar até o fluxo completo passar end-to-end.
- **Decisões adotadas:** Cross-cutting, sem dependência de schema novo. Bom primeiro ticket pra validar o pipeline Multica→Claude Code de ponta a ponta.
- **Arquivos-alvo:** `e2e/onboarding.spec.ts`

---

## Onda 1 — Matrícula (resto da spec 02)

### EDX-03 · API: fluxo link (GET + POST submit)
- **Spec 02 / Fatia 2 · P1 · Depende de: EDX-01**
- **Objetivo:** Endpoints públicos para Guardian + Students + Enrollments via link (sem Clerk).
- **Scope:**
  - `POST /api/enrollment/link/[token]/submit`: valida token da unidade, recebe Guardian + Students + plano + termos aceitos, cria/reutiliza Guardian (busca por CPF), registra `TermsAcceptance` (ESCOLA_RESPONSAVEL), cria Students e Enrollments, chama `POST /customers` Asaas, grava `asaasCustomerId`, retorna success
  - `GET /api/enrollment/link/[token]`: retorna Unit público (name, dueDay), `BillingConfig.dueDay`, Subjects ativos com preços
  - Validação Zod de todos inputs
  - Criptografia AES-256-GCM de PII: cpf, email, phone, Student.name, Student.birthDate
  - Cálculo serverside: `finalPriceCents = agreedPriceCents - desconto`
  - Integração Asaas `POST /customers` (sandbox)
  - Idempotência: Guardian com `asaasCustomerId` existente não cria novo customer
- **Not-Included:**
  - UI (EDX-04), fluxo manual (EDX-05)
  - `POST /subscriptions` Asaas
  - Lógica de desconto (link não tem desconto)
- **DoD-comando:** `pnpm test:run -- enrollment-link && pnpm dlx playwright test matricula-link-api --reporter=line`
- **TDD (RED primeiro):** E2E que `POST .../submit` sem TermsAcceptance registrada deve falhar com 400 (antes de implementar a rota).
- **Decisões adotadas:** `POST /customers` sempre após TermsAcceptance (R8). Guardian reutilizado por CPF (R6). Enrollment criado `ACTIVE` após POST OK (sem aprovação manual no MVP). Desconto não existe no link (R4). Valores em centavos no servidor; conversão pra reais só na borda Asaas.
- **Arquivos-alvo:** `src/app/api/enrollment/link/[token]/route.ts`, `src/lib/services/enrollment.service.ts`, `src/lib/integration/asaas/customer.ts`, `src/lib/validators/enrollment-link.ts`, `src/lib/encryption.ts`

### EDX-04 · UI mobile: fluxo link (4 passos + confirmação)
- **Spec 02 / Fatia 3 · P1 · Depende de: EDX-03**
- **Objetivo:** Screens B1–B6 (mobile-first 375px) consumindo EDX-03.
- **Scope:**
  - Rota pública `/m/[token]` (sem layout autenticado Clerk)
  - Passos: Boas-vindas (B1) → Seus dados (B2) → Dados aluno(s) (B3) → Plano (B4) → Resumo+termos (B5) → Confirmação (B6)
  - Progress bar + validação de form alta qualidade
  - Mascaramento CPF inline (`***456789-**`)
  - Chips de matéria a partir de Subjects; cards de plano apenas para Subjects com preço
  - Resumo consolidado de todos Enrollments; contrato expansível (`TermsVersion.body`) + checkbox obrigatório
  - Responsivo mobile-first 375px
- **Not-Included:** Fluxo manual, lógica de desconto, edição/cancelamento pós-envio
- **DoD-comando:** `pnpm dlx playwright test matricula-link-ui --reporter=line`
- **TDD (RED primeiro):** enviar form B5 sem aceitar checkbox deve falhar (botão desabilitado).
- **Decisões adotadas:** Rota pública sem Clerk. Token desbloqueia unidade + pre-fill opcional. Limita 5 alunos (R1). Planos só se `Subject.priceCents` configurado (R3). Design ref: `screens-b.jsx`. Máscara CPF `***456789-**`.
- **Arquivos-alvo:** `src/app/m/[token]/page.tsx`, `src/components/enrollment-link/Step1Guardian.tsx`, `Step2Students.tsx`, `Step3Plan.tsx`, `Step4Review.tsx`, `ConfirmationScreen.tsx`, `src/lib/hooks/useEnrollmentLink.ts`

### EDX-05 · UI desktop: fluxo manual (orientador, Enrollments PENDING)
- **Spec 02 / Fatia 4 · P1 · Depende de: EDX-03**
- **Objetivo:** Painel autenticado: orientador preenche Guardian + Students, escolhe matérias/planos/desconto, gera `confirmationToken` para responsável.
- **Scope:**
  - Rota autenticada `/dashboard/matriculas/nova` (Clerk protegida)
  - Busca Guardian por nome ou CPF (interna, sem Asaas) OU cadastro novo + toggle `selfPayer`
  - Adicionar até 5 Students (nome + birthDate)
  - Por aluno: matéria(s) + plano + desconto opcional (% ou R$ com calculadora em tempo real, serverside R5), exibir `finalPriceCents`
  - Tabela resumo + "Enviar link ao responsável" (gera `confirmationToken`, expira 72h, envia email via fluxo EDX-06)
  - Matéria, plano e valor ficam **travados** no cadastro do orientador (responsável não pode alterar no link)
  - Validação Zod; reutiliza Guardian existente (R6)
- **Not-Included:** "Confirmar agora" presencial (removido — fluxo passa por dupla aprovação); edição pós-criação; Asaas customer (criado após aprovação final); multi-matéria com planos diferentes (P2)
- **DoD-comando:** `pnpm dlx playwright test matricula-manual-ui --reporter=line`
- **TDD (RED primeiro):** "Enviar link" com Subject sem plano (`priceCents` null) deve falhar; buscar Guardian existente por CPF deve reutilizar vs criar novo.
- **Decisões adotadas:** Fluxo manual cria Enrollment `PENDING_CONFIRMATION`. Desconto só aqui (R4). Reutiliza Guardian por CPF (R6). Limite 5 alunos (R1). **Dupla aprovação (EDX-DEC-03):** responsável edita só dados pessoais, escola aprova ao final antes de ACTIVE.
- **Arquivos-alvo:** `src/app/dashboard/matriculas/nova/page.tsx`, `src/components/enrollment-manual/GuardianSearch.tsx`, `GuardianForm.tsx`, `StudentList.tsx`, `EnrollmentForm.tsx`, `ReviewTable.tsx`, `src/lib/services/enrollment-manual.service.ts`

### EDX-06 · Link de confirmação (responsável revisa dados, escola aprova — dupla aprovação)
- **Spec 02 / Fatia 5 · P1 · Depende de: EDX-05**
- **Objetivo:** Rota pública: responsável clica link do email, revisa resumo, **edita apenas dados pessoais** (sobrescreve cadastro do orientador), aceita termos → Enrollment passa a `AWAITING_SCHOOL_APPROVAL`. Depois, escola aprova no painel → `ACTIVE`. Dois sub-fluxos: (A) responsável revisa/submete; (B) orientador aprova na dashboard.
- **Scope:**
  - Rota pública `/m/confirmar/[token]` (sem auth)
  - Exibe resumo Enrollment (matéria/plano/valor **somente leitura**, travados)
  - Formulário editável pelo responsável: nome, CPF, email, telefone do responsável + nome e data de nascimento do aluno — estes sobrescrevem o cadastro do orientador
  - `POST /confirmar`: valida token (não expirado/não usado), salva edições de dados pessoais (sobrescreve), registra `TermsAcceptance` com IP + acceptedAt, seta Enrollment `AWAITING_SCHOOL_APPROVAL`
  - Rota autenticada `POST /api/enrollment/[id]/approve` (Clerk, orientador): Enrollment `AWAITING_SCHOOL_APPROVAL` → `ACTIVE`; chama `POST /customers` Asaas (ou reutiliza `asaasCustomerId`)
  - Notificação ao orientador quando responsável submete (email ou Slack, stub ok no MVP)
  - Tratamento: token expirado, já usado, sucesso
- **Not-Included:** re-uso de token após confirmação; edição de matéria/plano/valor pelo responsável
- **DoD-comando:** `pnpm dlx playwright test matricula-confirmacao-link --reporter=line && pnpm dlx playwright test matricula-token-expirado --reporter=line && pnpm dlx playwright test matricula-aprovacao-escola --reporter=line`
- **TDD (RED primeiro):** confirmar com token expirado (>72h) → "link expirado"; token válido + editar dados pessoais → salva sobrescrita + status `AWAITING_SCHOOL_APPROVAL`; orientador aprova → `ACTIVE` + Asaas; responsável **não consegue** alterar `finalPriceCents` nem `subjectId` (400); Enrollment só vira ACTIVE após aprovação da escola.
- **Decisões adotadas:** Token expira 72h (R9). `POST /customers` disparado **na aprovação da escola** (não na submissão do responsável). Se `asaasCustomerId` já existe, não chama de novo (R7). Edição do responsável sobrescreve dados pessoais (EDX-DEC-03). IP via `X-Forwarded-For`/remoteAddr. Idempotência: token confirmado não reusa.
- **Arquivos-alvo:** `src/app/m/confirmar/[token]/page.tsx`, `src/app/api/enrollment/confirmar/[token]/route.ts`, `src/app/api/enrollment/[id]/approve/route.ts`, `src/components/enrollment-confirmation/ConfirmationForm.tsx`, `src/lib/services/enrollment-confirmation.service.ts`

---

## Onda 2 — Cobrança (spec 03)

### EDX-07 · Infra: Webhook Asaas base (receiver `/api/webhooks/asaas`)
- **Spec 03 (infra cross-cutting) · P0 · Depende de: EDX-01**
- **Objetivo:** Criar o **receiver base** do webhook Asaas — endpoint único que várias specs (03, 04, 05, 08, 09) estendem. Não existe ainda; é pré-requisito de toda reconciliação.
- **Scope:**
  - `POST /api/webhooks/asaas`: handler base com dispatch por `event.type`
  - Validação do header `asaas-access-token` contra `BillingConfig.asaasWebhookTokenEnc` (descriptografado AES-256-GCM)
  - Estrutura de roteamento por evento (switch extensível) + logging por evento
  - `401` se token inválido; `200` para eventos não tratados (não retornar 4xx ao Asaas)
  - Base de idempotência (estrutura para `webhookEventId`)
- **Not-Included:** Lógica específica de pagamento (EDX-11), NFS-e (EDX-15/16), dunning (EDX-22), transfer/anticipation (EDX-41), platform invoice (EDX-42) — essas **estendem** este handler.
- **DoD-comando:** `pnpm dlx playwright test billing-webhook-base --reporter=line`
- **TDD (RED primeiro):** `POST` com token inválido → 401; `POST` com evento desconhecido e token válido → 200 com log; sem handler ainda → falha.
- **Decisões adotadas:** **Endpoint único compartilhado** entre todas as specs — evita N receivers. Token no header, não body. Descriptografia no handler. Cada spec posterior adiciona um case ao switch.
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `src/lib/services/webhook.service.ts`

### EDX-08 · Schema: Invoice + Payment + BillingConfig.firstChargeMode
- **Spec 03 / Fatia 1 · P0 · Depende de: EDX-01**
- **Objetivo:** Criar models `Invoice` e `Payment` + enums no schema Prisma + campo `firstChargeMode` em `BillingConfig`. (Student/Enrollment já vêm de EDX-01 — **não recriar**.)
- **Scope:**
  - enums `InvoiceStatus`, `PlanType` (se ainda não cobertos por `EnrollmentPlan`)
  - enum `FirstChargeMode` (`PROPORTIONAL`, `WAIVED`)
  - models `Invoice`, `Payment`
  - campo `BillingConfig.firstChargeMode FirstChargeMode @default(PROPORTIONAL)` — controla regra do 1º boleto
  - relações em Unit, Guardian, Subject
  - migration + `pnpm prisma generate`
- **Not-Included:** Nenhum serviço, rota, UI ou lógica de negócio. **Não redefinir Enrollment/Student** (EDX-DEC-02).
- **DoD-comando:** `pnpm prisma migrate dev --name add-invoice-payment && pnpm typecheck`
- **TDD (RED primeiro):** após migration, `prisma db pull` gera schema com Invoice + Payment + enums + relações corretas; `BillingConfig.firstChargeMode` existe com default PROPORTIONAL.
- **Decisões adotadas:** Valores em centavos. Invoice lê `finalPriceCents`/desconto do Enrollment definido em EDX-01 (não introduz `discountCents` próprio). `Invoice.idempotencyKey = enrollmentId:refMonth`. `firstChargeMode` em BillingConfig (nível de unidade, não por matrícula).
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>-add-invoice-payment/migration.sql`

### EDX-09 · BillingService: emitMonthlyInvoices (com regra do 1º boleto)
- **Spec 03 / Fatia 2 · P0 · Depende de: EDX-08**
- **Objetivo:** Lógica de criação de Invoice + chamada Asaas para cobrança mensal, incluindo cálculo do 1º boleto.
- **Scope:**
  - `BillingService.emitMonthlyInvoices(unitId, refMonth)`
  - dueDate a partir de `BillingConfig.dueDay`; conversão centavos→reais na borda Asaas
  - **Regra do 1º boleto** (lida de `BillingConfig.firstChargeMode`):
    - `PROPORTIONAL` (padrão): matrícula no meio do mês → cobra proporcionalmente os dias restantes do mês corrente; a partir do mês seguinte, mensalidade cheia. Usa `closingDay` e `dueDay` de `BillingConfig`
    - `WAIVED`: isenta totalmente o 1º mês (não emite Invoice para a competência de entrada)
  - Idempotência por `Invoice.idempotencyKey`
  - Salvar `asaasPaymentId`, `emittedAt`, `asaasBankSlipUrl`, `asaasBarCode`
  - `asaasCustomerId` nulo → `Invoice.status = BLOCKED` (sem chamar Asaas)
  - Suportar plano (quarterly/semiannual/annual ou default `priceCents`); aplicar desconto do Enrollment
  - Testes unitários com mock Asaas
- **Not-Included:** cron, endpoint HTTP, webhook, UI, retry de ERROR
- **DoD-comando:** `pnpm test:run src/lib/services/billing.service.test.ts`
- **TDD (RED primeiro):** (1) cria Invoice PENDING + chama Asaas; (2) `asaasCustomerId` nulo → BLOCKED sem Asaas; (3) idempotencyKey existente não duplica; (4) conversão centavos→reais; (5) plano usa preço correto do Subject; (6) matrícula dia 20, `dueDay=10`, `closingDay=5` → 1º Invoice com valor proporcional (10/30 do mês); (7) `firstChargeMode=WAIVED` → 1ª competência não emite Invoice.
- **Decisões adotadas:** Desconto e plano aplicados aqui (RN-08/09). Asaas recebe `value = (priceCents - desconto)/100`. Sem preço pro plano → usa `priceCents` + log. Sem retry — marca ERROR e sai. `firstChargeMode` lido de `BillingConfig` da unit.
- **Arquivos-alvo:** `src/lib/services/billing.service.ts`, `src/lib/services/billing.service.test.ts`

### EDX-10 · Endpoint cron + agendamento
- **Spec 03 / Fatia 3 · P0 · Depende de: EDX-09**
- **Objetivo:** Endpoint protegido pro cron + agendamento Vercel.
- **Scope:**
  - `POST /api/cron/billing`: valida `Authorization: Bearer <CRON_SECRET>`
  - Itera Units com `BillingConfig.autoBilling = true` e status ACTIVE → `emitMonthlyInvoices`
  - Log por Unit (sucesso N invoices, erro, total)
  - `vercel.json`: cron `0 11 1 * *` (08:00 BRT, dia 1)
- **Not-Included:** UI de histórico, manual retry endpoint
- **DoD-comando:** `pnpm dlx playwright test billing-cron --reporter=line`
- **TDD (RED primeiro):** (1) dispara dia 1 08:00 BRT; (2) Unit ativa com 2 Enrollments → 2 Invoices; (3) sem Bearer → 401; (4) resposta com log + total.
- **Decisões adotadas:** Vercel Crons via `vercel.json` (Pro). `CRON_SECRET` em env. `autoBilling=false` → Unit pulada (RN-07).
- **Arquivos-alvo:** `src/app/api/cron/billing/route.ts`, `vercel.json`, `.env.local` (`CRON_SECRET`)

### EDX-11 · Webhook Asaas: reconciliação de pagamento
- **Spec 03 / Fatia 4 · P0 · Depende de: EDX-07, EDX-08**
- **Objetivo:** Estender o receiver base (EDX-07) com `PAYMENT_RECEIVED` / `PAYMENT_OVERDUE` idempotentes.
- **Scope:**
  - `PAYMENT_RECEIVED`: busca Invoice, cria Payment, Invoice → PAID (`paidAt`, `paidAmountCents`)
  - `PAYMENT_OVERDUE`: Invoice → OVERDUE
  - Idempotência por `Payment.webhookEventId` (hash do evento)
  - Invoice já PAID → 200 sem reprocessar; Invoice não encontrada → 200 com log
  - Token inválido → 401 (já no base)
- **Not-Included:** NFS-e, dunning, notificação ao responsável
- **DoD-comando:** `pnpm dlx playwright test billing-webhook --reporter=line`
- **TDD (RED primeiro):** (1) PAYMENT_RECEIVED → PAID + Payment; (2) mesmo `webhookEventId` 2x → 1 Payment; (3) token errado → 401; (4) Invoice ausente → 200 log; (5) PAYMENT_OVERDUE → OVERDUE.
- **Decisões adotadas:** `PAYMENT_RECEIVED` (não CONFIRMED) dispara PAID. `externalReference = Invoice.id`; fallback `payment.id`. Estende o switch de EDX-07.
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `src/lib/services/webhook.service.ts`

### EDX-12 · UI: Lista de cobranças (C3)
- **Spec 03 / Fatia 5 · P1 · Depende de: EDX-09**
- **Objetivo:** Exibir Invoices reais com filtros e tabela (design C3).
- **Scope:**
  - `cobrancas/page.tsx`: busca Invoices por `unitId` da sessão Clerk
  - Abas Todas / A vencer / Pagas / Vencidas → InvoiceStatus
  - Tabela: Responsável, Aluno, Valor, Vencimento, Status (badge), Forma
  - Badge por status; clique na linha → detalhe C4; Alfabeto (shadcn)
- **Not-Included:** C4 detalhe, ações reenviar/cancelar, cobrança extra manual
- **DoD-comando:** `pnpm dlx playwright test cobrancas-list --reporter=line`
- **TDD (RED primeiro):** (1) carrega Invoices da Unit; (2) filtro Pagas → só PAID; (3) Vencidas → só OVERDUE; (4) clique → `/cobrancas/[id]`.
- **Decisões adotadas:** BLOCKED = badge amarelo "Aguardando cadastro"; ERROR = vermelho "Falha na emissão". `unitId` sempre da sessão Clerk, nunca HTTP param.
- **Arquivos-alvo:** `src/app/(app)/cobrancas/page.tsx`, `src/components/billing/invoice-list.tsx`, `src/lib/queries/invoices.ts`

### EDX-13 · UI: Detalhe da cobrança (C4)
- **Spec 03 / Fatia 6 · P1 · Depende de: EDX-12**
- **Objetivo:** Detalhe da Invoice com boleto PDF, linha digitável, PIX e histórico.
- **Scope:**
  - `cobrancas/[id]/page.tsx`: busca Invoice por id + unitId
  - Valor bruto + valor com desconto; se OVERDUE, valor com multa (`netAmountCents * (1 + lateFeePercent/100)`)
  - Boleto (PDF `asaasBankSlipUrl`, linha digitável `asaasBarCode`); PIX (QR + copia-e-cola)
  - Timeline (Invoice.status + Payment[].createdAt); ações Reenviar / Cancelar
- **Not-Included:** C5 cobrança extra, renegociação inline
- **DoD-comando:** `pnpm dlx playwright test cobranca-detail --reporter=line`
- **TDD (RED primeiro):** (1) carrega Invoice; (2) desconto correto; (3) OVERDUE → multa; (4) Reenviar → `POST /payments`; (5) Cancelar → CANCELLED + `DELETE` Asaas; (6) histórico em ordem.
- **Decisões adotadas:** PIX da resposta Asaas (`POST /payments`) ou `qrcode` local. Cancelar destrutivo (RN-13): DELETE Asaas + CANCELLED local. `unitId` validado na sessão.
- **Arquivos-alvo:** `src/app/(app)/cobrancas/[id]/page.tsx`, `src/components/billing/invoice-detail.tsx`, `invoice-timeline.tsx`, `src/lib/queries/invoices.ts`

---

## Onda 3 — Fiscal (spec 04) + Negativação (spec 05)

### EDX-14 · NfseConfig + coleta alíquota ISS/regime
- **Spec 04 / Fatia 4-A · P0 · Depende de: EDX-08**
- **Objetivo:** Model `NfseConfig` + endpoints CRUD de config fiscal da unidade + campos `nfse*` no Invoice.
- **Scope:**
  - Migration: `NfseConfig` (issRatePercent, simplesNacional, retainIss, opções de retenção); campos `nfse*` no Invoice (nfseId, nfseStatus, nfseNumber, nfsePdfUrl, nfseXmlUrl, nfseEmittedAt)
  - `POST` / `GET /api/units/:unitId/nfse-config`
  - Validação Zod (issRatePercent 0–10, simplesNacional boolean)
  - Tela mínima de config fiscal (placeholder)
- **Not-Included:** Emissão da NFS-e, webhooks, UI de detalhe
- **DoD-comando:** `pnpm typecheck && pnpm test:run`
- **TDD (RED primeiro):** criar NfseConfig via POST, buscar via GET, atualizar; valida issRatePercent 0–10.
- **Decisões adotadas:** Model separado (1:1 com Unit), Cascade onDelete. Migration desacoplada da spec 03. `issRatePercent` Float, `simplesNacional` default true.
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add_nfse_config.sql`, `src/lib/db.ts`, `src/app/api/units/[unitId]/nfse-config/route.ts`, `src/lib/validation/nfse.ts`, `src/components/settings/NfseConfigForm.tsx`

### EDX-15 · Emitir NFS-e ao receber pagamento
- **Spec 04 / Fatia 4-B · P1 · Depende de: EDX-14, EDX-11**
- **Objetivo:** Disparar `POST /v3/invoices` no Asaas quando `PAYMENT_RECEIVED` chegar.
- **Scope:**
  - Estender handler `PAYMENT_RECEIVED` (EDX-11)
  - Guard idempotência (skip se `Invoice.nfseId` existe); guard `nfseConfig` nulo (warning, não 500)
  - Montar `AsaasCreateInvoicePayload` a partir de Invoice + Subject + NfseConfig
  - `POST /v3/invoices` (sandbox); persistir `nfseId`, `nfseStatus = SCHEDULED`
  - Testes: happy path, idempotência, sem NfseConfig
- **Not-Included:** Webhook de retorno (EDX-16), UI de detalhe
- **DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm dlx playwright test nfse-emit --reporter=line`
- **TDD (RED primeiro):** webhook PAYMENT_RECEIVED com Invoice válido → `POST /v3/invoices` chamado → `nfseId` preenchido.
- **Decisões adotadas:** Emissão no RECEIVED. `serviceDescription = 'Mensalidade - {Subject.name} - {Student.name} - {mm/aaaa}'`. `value = amountCents/100`. `municipalServiceCode = Subject.nfseServiceCode`. `taxes.iss = NfseConfig.issRatePercent`. `externalReference = Invoice.id`. NfseConfig null → success silencioso com warning.
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `src/lib/services/nfse.service.ts`, `src/lib/integration/asaas/client.ts`, `src/lib/integration/asaas/types.ts`, `src/lib/services/invoice.service.ts`, `src/__tests__/nfse-emit.spec.ts`

### EDX-16 · Receber confirmação NFS-e e exibir PDF/XML
- **Spec 04 / Fatia 4-C · P1 · Depende de: EDX-15**
- **Objetivo:** Processar `INVOICE_STATUS_CHANGED` e renderizar botões Download PDF/XML na UI de detalhe.
- **Scope:**
  - Handler `INVOICE_STATUS_CHANGED` (AUTHORIZED/ERROR/CANCELED); persistir `nfseStatus, nfseNumber, nfsePdfUrl, nfseXmlUrl, nfseEmittedAt`
  - `GET /api/invoices/:id` inclui `nfse*`
  - UI: seção "Nota fiscal" condicional (só AUTHORIZED) + número + Baixar PDF/XML; histórico "Nota fiscal emitida"
  - Acesso restrito: `Invoice.unitId == sessão unitId` (403)
- **Not-Included:** Cron reprocessamento ERROR, envio email PDF
- **DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm dlx playwright test nfse-display --reporter=line`
- **TDD (RED primeiro):** webhook AUTHORIZED → UI renderiza "Nota fiscal nº 000X" + Baixar PDF/XML; cross-unit → 403.
- **Decisões adotadas:** Persiste campos da response direto. Seção só em AUTHORIZED. Acesso via middleware (unitId vs Clerk org). Nunca SELECT sem filtro unitId. Ver EDX-DEC-04 (proxy vs redirect).
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `src/lib/services/invoice.service.ts`, `src/app/api/invoices/[id]/route.ts`, `src/components/invoices/InvoiceDetail.tsx`, `InvoiceTimeline.tsx`, `src/lib/middleware/tenant-isolation.ts`, `src/__tests__/nfse-display.spec.ts`

### EDX-17 · Schema: Dunning + enum DunningStatus
- **Spec 05 / Fatia 1 · P0 · Depende de: EDX-08**
- **Objetivo:** Adicionar tabela `dunnings` ao schema (model Dunning, enum DunningStatus, relação com Invoice).
- **Scope:**
  - enum `DunningStatus` (EMAVISO, ELEGIVEL, NEGATIVADO, REGULARIZADO)
  - model `Dunning` (id, unitId, invoiceId, asaasDunningId, status, valueCents, feeCents, optOut, warningSentAt, requestedAt, resolvedAt, actorId, createdAt, updatedAt)
  - relação Invoice→Dunning (optional 1:1); índices `[unitId]`, `[invoiceId]`, `[status]`; Unit→Dunning cascade
  - migration `add-dunning`
- **Not-Included:** Tipos Asaas (EDX-18), service (EDX-19), routes (EDX-20), UI (EDX-21)
- **DoD-comando:** `pnpm prisma migrate dev --name add-dunning && pnpm prisma generate && pnpm typecheck`
- **TDD (RED primeiro):** typecheck falha no import `{ DunningStatus, Dunning }` até schema pronto; após migration, passa.
- **Decisões adotadas:** Model novo (não campo no Invoice). 4 status internos. Opt-out por invoice. 1:1 Invoice→Dunning. Valores em centavos. Auditoria via `actorId` (clerkUserId). Taxa R$29,90 = 2990 centavos (constante no service).
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/`

### EDX-18 · Tipos Asaas: AsaasCreateDunningPayload + AsaasDunning
- **Spec 05 / Fatia 1 (step 2) · P0 · Depende de: —**
- **Objetivo:** Verificar/expandir tipos Asaas para `POST/DELETE/GET /paymentDunnings`.
- **Scope:**
  - `AsaasCreateDunningPayload` `{ payment, type, description }`
  - `AsaasDunning` `{ id, status, dunningNumber, requestDate, value, feeValue, netValue }`
  - Documentar conversão de borda (reais → centavos)
- **Not-Included:** implementação `createDunning` no client (EDX-19), mock-client (EDX-19)
- **DoD-comando:** `pnpm typecheck src/lib/integration/asaas/types.ts`
- **TDD (RED primeiro):** import dos tipos falha até interfaces existirem.
- **Decisões adotadas:** Payload mínimo `{ payment, type, description }`. `type = 'CREDIT_BUREAU'`. Description auto no service. `feeValue` sempre R$29,90. Numéricos Asaas em reais; conversão pra centavos na borda (service).
- **Arquivos-alvo:** `src/lib/integration/asaas/types.ts`

### EDX-19 · DunningService (criar, opt-out, elegibilidade, baixa)
- **Spec 05 / Fatia 2 · P1 · Depende de: EDX-17, EDX-18**
- **Objetivo:** Service de negativação: elegibilidade, criação, opt-out, baixa automática ao receber pagamento.
- **Scope:**
  - `createDunning(invoiceId, unitId, actorId)` com guardrails (enablesSpc, vencida ≥15d, `asaasPaymentId` existe, dunning não existe, optOut false)
  - helpers `convertReaisToCents`
  - `markOptOut(dunningId, unitId, actorId)` (se NEGATIVADO → `DELETE /paymentDunnings`)
  - `markOptOutByGuardian` (comentado, futuro — Decision 3)
  - hook em `onPaymentConfirmed` (EDX-11): se Dunning NEGATIVADO e pagamento RECEIVED/CONFIRMED → `removeDunning`
  - testes unitários (guards, conversão, opt-out, baixa automática)
- **Not-Included:** chamadas reais Asaas (mock default), routes (EDX-20), UI (EDX-21), webhook novo (EDX-22)
- **DoD-comando:** `pnpm test:run --reporter=verbose src/lib/services/dunning.service.test.ts`
- **TDD (RED primeiro):** `createDunning` lança se invoice não vencida ≥15d.
- **Decisões adotadas:** Usa client Asaas existente. `NEGATIVACAO_FEE_CENTS = 2990` (constante). Conversão na borda. Opt-out por invoice. Baixa automática integra com webhook (EDX-11). Expandir mock se faltar `createDunning/removeDunning/getDunning`.
- **Arquivos-alvo:** `src/lib/services/dunning.service.ts`, `dunning.service.test.ts`, `src/lib/integration/asaas/client.ts`

### EDX-20 · API routes POST /dunnings e PATCH /dunnings/[id]
- **Spec 05 / Fatia 3 · P1 · Depende de: EDX-19**
- **Objetivo:** Endpoints para UI acionar negativação (POST), listar (GET), baixa (DELETE), opt-out (PATCH).
- **Scope:**
  - `POST /dunnings { invoiceId }` → `createDunning`
  - `GET /dunnings { status?, invoiceId? }` filtrado por unitId
  - `DELETE /dunnings/[id]` → `removeDunning` (REGULARIZADO)
  - `PATCH /dunnings/[id] { optOut: true }` → `markOptOut`
  - auth Clerk + guard unitId; `actorId = clerkUserId` em toda ação
  - helper `maskCpf(cpf)` → `***.***.XXX-XX`
- **Not-Included:** UI (EDX-21), webhook dunning (EDX-22)
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/app/api/dunnings`
- **TDD (RED primeiro):** `POST /dunnings` sem invoiceId → 400; `PATCH` com optOut=true seta `Dunning.optOut`.
- **Decisões adotadas:** Retorna Dunning serializado com CPF mascarado. 403 se unitId ≠ sessão. POST sucesso 200+Dunning, falha 500. DELETE 200+REGULARIZADO. PATCH seta optOut e deleta Asaas se NEGATIVADO.
- **Arquivos-alvo:** `src/app/api/dunnings/route.ts`, `src/app/api/dunnings/[id]/route.ts`, `src/lib/utils/mask-cpf.ts`

### EDX-21 · UI: painel negativação + modais
- **Spec 05 / Fatia 4 · P1 · Depende de: EDX-20**
- **Objetivo:** Telas de negativação: painel de invoices elegíveis, 4 status com timeline CDC, modais confirm/opt-out, CPF sempre mascarado.
- **Scope:**
  - `cobrancas/negativacao/page.tsx` (ELEGIVEL/NEGATIVADO/REGULARIZADO)
  - `DunningStatusCard`, `DunningConfirmModal` (valor + taxa R$29,90 + quem paga + aviso CDC), `DunningOptOutModal`, `DunningTimeline`
  - responsivo 375/768/1440, Alfabeto DS; testes unitários
- **Not-Included:** webhook dunning (EDX-22), reconciliação automática (EDX-22)
- **DoD-comando:** `pnpm typecheck && pnpm dlx playwright test negativacao --reporter=line`
- **TDD (RED primeiro):** card ELEGIVEL exibe botão "Negativar"; `maskCpf()` exibe só últimos 2 dígitos.
- **Decisões adotadas:** CPF sempre mascarado. 4 estados visuais (ELEGIVEL azul / NEGATIVADO laranja / REGULARIZADO verde; EMAVISO = evento, timeline). Taxa sempre na modal. Botões → POST/DELETE/PATCH. Erro Asaas → toast, status volta ELEGIVEL.
- **Arquivos-alvo:** `src/app/(app)/cobrancas/negativacao/page.tsx`, `src/components/dunning/DunningStatusCard.tsx`, `DunningConfirmModal.tsx`, `DunningOptOutModal.tsx`, `DunningTimeline.tsx`, `*.test.tsx`, `e2e/negativacao.spec.ts`

### EDX-22 · Webhook Asaas dunning + reconciliação
- **Spec 05 / Fatia 5 · P2 · Depende de: EDX-19, EDX-20, EDX-07**
- **Objetivo:** Handlers `DUNNING_REQUESTED` / `DUNNING_RECEIVED`, setar `warningSentAt`, transição PENDING→CONFIRMED, polling de fallback.
- **Scope:**
  - Adicionar cases ao webhook (EDX-07): `DUNNING_REQUESTED` → `warningSentAt = now()`; `DUNNING_RECEIVED` → status CONFIRMED/NEGATIVADO
  - `reconcileDunnings()` (query NEGATIVO + asaasDunningId → `GET /paymentDunnings/{id}`; CANCELLED → REGULARIZADO)
  - script de reconciliação (cron/manual) pra dunnings PENDING >1h
- **Not-Included:** mudanças no model (EDX-17), core service (EDX-19)
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/app/api/webhooks/asaas`
- **TDD (RED primeiro):** `DUNNING_REQUESTED` seta `warningSentAt`.
- **Decisões adotadas:** Estende webhook de EDX-07. Mapeamento: Asaas PENDING→transição, CONFIRMED→NEGATIVADO, CANCELLED→REGULARIZADO. Sem webhook → polling.
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `src/lib/services/dunning.service.ts`, `scripts/reconcile-dunnings.ts`

---

## Onda 4 — Painel da Escola (spec 06) + Portal do Responsável (spec 07)

### EDX-23 · Migration: índices de agregação (dashboard)
- **Spec 06 / Fatia 1 · P0 · Depende de: EDX-08, EDX-17**
- **Objetivo:** Índices compostos em Invoice, Enrollment, Dunning pra otimizar queries do dashboard.
- **Scope:**
  - Invoice: `@@index([unitId, status])`, `([unitId, paidAt])`, `([unitId, dueDate])`, `([unitId, referenceMonth])`
  - Enrollment: `@@index([unitId, status])`, `([unitId, cancelledAt])`
  - Dunning: `@@index([unitId, status])`, `([invoiceId])`
  - migration `add-dashboard-indexes`
- **Not-Included:** Queries, views materializadas, testes de perf, UI
- **DoD-comando:** `pnpm prisma migrate dev --name add-dashboard-indexes && pnpm typecheck`
- **TDD (RED primeiro):** migration determinística — verificar via `pg_indexes`.
- **Decisões adotadas:** Índices da recomendação §4 da spec, default.
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add-dashboard-indexes/migration.sql`

### EDX-24 · Service: KPIs + RecoveryHero
- **Spec 06 / Fatia 2 · P0 · Depende de: EDX-23**
- **Objetivo:** Funções de agregação testáveis (KPIs, RecoveryHero, próximos vencimentos).
- **Scope:**
  - `dashboard.service.ts`: `getKpis(unitId, referenceMonth)`, `getRecoveryHero(unitId)`, `getUpcomingDue(unitId, limit)`
  - testes com SQLite em memória; `groupBy` + `_sum` + `_count` com `unitId` obrigatório
  - variação mês anterior via 2 queries paralelas
- **Not-Included:** Componentes React, rotas, relatórios (EDX-25), extrato (EDX-26)
- **DoD-comando:** `pnpm test:run src/lib/services/dashboard.service.test.ts`
- **TDD (RED primeiro):** `getKpis` retorna `{ receivedCents, pendingCents, overdueCents, activeStudents, previousMonth }`; falha vazamento cross-unit.
- **Decisões adotadas:** Variação mês anterior via `Promise.all` (mais simples que window function).
- **Arquivos-alvo:** `src/lib/services/dashboard.service.ts`, `dashboard.service.test.ts`

### EDX-25 · Service: 4 relatórios
- **Spec 06 / Fatia 3 · P1 · Depende de: EDX-23**
- **Objetivo:** 4 séries de dados (Cobrança, Inadimplência, Crescimento, Cancelamentos) com testes.
- **Scope:**
  - `report.service.ts`: `getBillingReport`, `getDelinquencyReport`, `getGrowthReport`, `getCancellationReport` (unitId, from, to)
  - R1 por mês (PAID/PENDING/OVERDUE); R2 (OVERDUE, NEGATIVADO, REGULARIZADO, valor recuperado, taxa 90d); R3 (matrículas novas, ativos, MRR PAID); R4 (churn por matéria/plano, MRR perdido)
  - testes unitários
- **Not-Included:** Gráficos, seletor de período, extrato
- **DoD-comando:** `pnpm test:run src/lib/services/report.service.test.ts`
- **TDD (RED primeiro):** `getGrowthReport` série `{ mes, novasMat, ativos, mrr }`; `getCancellationReport` churn em centavos; `getDelinquencyReport` só Dunning com invoiceId.
- **Decisões adotadas:** `billingType` não persiste agora (só via reconciliação no Extrato) → sai null. CSV export adiado.
- **Arquivos-alvo:** `src/lib/services/report.service.ts`, `report.service.test.ts`

### EDX-26 · Service: Extrato + reconciliação Asaas
- **Spec 06 / Fatia 4 · P1 · Depende de: EDX-23**
- **Objetivo:** Queries paginadas do Extrato com filtros, descriptografia de PII e reconciliação opcional Asaas.
- **Scope:**
  - `statement.service.ts`: `getStatement(unitId, filters, page, limit)`, `reconcileWithAsaas(unitId, from, to)`
  - join Invoice→Payment→Enrollment→Student→Guardian→Subject→Dunning; descriptografa `Student.nameEnc` em runtime
  - reconcile: `GET /payments` paginado (max 10 págs = 1000); compara `externalReference`; marca divergências
  - testes com mock Asaas
- **Not-Included:** UI, botão Reconciliar, CSV
- **DoD-comando:** `pnpm test:run src/lib/services/statement.service.test.ts`
- **TDD (RED primeiro):** filtro status=PAID só PAID; descriptografia `nameEnc` (mock AES-256-GCM); reconcile detecta Invoice sem registro local; unitId isolado.
- **Decisões adotadas:** Reconciliação máx 31 dias ou 1000 registros. `nameEnc` descriptografado no service, nunca cache persistente (TTL 5min em memória se sofrer perf, não Redis). Sem `asaasApiKey` → mensagem sem bloquear extrato local.
- **Arquivos-alvo:** `src/lib/services/statement.service.ts`, `statement.service.test.ts`

### EDX-27 · API + UI Dashboard (KPIs + RecoveryHero)
- **Spec 06 / Fatia 5 · P1 · Depende de: EDX-24**
- **Objetivo:** Expor KPIs via API + aba Dashboard (cards KPI, RecoveryHero, próximos vencimentos).
- **Scope:**
  - `api/dashboard/route.ts` (getKpis), `api/dashboard/recovery/route.ts` (getRecoveryHero) — sessão Clerk
  - `painel/page.tsx` Server Component + suspense
  - `KpiCard`, `RecoveryHeroBlock` (funil 4 etapas), `UpcomingDueList`
  - responsivo 375/768/1440; Alfabeto; período default = mês corrente; estados vazios positivos
- **Not-Included:** abas Relatórios/Extrato, seletor de período (EDX-28), gráficos
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/components/dashboard`
- **TDD (RED primeiro):** `KpiCard` valor com moeda; `RecoveryHeroBlock` 4 etapas mesmo com zero; `/dashboard` 200 com estrutura correta.
- **Decisões adotadas:** unitId sempre de Clerk, nunca query param. `referenceMonth = new Date().toISOString().slice(0,7)`.
- **Arquivos-alvo:** `src/app/api/dashboard/route.ts`, `recovery/route.ts`, `src/app/(app)/painel/page.tsx`, `src/components/dashboard/KpiCard.tsx`, `RecoveryHeroBlock.tsx`, `UpcomingDueList.tsx`

### EDX-28 · UI: aba Relatórios (4 gráficos intercambiáveis)
- **Spec 06 / Fatia 6 · P2 · Depende de: EDX-25**
- **Objetivo:** Aba Relatórios com 4 sub-relatórios + seletor de gráfico (barras/linha/pizza).
- **Scope:**
  - `api/reports/route.ts` (`type`, `from`, `to`, unitId via Clerk)
  - `painel/relatorios/page.tsx`: 4 cards + seletor período + seletor gráfico
  - `ReportCard`, `ChartToggle`, `ChartRenderer` (recharts), `PeriodSelector`; troca client-side sem refetch; tabela bruta abaixo
  - responsivo 375/768/1440, Alfabeto
- **Not-Included:** CSV, aba Extrato
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/components/reports`
- **TDD (RED primeiro):** `ReportCard` barras default; clique Linha → LineChart sem refetch; `/reports?type=billing` série `{ mes, pago, avencer, vencido }`.
- **Decisões adotadas:** recharts (BarChart/LineChart/PieChart). Troca sem refetch via estado local.
- **Arquivos-alvo:** `src/app/api/reports/route.ts`, `src/app/(app)/painel/relatorios/page.tsx`, `src/components/reports/ReportCard.tsx`, `ChartToggle.tsx`, `ChartRenderer.tsx`, `PeriodSelector.tsx`

### EDX-29 · UI: aba Extrato com filtros e reconciliação
- **Spec 06 / Fatia 7 · P2 · Depende de: EDX-26**
- **Objetivo:** Tabela paginada do Extrato com filtros + botão reconciliação Asaas.
- **Scope:**
  - `api/statement/route.ts` (paginado, filtros), `api/statement/reconcile/route.ts` (POST)
  - `painel/extrato/page.tsx`: colunas Competência, Aluno, Matéria, Responsável, Vencimento, Pago em, Valor, Status, Asaas
  - `StatementTable` (25/50 por página), `StatementFilters`, `ReconcileButton`, `DivergenceBadge`, `PaymentDetail`
  - `nameEnc` descriptografado no servidor; sem `asaasApiKey` → "Reconciliação não configurada"
  - responsivo 375/768/1440, Alfabeto
- **Not-Included:** CSV, integração de pagamento (spec 07)
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/components/statement`
- **TDD (RED primeiro):** página 1 = 25 linhas; filtro PAID; Reconciliar → POST + divergências em badge; CPF nunca exibido, nome descriptografado.
- **Decisões adotadas:** Rate limit Asaas → 400 "Período muito grande, máximo 31 dias ou 1000 registros". Sem `asaasApiKey` → config pendente, não bloqueia.
- **Arquivos-alvo:** `src/app/api/statement/route.ts`, `reconcile/route.ts`, `src/app/(app)/painel/extrato/page.tsx`, `src/components/statement/StatementTable.tsx`, `StatementFilters.tsx`, `ReconcileButton.tsx`, `DivergenceBadge.tsx`

### EDX-30 · Schema: CardToken + PortalSession
- **Spec 07 / Fatia 1 · P0 · Depende de: EDX-08**
- **Objetivo:** Criar models `CardToken` e `PortalSession` + migration.
- **Scope:**
  - `CardToken` (asaasCardToken, last4, brand, holderName, isActive), `PortalSession` (token UUID, expiresAt, usedAt)
  - relações em Guardian (cardTokens[], portalSessions[]) e Unit
  - migration + `pnpm prisma generate`
- **Not-Included:** Serviços, rotas, UI, integração Asaas
- **DoD-comando:** `pnpm prisma migrate dev --name add-card-token-portal-session && pnpm typecheck && grep -E 'model CardToken|model PortalSession' prisma/schema.prisma | wc -l | grep -q '^2$'`
- **TDD (RED primeiro):** `prisma.$queryRaw('SELECT * FROM card_tokens LIMIT 1')` resolve após migração.
- **Decisões adotadas:** Schema sec 4. PCI: nunca salvar número completo ou CVV. `unitId + guardianId` em ambos.
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add_card_token_portal_session`

### EDX-31 · Auth do portal: magic link + PortalSession
- **Spec 07 / Fatia 2 · P0 · Depende de: EDX-30**
- **Objetivo:** Gerar link mágico, validar token, emitir cookie de sessão (JWT stateless).
- **Scope:**
  - `portal-auth.service.ts`: `createPortalSession`, `validatePortalToken`, `issueSessionCookie`
  - `api/portal/auth/route.ts` (GET `?token=`); `middleware.ts` protege `/portal/*`
  - JWT stateless `{guardianId, unitId, exp}` em cookie HTTP-only
  - testes: token expirado, usado, válido
- **Not-Included:** Geração do link (fluxo 03), envio email/WhatsApp, UI, Asaas
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/lib/services/portal-auth.service.test.ts && pnpm dlx playwright test portal-auth --reporter=line --project=mobile`
- **TDD (RED primeiro):** token válido → redireciona /portal + cookie; expirado → "Link expirado"; usado → "Link já utilizado".
- **Decisões adotadas:** Sem Clerk (D-01). PortalSession TTL 7d, cookie 24h. HTTP-only, Secure, SameSite=Strict. Stateless (sem query em requests subsequentes).
- **Arquivos-alvo:** `src/lib/services/portal-auth.service.ts`, `src/app/api/portal/auth/route.ts`, `src/middleware.ts`, `portal-auth.service.test.ts`

### EDX-32 · API: dados do portal (Invoices + Dunnings + CardToken)
- **Spec 07 / Fatia 3 · P1 · Depende de: EDX-31, EDX-08, EDX-17**
- **Objetivo:** Endpoints de leitura para o portal (sem Clerk, com cookie).
- **Scope:**
  - `api/portal/overview/route.ts`: guardian, unit, invoices[], activeCardToken?, activeNotifs[]; filtra por guardianId + unitId do cookie
  - `api/portal/invoices/[id]/pix/route.ts`: Asaas pixQrCode → encodedImage, payload, expirationDate
  - `api/portal/invoices/[id]/nfse/route.ts`: proxy seguro pra `AsaasInvoice.pdfUrl`
  - cálculo de valor atualizado OVERDUE (multa + juros pro rata)
  - testes: isolamento unitId, juros pro rata
- **Not-Included:** Tokenização (EDX-33), UI, cobrança, emissão NFS-e
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/app/api/portal && pnpm dlx playwright test portal-overview --reporter=line --project=mobile`
- **TDD (RED primeiro):** (1) isolamento unitId (403 cross-unit); (2) juros pro rata 45d → ≈10150; (3) QR PIX expirado → erro gracioso.
- **Decisões adotadas:** Filtra via cookie. `multaCents = round(net*lateFeePercent/10000)`; `jurosCents = round(net*monthlyInterestBp/10000*diasAtraso/30)`. QR on-demand (cache 5min máx). Proxy NFS-e valida sessão (ver EDX-DEC-04).
- **Arquivos-alvo:** `src/app/api/portal/overview/route.ts`, `invoices/[id]/pix/route.ts`, `invoices/[id]/nfse/route.ts`, `src/lib/services/portal-invoice.service.ts`, `src/app/api/portal/portal.test.ts`

### EDX-33 · Serviço de tokenização de cartão (PCI)
- **Spec 07 / Fatia 4 · P1 · Depende de: EDX-31**
- **Objetivo:** Tokenizar cartão no Asaas, salvar CardToken, preparar cobrança com token.
- **Scope:**
  - `card-token.service.ts`: `tokenizeCard(guardianId, unitId, cardData, remoteIp)`, `chargeWithToken(invoiceId, cardTokenId, remoteIp)`
  - `POST /creditCard/tokenizeCreditCard`; persistir só token, last4, brand
  - nunca logar number/ccv/expiry
  - `api/portal/card-tokens/route.ts` (POST criar, DELETE isActive=false)
  - tipos `AsaasTokenizeCardPayload`/`Response`; testes (mock, PCI)
- **Not-Included:** UI, webhook de cobrança, retry, gestão de falhas detalhada
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/lib/services/card-token.service.test.ts && grep -q 'CardToken.*last4.*brand' prisma/schema.prisma`
- **TDD (RED primeiro):** `tokenizeCard` retorna `{ asaasCardToken, last4, brand }`; `card_tokens` nunca contém number/ccv/expiry.
- **Decisões adotadas:** PCI (D-02): número/CVV/expiry só cliente→servidor→Asaas, descartados. `asaasCardToken` único sensível. Descriptografar `cpfEnc` só na borda (nunca logar). `remoteIp` de headers. `chargeWithToken` usa `creditCardToken`.
- **Arquivos-alvo:** `src/lib/services/card-token.service.ts`, `src/app/api/portal/card-tokens/route.ts`, `src/lib/integration/asaas/types.ts`, `card-token.service.test.ts`

### EDX-34 · UI: portal completo (5 telas)
- **Spec 07 / Fatia 5 · P1 · Depende de: EDX-33, EDX-32**
- **Objetivo:** Todas as telas do portal (design `screens-e.jsx`).
- **Scope:**
  - `portal/page.tsx` (home: saudação, banner risco, próxima cobrança, cartão, histórico)
  - `portal/pay/[id]` (QR PIX + copia-e-cola + "Já paguei"); `portal/overdue/[id]` (valor atualizado + breakdown); `portal/card` (form cartão + checkbox + aviso taxa); `portal/notifications`
  - `PortalLayout`, `InvoiceCard`, `PendingBanner`, `CardTokenWidget`, `QrPayView`, `OverdueBreakdown`, `NotificationCenter`
  - mobile-first 375px; Alfabeto; E2E dos 6 cenários
- **Not-Included:** Geração do link (fluxo 03), push nativo, reemissão QR, admin/painel escola
- **DoD-comando:** `pnpm typecheck && pnpm dlx playwright test portal --reporter=line --project=mobile`
- **TDD (RED primeiro):** viewport 375x812 — (1) home PENDING → QR PIX + copiar; (2) OVERDUE + Dunning → banner + breakdown; (3) cadastrar cartão → "•••• 4242"; (4) NFS-e PDF 200; (5) link expirado sem expor dados; (6) PCI check no banco.
- **Decisões adotadas:** "Já paguei" não altera estado (aguarda webhook). Descrição do sistema (Subject+ref). NFS-e proxy/redirect (EDX-DEC-04). Aviso taxa informativo. Checkbox obrigatório. Mobile prioridade.
- **Arquivos-alvo:** `src/app/portal/page.tsx`, `pay/[id]/page.tsx`, `overdue/[id]/page.tsx`, `card/page.tsx`, `notifications/page.tsx`, `layout.tsx`, `src/components/portal/*`, `e2e/portal.spec.ts`

---

## Onda 5 — Tesouraria (spec 08) + Billing-IX / CSV / Settings (spec 09)

### EDX-35 · Schema: BankAccount + Transfer + Anticipation
- **Spec 08 / Fatia 1 · P0 · Depende de: EDX-08**
- **Objetivo:** 3 models novos pra saque PIX e antecipação de recebíveis.
- **Scope:**
  - enums `PixKeyType`, `TransferStatus`, `AnticipationStatus`
  - `BankAccount`, `Transfer`, `Anticipation` (valores em centavos)
  - relações em Unit; índices `unitId`; `pnpm prisma generate`
- **Not-Included:** Serviço, rota, UI, webhooks (EDX-41), tela cadastro de conta (P-03)
- **DoD-comando:** `pnpm prisma migrate dev --name add-bank-account-transfer-anticipation && pnpm typecheck`
- **TDD (RED primeiro):** enums e models existem; Unit tem relações `bankAccounts/transfers/anticipations`; typecheck passa. Criar `test/.fixtures/schema.expected.ts` antes.
- **Decisões adotadas:** BankAccount model separado (D-01). Centavos (D-05). `unitId` em todos (D-07).
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add-bank-account-transfer-anticipation/`

### EDX-36 · FinanceiroService: saldo + saque
- **Spec 08 / Fatia 2 · P1 · Depende de: EDX-35**
- **Objetivo:** Consultar saldo disponível e criar transfer via Asaas `POST /transfers`.
- **Scope:**
  - `getBalance(unitId)` → `{ availableCents, notYetAvailableCents }` (GET /finance/balance, reais→centavos)
  - `createTransfer(unitId, amountCents)` (valida ≤ saldo, descriptografa `pixKeyEnc` se CPF/PHONE, POST /transfers, persiste PENDING)
  - testes (saldo zero, válido, acima do limite, erro Asaas, cripto PIX)
- **Not-Included:** UI, rota, webhooks, antecipação (EDX-37)
- **DoD-comando:** `pnpm test:run src/lib/services/financeiro.service.test.ts`
- **TDD (RED primeiro):** `getBalance` descriptografa + converte; `createTransfer` valida ≤ saldo, payload correto, persiste asaasId + PENDING, descriptografa PIX se CPF/PHONE. Criar `test/fixtures/asaas-mock.ts`.
- **Decisões adotadas:** PIX prioritário (D-02). Centavos no app, reais na borda (D-05). Sandbox no asaasClient (D-06).
- **Arquivos-alvo:** `src/lib/services/financeiro.service.ts`, `__tests__/financeiro.service.test.ts`, `src/lib/integration/asaas/types.ts`

### EDX-37 · AntecipacaoService: listar, simular, criar
- **Spec 08 / Fatia 3 · P1 · Depende de: EDX-35**
- **Objetivo:** Listar recebíveis de cartão elegíveis, simular taxa, criar antecipação.
- **Scope:**
  - `listElegiveis(unitId)` (GET /payments status=CONFIRMED&billingType=CREDIT_CARD)
  - `simulate(unitId, paymentIds)` (POST /anticipations/simulate, acumula)
  - `create(unitId, paymentIds)` (POST /anticipations sequencial, persiste AWAITING_APPROVAL + asaasPaymentIds JSON)
  - testes (lista vazia, 1, 3 recebíveis, erro mid-op, `isDocumentationRequired`)
- **Not-Included:** UI, rota, webhooks, upload docs (P-05)
- **DoD-comando:** `pnpm test:run src/lib/services/antecipacao.service.test.ts`
- **TDD (RED primeiro):** filtra CONFIRMED+CREDIT_CARD; simulate agrupa taxa; `netValue = gross - fee`; create persiste AWAITING_APPROVAL + JSON; trata docs. Criar `test/fixtures/asaas-mock.ts`.
- **Decisões adotadas:** Cálculo local + simulate oficial (D-03). Uma POST por payment, agregado em 1 Anticipation com JSON (D-04). Centavos (D-05). `isDocumentationRequired` só retornado/exibido.
- **Arquivos-alvo:** `src/lib/services/antecipacao.service.ts`, `__tests__/antecipacao.service.test.ts`, `src/lib/integration/asaas/types.ts`

### EDX-38 · API: /financeiro/balance, /transfers, /anticipations
- **Spec 08 / Fatia 4 · P1 · Depende de: EDX-36, EDX-37**
- **Objetivo:** Endpoints HTTP pra saldo, saque e antecipação.
- **Scope:**
  - `GET /api/financeiro/balance`; `POST /api/financeiro/transfers` (valida BankAccount default)
  - `GET /api/financeiro/anticipations`; `POST ?action=simulate`; `POST ?action=confirm`
  - validação: unitId sempre da sessão Clerk; BankAccount obrigatória em /transfers (400); amountCents>0; paymentIds não vazio
- **Not-Included:** UI, webhooks (EDX-41)
- **DoD-comando:** `pnpm typecheck && pnpm test:run src/app/api/financeiro/`
- **TDD (RED primeiro):** balance retorna ambos; /transfers valida BankAccount; amount>saldo → 400; cria Transfer com asaasId; /anticipations vazio; simulate → taxa; confirm → Anticipation; todas validam Clerk + unitId. Criar `test/fixtures/clerk-mock.ts`.
- **Decisões adotadas:** Sandbox (D-06). unitId da sessão (D-07). BankAccount ausente → 400.
- **Arquivos-alvo:** `src/app/api/financeiro/balance/route.ts`, `transfers/route.ts`, `anticipations/route.ts`, `src/lib/db.ts`

### EDX-39 · UI: página /financeiro + modal saque
- **Spec 08 / Fatia 5 · P1 · Depende de: EDX-38**
- **Objetivo:** Tela de saldo + modal de saque PIX com validação de limite.
- **Scope:**
  - `financeiro/page.tsx`: card saldo, badge "em cartão — libera em D+X", botões Transferir / Antecipar
  - modal saque: valor (max = availableCents), card destino read-only, validação tempo real, estados loading/sucesso/erro
  - botão Transferir desabilitado + tooltip se sem BankAccount (RN-04)
  - responsivo 375/768/1440, Alfabeto
- **Not-Included:** Modal antecipação (EDX-40), tela cadastro conta (P-03), extrato (P-06)
- **DoD-comando:** `pnpm dlx playwright test financeiro-saque financeiro-saque-limite financeiro-sem-conta --reporter=line`
- **TDD (RED primeiro):** card saldo, valores, abrir modal, pré-preenchido, valor>saldo desabilita, confirmar → POST + toast, sem BankAccount desabilita + tooltip, loading. Criar specs com fixtures.
- **Decisões adotadas:** PIX único (campos read-only). Pré-preenche availableCents (RN-02). Desabilita sem BankAccount (RN-04). Cadastro de conta em fatia futura/onboarding (P-03).
- **Arquivos-alvo:** `src/app/(app)/financeiro/page.tsx`, `src/components/financeiro/saldo-card.tsx`, `modal-saque.tsx`, `test/e2e/financeiro-saque*.spec.ts`

### EDX-40 · UI: modal antecipação com simulação
- **Spec 08 / Fatia 6 · P1 · Depende de: EDX-38**
- **Objetivo:** Modal de antecipação: lista de recebíveis, cálculo local instantâneo, simulação oficial antes de confirmar.
- **Scope:**
  - lista (GET /anticipations) com checkbox + descrição + data liberação + dias + valor
  - cálculo local RN-06 (`bruto * 0.0199 * dias/30`) inline; resumo fixo (bruto / taxa / recebe hoje)
  - fluxo: Antecipar → simulate (loading "Verificando taxa...") → modal confirmação com taxa oficial → confirm → toast
  - estado vazio (RN-14); aviso `isDocumentationRequired` (RN-10); responsivo
- **Not-Included:** Upload docs (P-05), extrato (P-06)
- **DoD-comando:** `pnpm dlx playwright test financeiro-antecipacao financeiro-antecipacao-vazia --reporter=line`
- **TDD (RED primeiro):** abrir modal, carregar lista, vazio, selecionar atualiza resumo, múltiplos acumulam, Antecipar → simulate + loading, modal confirmação com taxa oficial, confirm → toast, doc aviso. Criar specs com fixtures.
- **Decisões adotadas:** Local (RN-06) + simulate oficial (RN-07). Estado "Verificando taxa...". Aviso só (P-05). `isDocumentationRequired` exibe aviso.
- **Arquivos-alvo:** `src/components/financeiro/modal-antecipacao.tsx`, `modal-confirmacao-antecipacao.tsx`, `src/lib/utils/calculo-taxa.ts`, `test/e2e/financeiro-antecipacao*.spec.ts`

### EDX-41 · Webhooks: TRANSFER_* + ANTICIPATION_*
- **Spec 08 / Fatia 7 · P1 · Depende de: EDX-35, EDX-36, EDX-37, EDX-07**
- **Objetivo:** Estender o webhook (EDX-07) com handlers de transfer e anticipation idempotentes.
- **Scope:**
  - `TRANSFER_DONE` → DONE + confirmedAt; `TRANSFER_FAILED` → FAILED; `ANTICIPATION_APPROVED` → APPROVED + anticipatedAt; `ANTICIPATION_DENIED` → DENIED
  - idempotência (check de status terminal); logging por evento; validação de assinatura
- **Not-Included:** Fila de retry, notificação ao usuário
- **DoD-comando:** `pnpm dlx playwright test webhook-transfer webhook-anticipation --reporter=line`
- **TDD (RED primeiro):** cada evento atualiza o status correto; duplicado (mesmo event.id) → 200 sem reprocessar; asaasId inexistente → 400/200; signature validada. Criar `test/api/webhooks-asaas.spec.ts`.
- **Decisões adotadas:** Estende EDX-07 (RN-11/12). Idempotência via status terminal. Coordenar consolidação do event bus com spec 03.
- **Arquivos-alvo:** `src/app/api/webhooks/asaas/route.ts`, `test/api/webhooks-asaas.spec.ts`, `src/lib/webhooks/asaas-handlers.ts`

### EDX-42 · Schema + service: PlatformInvoice + cobrança cartão
- **Spec 09 / Fatia 1 · P0 · Depende de: EDX-07**
- **Objetivo:** Model `PlatformInvoice` + service de fatura mensal (mensalidade SaaS + negativação) + cobrança via Asaas. **Usa pricing MOCK (EDX-DEC-01).**
- **Scope:**
  - Migration: `PlatformInvoice` + campos novos em Unit (asaasCardTokenEnc, cardLast4, cardExpiry, bankName, bankAgency, bankAccount, bankHolder); enum `PlatformInvoiceStatus`
  - `createPlatformInvoice(unitId, month)` (itemsJson, OPEN, `POST /payments`)
  - handler `PAYMENT_CONFIRMED` → PlatformInvoice PAID (idempotente)
  - `GET /api/platform-invoices`, `GET .../[id]/pdf` (stub)
  - testes unitários + integração sandbox
- **Not-Included:** UI (EDX-43), troca de plano (EDX-43), tokenização interativa (EDX-43), PDF renderizado
- **DoD-comando:** `pnpm typecheck && pnpm test:run && npm run test:integration:platform-invoice -- --reporter=line`
- **TDD (RED primeiro):** `createPlatformInvoice` com mock Asaas → `{id, asaasPaymentId, status:'OPEN'}` — RED sem service.
- **Decisões adotadas:** Pricing MOCK `39900/59900/79900` até EDX-DEC-01. Banco/agência/conta em Unit (P-03). Atomicidade total via `prisma.$transaction` (P-05). `centsToReais` na borda.
- **Arquivos-alvo:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add_platform_invoice.sql`, `src/lib/integration/asaas/types.ts`, `src/lib/services/platform-invoice.service.ts`, `src/lib/db.ts`, `src/app/api/platform-invoices/route.ts`, `[id]/route.ts`, `src/app/api/webhooks/asaas/route.ts`, `tests/services/platform-invoice.test.ts`, `tests/integration/asaas-payments.test.ts`

### EDX-43 · UI: Meu Plano (aba Settings)
- **Spec 09 / Fatia 2 · P1 · Depende de: EDX-42**
- **Objetivo:** Aba "Meu plano": plano ativo, modal troca, modal cartão (tokenização Asaas), lista faturas.
- **Scope:**
  - `<PlanTab>`: card plano (planId, preço, limite, cobranças do mês, próxima fatura); modal troca (grid 2x2); modal cartão (Zod + tokenização); lista faturas (status badge + PDF stub)
  - Clerk: unitId do contexto; modo escuro
- **Not-Included:** Lógica de cobrança (EDX-42), PDF renderizado, abas Dados/Taxas (EDX-45)
- **DoD-comando:** `pnpm typecheck && pnpm dlx playwright test billing-platform --reporter=line`
- **TDD (RED primeiro):** `/settings/plan` → card com planId='basico', preço '399.00', "Mudar de plano" abre modal com 4 opções.
- **Decisões adotadas:** Pricing MOCK (EDX-DEC-01). SKIP re-auth Clerk (EDX-DEC-05). Reutiliza form Zod de cartão da spec 01. PDF stub 404.
- **Arquivos-alvo:** `src/components/settings/plan-tab.tsx`, `modals/change-plan-modal.tsx`, `change-card-modal.tsx`, `src/app/api/platform-invoices/[id]/pdf/route.ts`, `src/lib/services/billing.service.ts`, `tests/e2e/billing-platform.spec.ts`

### EDX-44 · Importação CSV (upload, validação, import atômico)
- **Spec 09 / Fatia 3 · P1 · Depende de: EDX-42, EDX-01**
- **Objetivo:** Fluxo de importação: stepper 3 etapas, parser CSV + Zod, correção inline, import atômico de Guardian+Student+Enrollment.
- **Scope:**
  - Model `ImportJob` + migration (status enum, contadores, errorsJson)
  - parser CSV (papaparse + Zod): aluno/nascimento/pagante/cpf/email/telefone/plano/materias; validações por linha (CPF checksum, plano enum, materias vs Subject ativo)
  - limite 5.000 linhas; stepper (dropzone / validação + correção / concluído)
  - import via `prisma.$transaction` (reutiliza Guardian por CPF — RN-15, reverte em falha)
  - download CSV de erros + modelo CSV
- **Not-Included:** Billing (EDX-42/43), Settings (EDX-45), matrícula manual (spec 02)
- **DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm dlx playwright test csv-import --reporter=line`
- **TDD (RED primeiro):** CSV 7 linhas (4 ok, 3 erro CPF) → `{totalRows:7, validRows:4, errorRows:3, errors:[...]}` — RED sem parser.
- **Decisões adotadas:** Bloquear "Importar" com erros (P-02). CPF duplicado → reutilizar Guardian, criar Student/Enrollment novos (P-06). PII AES-256-GCM antes de persistir. `prisma.$transaction` (Guardian, Student batch, Enrollment batch).
- **Arquivos-alvo:** `prisma/schema.prisma` (ImportJob), `src/lib/csv/parser.ts`, `validator.ts`, `src/lib/services/import.service.ts`, `src/components/import/*`, `src/app/api/import/route.ts`, `tests/e2e/csv-import.spec.ts`, `tests/services/import.test.ts`

### EDX-45 · Settings abas Dados e Taxas
- **Spec 09 / Fatia 4 · P1 · Depende de: EDX-42**
- **Objetivo:** Abas "Dados da escola" e "Taxas": exibição, edição, persistência de campos operacionais + config de taxa.
- **Scope:**
  - Aba Dados: 4 cards (Dados escola, Conta repasse, Regras cobrança, Contrato) com Editar
  - modais: Dados (razão, CNPJ, email, telefone), Conta repasse (bank* em Unit), Regras (`closingDay < dueDay`, 1..28), Contrato (toggle `requireSignedContract`)
  - Aba Taxas: 2 selects FeeChoice (cardFeePayer, negativacaoFeePayer) + banner; salva em BillingConfig
  - Clerk unitId; modo escuro
- **Not-Included:** Meu Plano (EDX-43), billing (EDX-42), importação (EDX-44)
- **DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm dlx playwright test settings --reporter=line`
- **TDD (RED primeiro):** `/settings/dados` → card Regras cobrança → editar closingDay=5 dueDay=3 → erro "closingDay deve ser menor que dueDay" — RED sem Zod.
- **Decisões adotadas:** SKIP re-auth (EDX-DEC-05 / P-04). Banco em Unit (P-03). Zod reutilizável (front + back). `closingDay < dueDay` via CHECK constraint + Zod. Conta bancária mascarada (últimos 4).
- **Arquivos-alvo:** `src/components/settings/data-tab.tsx`, `modals/edit-school-data-modal.tsx`, `edit-bank-account-modal.tsx`, `edit-billing-rules-modal.tsx`, `edit-contract-modal.tsx`, `src/components/settings/fees-tab.tsx`, `src/lib/schemas/billing.schema.ts`, `src/app/api/settings/billing/route.ts`, `prisma/migrations/<ts>_add_billing_checks.sql`, `tests/e2e/settings.spec.ts`, `tests/services/settings.test.ts`

### EDX-46 · Config firstChargeMode na UI de Settings (Regras de cobrança)
- **Spec 03 decisão / P1 · Depende de: EDX-45, EDX-08**
- **Objetivo:** Adicionar seletor de `firstChargeMode` no modal "Regras de cobrança" (já existente em EDX-45), para que a escola escolha a regra do 1º boleto.
- **Scope:**
  - Campo adicional no modal `EditBillingRulesModal`: radio/select "Primeiro boleto" com opções "Proporcional aos dias restantes" (`PROPORTIONAL`) e "Isentar 1º mês" (`WAIVED`)
  - Texto explicativo por opção (ex: "A família paga apenas os dias restantes do mês de matrícula")
  - Validação: opção selecionada até 5 dias antes do fechamento do mês (`closingDay`)
  - Salvar via `PATCH /api/settings/billing` (já definido em EDX-45)
  - Exibir valor atual no card "Regras cobrança"
- **Not-Included:** Lógica de cálculo (EDX-09), schema (EDX-08), outros campos de Settings
- **DoD-comando:** `pnpm typecheck && pnpm dlx playwright test settings-first-charge --reporter=line`
- **TDD (RED primeiro):** modal abre com `PROPORTIONAL` selecionado por default; salvar `WAIVED` persiste em `BillingConfig.firstChargeMode`; card exibe opção atual.
- **Decisões adotadas:** UI mínima — radio de 2 opções. Texto descritivo obrigatório. Pode ser acoplado ao modal de Regras de EDX-45 (não cria modal próprio). Default visual = PROPORTIONAL.
- **Arquivos-alvo:** `src/components/settings/modals/edit-billing-rules-modal.tsx`, `src/app/api/settings/billing/route.ts` (extend schema Zod), `tests/e2e/settings.spec.ts`

---

## Lembretes operacionais

- **TENANT_MODELS (sem RLS):** todo model novo tenant-scoped (com `unitId`) **precisa ser registrado em `src/lib/db.ts` → `TENANT_MODELS`**. Não há RLS no Postgres — o isolamento de tenant é garantido em código. Models afetados nesta backlog: `Student`, `Enrollment`, `Invoice`, `Payment`, `Dunning`, `NfseConfig`, `CardToken`, `PortalSession`, `BankAccount`, `Transfer`, `Anticipation`, `PlatformInvoice`, `ImportJob`. Confirmar a entrada em `TENANT_MODELS` no DoD de cada task de schema.
- **Webhook Asaas é endpoint único:** `src/app/api/webhooks/asaas/route.ts` (criado em EDX-07) é estendido por EDX-11, EDX-15, EDX-16, EDX-22, EDX-41 e EDX-42. Não criar receivers paralelos — adicionar `case` ao switch.
- **Primeiro ticket sugerido pro smoke Multica → Claude Code:** **EDX-02** (E2E do onboarding — spec 01 já implementada, Playwright vazio). É o caminho mais curto pra validar o pipeline de ponta a ponta antes de encarar a cadeia de schema.

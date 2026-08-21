# Plano Técnico — Education X (MVP)
> Versão 1.0 · Junho 2026 · **Documento técnico para o Claude Code implementar.**
> Para o resumo sem jargão (acompanhamento com coach), ver [ROADMAP.md](ROADMAP.md).
> Alinhado a: SYSTEM-DESIGN.md · DEVOPS.md · `.claude/rules/` (regras de código versionadas no repo) · `AGENTS.md` (pipeline + modelos)

## Como usar este documento

Cada tarefa é uma unidade de trabalho para o Claude Code, com:
- **Job to be done** — o resultado que o usuário/sistema obtém
- **Definition of Done (DoD)** — critérios objetivos de conclusão
- **Modelo Claude** — qual tier usar e por quê
- **Testes** — Vitest (unit/service) + Playwright (E2E) quando há UI
- **Dependências** — o que precisa estar pronto antes

---

## 📅 Plano de Entrega — escopo = protótipo aprovado completo

> **Acompanhamento sem jargão:** ver [ROADMAP.md](ROADMAP.md). Esta seção é a versão técnica.
> **Fonte de verdade: o protótipo aprovado** (`design-handoff/`). Tudo o que está no protótipo entra no MVP — Portal do Responsável, saque/antecipação, importação CSV, billing da plataforma e cartão **deixaram de ser pós-MVP** e viraram fases do MVP (decisão Rafael, 13/jun). Ver `DISCREPANCIAS-roadmap-vs-prototipo.md`.
> Premissa de velocidade: **Asaas já liberada** (conta + `PAYMENT_DUNNING:WRITE` + sandbox) e o Rafael **revisa todo dia.** Sem espera externa.

### Ordem de construção: núcleo demonstrável primeiro

O escopo cresceu (9 fluxos do protótipo), mas a ordem é por **valor de venda**, não por dependência pura: o **ciclo que o Pimenta demonstra pra vender** fica pronto primeiro; o resto do MVP vem logo depois. Não é corte de escopo — é sequência.

**Bloco A — Núcleo demonstrável (o que o Pimenta mostra):**
onboarding → matrícula → cobrança (boleto/PIX) → NFS-e → negativação → dashboard

**Bloco B — Resto do MVP (logo após a demo):**
portal do responsável → saque/antecipação → importação CSV → billing da plataforma → cobrança extra → settings completo

### Cálculo do prazo (bottom-up — base das datas)

As datas saem de uma estimativa por complexidade de cada ticket, não de "1 fase por dia". Ver tabela completa em `ESTIMATIVA-bottom-up.md`.

- **56,5 sessões de Claude** (1 sessão = 1 unidade de trabalho que cabe numa janela de contexto produtiva; tela dumb ≈ 0,5 · service ≈ 1 · integração crítica ≈ 2)
- **Alavanca: 1 sessão = 1,5h de revisão do Rafael** (ler diff → preview → 3 breakpoints → validar → aprovar/corrigir)
- 56,5 × 1,5h = 84,75h **+10% folga = ~93h** ÷ **6h/dia = ~15,5 dias úteis**

| Semana | Dias úteis | Fases | O que fica pronto | Bloco |
|--------|-----------|-------|-------------------|-------|
| **Sem 1** · 16–20/jun | 5 (30h) | 0.x, 1.x, 2.x | Repo + onboarding (wizard 4 passos) + auth/tenant + planos + matrícula (via link + manual) | A |
| **Sem 2** · 23–27/jun | 5 (30h) | 3.x, 4.x, 5.x | Cobrança boleto/PIX + webhook + NFS-e + régua + cron + contract tests Asaas real + negativação | A |
| **Sem 3** · 30/jun–4/jul | 5 (30h) | 6.x, 7.x, 8.x | Painel (4 relatórios + funil) + cobrança extra → **núcleo pronto ~2/jul** → portal + saque/antecipação | A→B |
| **Sem 4** · 7–8/jul | ~1,5 (9h) | 9.x | Billing da plataforma + importação CSV + settings | B |

> **🎯 Núcleo demo-ready pro Pimenta: ~2/jul** (fim do Bloco A: cadastra → matricula → cobra → recebe → emite NF → negativa → painel, validado no real). **MVP completo (9 fluxos): ~8/jul.**
>
> **Sobre a data:** ancorada em 6h/dia sustentáveis + 1,5h/sessão. Se o ritmo cair pra 4h/dia, o calendário estica pra ~5,5 semanas (MVP ~25/jul) sem furar. Protótipo inteiro entra no MVP — nada cortado, só ordenado por valor de venda.

### Única pendência técnica (decisão do Rafael, rápida)

- **CONFIRMED vs RECEIVED** — qual evento Asaas dispara o estado PAID interno. Decidir **antes da Sem 2** (bloqueia o webhook da 3.3). Todas as pendências de infra da Asaas já estão resolvidas.
- **Pricing dos planos Education X** (Básico/Crescimento/Pro) — Rafael define na semana de 15/jun. Bloqueia a Fase 9 (billing), não o núcleo.

### Nota anti-burnout (do ROADMAP)

O calendário é o piso confortável, não o teto. Uma semana mais lenta empurra a data, não recalcula tudo. Bateu o marco da semana = sucesso, registre.

### Decisões de base (travadas)

| Decisão | Valor | Fonte |
|---------|-------|-------|
| Arquitetura | **Next-só (monolito modular)** — não NestJS | SYSTEM-DESIGN.md |
| Repo | Novo em `/Users/rafae/projetos/education-x` | Decisão Rafael |
| Migra do repo antigo | Só o cliente Asaas (revisado pelo Coda) + tokens Alfabeto | Decisão Rafael |
| Valores monetários | **centavos (Int)** — nunca Float; conversão reais só na borda Asaas **e no frontend** | SYSTEM-DESIGN.md |
| Entidades | **Inglês** (`Unit`, `Guardian`, `Student`...) — não `Escola`/`Responsavel` | `.claude/rules/backend.md` |
| Infra de partida | Vercel Pro + Supabase Pro `sa-east-1` (~$45/mês) | DEVOPS.md |
| Protótipo visual | [claude.ai/design](https://claude.ai/design/p/60949813-42bb-41e7-963f-c2ccf9859a1d?file=Education+X+-+Prot%C3%B3tipo.html) | — |

### Regras inegociáveis (`.claude/rules/` + CLAUDE.md)
- **TDD**: RED → GREEN → REFACTOR. Teste antes do código.
- **Cobertura**: 80% global + **90% nos módulos críticos** (`services/invoice/`, `services/negativacao/`)
- **500 linhas** máx por arquivo; split antes de ultrapassar
- **Camadas**: Component → Hook → Store → Service → API (nunca pular)
- **Nomenclatura**: entidade é `Invoice` (nunca "boleto" — isso é billingType)
- **Idioma**: código/comentário em inglês; UI em pt-BR
- **Branch**: feature/[slug] → develop; nunca commit direto em main/develop
- **Quality gate**: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build` + Playwright 3 breakpoints

---

## FASE 0 — Repo novo, Migração e Fundação

### Tarefa 0.1 — Coda revisa o cliente Asaas (antes de migrar)
- **Job**: confirmar que o cliente Asaas do `education-x-new` tem qualidade e aderência aos guidelines antes de copiar
- **Subtarefas**:
  - Coda audita `/Users/rafae/projetos/education-x-new/src/lib/integration/asaas/` (13 métodos, mock+live, ~718 linhas de teste)
  - Checar: nomenclatura, camadas, cobertura real, tratamento de erro, tipos
  - Veredito: migra como está / migra com ajustes / refaz
- **DoD**: veredito registrado; lista de ajustes (se houver) antes da migração
- **Modelo**: **Sonnet** (Coda) — julgamento de qualidade de código
- **Testes**: rodar a suite Asaas existente para confirmar verde
- **Dependências**: nenhuma

### Tarefa 0.2 — Criar repo novo + scaffold (Next-só)
- **Job**: criar `/Users/rafae/projetos/education-x` limpo e rodando
- **Subtarefas**:
  - `create-next-app` (Next 16, React 19, TS strict, App Router, Tailwind 4)
  - **Migrar cliente Asaas** (com ajustes do Coda da 0.1) → `src/lib/integration/asaas/`
  - **Migrar tokens Alfabeto** de `/Users/rafae/projetos/_archive/education-x/specs/asaas/design/alfabeto-source` → `src/styles/alfabeto.css`
  - `prisma/schema.prisma` base + `src/lib/db.ts` (singleton)
  - Clerk instalado; `.env.example` validado por Zod no startup (`config/env.ts`)
  - `shadcn init` + componentes base (Button, Input, Card, Table, Dialog, Form, Select) usando tokens Alfabeto
- **DoD**: `pnpm dev` sobe; `pnpm build` passa; env inválido derruba app no boot; cliente Asaas migrado e testes verdes; tokens Alfabeto aplicados
- **Modelo**: **Sonnet** (scaffold + config) + **Haiku** (cópia mecânica Asaas/tokens)
- **Testes (Vitest)**: env.ts rejeita vars faltantes; suite Asaas verde no repo novo
- **Dependências**: 0.1

> **Nota sobre specs:** as specs detalhadas dos épicos serão **reescritas em etapa futura**. Este roadmap referencia os épicos por nome; quando uma tarefa precisar da spec detalhada, ela é escrita antes da implementação daquela tarefa.

### Tarefa 0.3 — Quality gate e CI (cobertura por módulo)
- **Job**: barrar todo PR que quebre teste ou caia abaixo do threshold
- **Subtarefas**:
  - `vitest.config.ts`: threshold **80% global + 90% nos módulos críticos** `services/invoice/` e `services/negativacao/` (M5)
  - `playwright.config.ts`: 3 projetos (1440×900 / 768×1024 / 375×667)
  - CI (GitHub Actions ou Vercel): test:run + typecheck + lint + build + e2e
- **DoD**: CI reprova PR com teste quebrado, cobertura global <80%, ou módulo crítico <90%
- **Modelo**: **Sonnet** — configuração de gate com thresholds diferenciados
- **Testes**: o próprio gate roda contra os testes do cliente Asaas existente
- **Dependências**: 0.2

---

## FASE 1 — Onboarding da Escola (Épico 01 + 05 parcial)

> **Job macro**: Admin IX cadastra uma escola nova → subconta Asaas criada + config + aceite IX↔Escola → escola pronta para receber alunos. Métrica: onboarding < 30 min.

### Tarefa 1.1 — Schema base + criptografia
- **Job**: ter as entidades `Unit`, `BillingConfig` no banco com API key criptografada
- **Subtarefas**:
  - Schema Prisma: `Unit` (cnpj, companyType, phone, address, suspended), `BillingConfig` (campos Asaas/NFS-e/negativação). **Nomenclatura inglesa** — não `Escola`.
  - **Valores em centavos (Int)** — nunca Float (corrige bug do schema antigo `amount Float`)
  - `crypto.ts`: encrypt/decrypt AES-256-GCM com IV aleatório (D7)
  - Migration
- **DoD**: migration aplica; round-trip encrypt→decrypt testado; IV único por chamada; valores em centavos
- **Modelo**: **Sonnet** — criptografia correta é crítica; erro aqui vaza credencial
- **Testes (Vitest)**: crypto round-trip; IV aleatório; **decrypt com chave errada → lança erro** (B11); schema Zod de Unit (CNPJ inválido, dueDay range)
- **Dependências**: 0.3

### Tarefa 1.2 — Service de onboarding + criação de subconta
- **Job**: criar subconta Asaas e persistir credenciais criptografadas, com rollback em falha
- **Subtarefas**:
  - `onboarding-service.ts`: chama `createSubAccount` (cliente Asaas), recebe apiKey/walletId, criptografa, persiste
  - Rollback se Asaas falhar (não deixa Unit órfã)
  - Endpoint `POST /api/setup/escola` (201/400/409 CNPJ duplicado/502 Asaas)
- **DoD**: cria subconta; criptografa apiKey; rollback em falha Asaas; CNPJ duplicado → 409
- **Modelo**: **Sonnet** — orquestração com rollback e tratamento de falha externa
- **Testes (Vitest)**: cria subconta; criptografa; rollback; 409; 502
- **Dependências**: 1.1

### Tarefa 1.3 — UI de onboarding (wizard 4 passos) + aceite IX↔Escola
> Referência pixel-perfect: `design-handoff/project/app/screens-a.jsx` (FlowA). São **4 passos + loading + sucesso**, não um form único.
- **Job**: admin IX preenche dados da escola em 4 passos, aceita termos, cria subconta, conclui em < 30 min
- **Subtarefas**:
  - Schema: `TermsVersion`, `TermsAcceptance` (Épico 05)
  - Wizard 4 passos (Component dumb → useOnboarding → onboardingStore → service):
    - **Passo 1 — Dados:** nome, CNPJ, tel, email, CEP, endereço, complemento, cidade, UF, **toggle franquia → campo franquia-mãe** (ex: "Kumon Brasil")
    - **Passo 2 — Regras de cobrança:** dia vencimento, dia fechamento, multa (default 2%), juros (default 1% a.m.), **toggles: habilita SPC / cobrança automática / aceita cartão** + **FeeRouter** (quem paga taxa de cartão e taxa de negativação: `responsavel` | `escola`)
    - **Passo 3 — Documentos:** inscrição municipal (obrigatória p/ NFS-e) + **códigos de serviço NFS-e por matéria** (array addable: `{materia, codigo}`) + upload de contrato PDF (FileDrop — apresentado ao responsável no link de matrícula)
    - **Passo 4 — Revisão:** 3 blocos editáveis + botão "Criar escola"
    - **Loading:** "Validando CNPJ → Criando subconta → Aplicando regras" (rollback automático em falha)
    - **Sucesso:** "Importar matrículas" (Fase 9) / "Ir ao painel"
  - Aceite clickwrap: checkbox + registra IP/timestamp/versão; bloqueia conclusão sem aceite (D19)
- **DoD**: 4 passos completos com todos os campos acima; FeeRouter persiste no BillingConfig; códigos de serviço NFS-e por matéria salvos; contrato anexado; aceite registra IP+versão; sem aceite não conclui; pt-BR; valores em reais (conversão no frontend)
- **Modelo**: **Sonnet** (lógica de wizard/store + FeeRouter) + **Haiku** (componentes shadcn dumb)
- **Testes (Vitest)**: aceite registra IP/versão; onboarding bloqueado sem aceite; FeeRouter persiste; códigos de serviço por matéria. **(Playwright)**: wizard 4 passos nos 3 breakpoints, console limpo
- **Dependências**: 1.2
- **Nota schema:** `BillingConfig` precisa de `cardFeePayer`, `negativacaoFeePayer`, `municipalRegistration`, `serviceCodesBySubject` (Json), `requireSignedContract` (bool), `closingDay`, `autoBilling` (bool), `acceptsCard` (bool) — ampliar o schema da 1.1.

### Tarefa 1.4 — Auth, RBAC e isolamento de tenant (C1) 🔴
- **Job**: garantir que cada escola só acessa os próprios dados; ninguém lê dados de outra escola
- **Subtarefas**:
  - Clerk 6 middleware no App Router
  - `getUnitContext(auth)` — `unitId` sempre vem da **sessão Clerk, nunca de parâmetro HTTP** (SYSTEM-DESIGN.md)
  - **Prisma client extension** que injeta `unitId` automaticamente em toda query (nenhuma query pode "esquecer" o scope)
  - 3 trust boundaries: Admin IX (todas) / Fran (só a Unit dela) / público (rotas de matrícula, não autenticadas + rate-limited)
- **DoD**: query sem `unitId` é impossível por construção; escola A → invoice da escola B → **403**; rotas públicas marcadas + rate limit; `unitId` nunca vem de HTTP param **em rotas Clerk-autenticadas** (exceção: o webhook público da Asaas usa `unitId` em query, validado pelo token secreto da subconta — não é rota autenticada por Clerk)
- **Modelo**: **Sonnet** — isolamento de tenant é segurança crítica, padrão conhecido
- **Testes (Vitest)**: extension injeta unitId; query cross-tenant retorna vazio. **(Playwright)**: escola A acessa invoice de B → 403
- **Dependências**: 1.1, 1.3

### Tarefa 1.5 — Termos da plataforma + isenção da Impact X
> Redigir o **conteúdo** dos termos (o mecanismo de aceite clickwrap está em 1.3/2.2). Sem advogado agora — versão funcional pra lançar; revisão jurídica fica pós-MVP.

- **Job**: ter os textos legais que protegem a IX e definem responsabilidades, prontos para aceite
- **Subtarefas**:
  - **Termos de Uso IX↔Escola** (aceite no onboarding) — com a **cláusula de isenção**: a Escola é a responsável legal pela cobrança e negativação dos seus responsáveis; a IX é só a plataforma tecnológica. A IX não é parte na relação Escola↔Responsável.
  - **Termos Escola↔Responsável** (aceite na matrícula) — condições de cobrança, multa/juros, possibilidade de negativação, cancelamento
  - **Política de Privacidade básica** — quais dados são coletados e por quê (sem o aparato LGPD completo; isso é pós-MVP)
  - Versionar os termos (`TermsVersion`) — rastreia qual versão cada um aceitou
  - Cláusulas de isenção: bloco fixo, não editável pela escola
- **DoD**: 3 textos escritos e versionados; cláusula de isenção da IX presente e não-editável; aceite registra qual versão
- **Modelo**: **Sonnet** — redação de termos com foco na proteção do negócio (não é trivial, mas não exige Opus)
- **Testes (Vitest)**: aceite vincula à versão correta; cláusula de isenção sempre presente
- **Dependências**: 1.1
- **Nota**: estes textos são "bom o suficiente para lançar e validar". Revisão jurídica formal = pós-MVP (ver seção Pós-MVP).

---

## FASE 2 — Planos, Matérias e Matrícula (Épico 06 + 05)

> **Job macro**: escola cadastra matérias/valores/planos; responsável se matricula via link, preenche dados + aceita termos; escola aprova.
> **Paralelismo:** 2.1 depende só de 1.1 — pode rodar em paralelo com 1.2→1.4.

### Tarefa 2.1 — Schema + service de planos, matérias e descontos
> Regras do protótipo: plano por **conta** (não por aluno) · até **5 alunos** por matrícula · **dois descontos cumulativos** (plano + negociação) · cobrança = **assinatura recorrente, sem parcelamento** · matérias: Matemática, Português, Inglês, **Japonês**.
- **Job**: escola define matérias (com valor) e planos (recorrência); sistema calcula mensalidade com os dois descontos
- **Subtarefas**:
  - Schema: `Subject` (priceCents), `Plan` (recurrence enum: Mensal/Trimestral/Semestral/Anual, `planDiscountPct`), `Enrollment` (planId, cancelledAt, cancelReason, **selfPayer bool**), `EnrollmentStudent` (até 5 por Enrollment, `negotiationDiscountType` percent|fixed, `negotiationDiscountValue`)
  - `plans-service.ts`: CRUD matéria/plano; soma de matérias do aluno
  - `compute-monthly.ts` (função pura): aplica **desconto de plano** (Trim -5% / Sem -10% / Anual -20% sobre base) **e** **desconto de negociação por aluno** (% ou R$), soma os alunos → total mensal; calcula economia anual
  - `compute-pro-rata.ts` (função pura): proporcional aos dias entrada/saída (D23)
  - Validação: máximo 5 alunos por Enrollment
- **DoD**: matéria+valor configurável; mensalidade = soma × período com os dois descontos; pro-rata correto; limite de 5 alunos; selfPayer suportado; tudo em centavos
- **Modelo**: **Sonnet** — regra de negócio de pricing com descontos cumulativos
- **Testes (Vitest)**: computeMonthly com desconto de plano + negociação (% e fixed); soma multi-aluno; economia anual; limite 5 alunos rejeita o 6º; computeProRata entrada/saída
- **Dependências**: 1.1

### Tarefa 2.2 — Matrícula via link (responsável, mobile) + duplo aceite
> Referência: `design-handoff/project/app/screens-b.jsx` (FlowB) — 4 steps mobile-first. Contrato **personalizado da escola** (anexado no onboarding 1.3) é exibido para leitura + aceite.
- **Job**: responsável preenche dados + aluno + plano + aceita o contrato da escola (ACEITE 1); escola aprova (ACEITE 2)
- **Subtarefas**:
  - Fluxo público de matrícula (mobile-first, 4 steps: dados → aluno → plano → termos, rate-limited)
  - CPF/email/telefone obrigatórios (D8) — bloqueia sem eles
  - Exibe o contrato PDF personalizado da escola para leitura inline + clickwrap do responsável (ACEITE 1, consentimento parental) + aprovação da escola na revisão (ACEITE 2)
  - `Guardian` com asaasCustomerId, asaasOptOut
- **DoD**: matrícula bloqueada sem CPF/email/telefone; bloqueada sem aceite; contrato da escola exibido; duplo aceite registrado; consentimento parental capturado
- **Modelo**: **Sonnet** (fluxo + validação) + **Haiku** (telas)
- **Testes (Vitest)**: bloqueio sem CPF/aceite; duplo aceite. **(Playwright)**: matrícula via link nos 3 breakpoints; tempo < 5 min
- **Dependências**: 2.1, 1.3 (contrato anexado)

### Tarefa 2.3 — Matrícula manual (escola preenche) + confirmação do responsável
> Referência: `design-handoff/project/app/screens-c3.jsx` (C6 + FlowConfirm). Para escolas com processo interno próprio: a escola preenche **tudo** e envia link onde o responsável **só confirma + aceita**.
- **Job**: orientador preenche cadastro completo (responsável + até 5 alunos + plano + desconto) e envia link; responsável confirma e dá aceite
- **Subtarefas**:
  - Tela C6 com 2 abas: **1 · Cadastro** (responsável: nome, CPF, email, tel WhatsApp + **toggle endereço** → cep/cidade/rua/número; até 5 alunos com checkbox "aluno é o próprio responsável" → copia pagante) e **2 · Plano e cobrança** (plano radio, desconto de negociação % ou R$, dia de vencimento, calculadora em tempo real: mensalidade cheia → desconto plano → desconto negociação → economia anual → total)
  - Gera link de confirmação enviado ao email do responsável
  - `FlowConfirm` (mobile): responsável vê dados pré-preenchidos readonly + lê contrato + checkbox aceite → confirma
  - Habilitação aba 1→2: `pagante && email && todos alunos com nome`
- **DoD**: C6 completo 2 abas; até 5 alunos; selfPayer copia pagante; calculadora correta; link enviado; FlowConfirm bloqueado sem aceite; aceite registrado
- **Modelo**: **Sonnet** (lógica/calculadora) + **Haiku** (telas)
- **Testes (Vitest)**: habilitação de aba; calculadora; selfPayer; aceite no confirm. **(Playwright)**: C6 desktop + FlowConfirm mobile
- **Dependências**: 2.1, 1.3

---

## FASE 3 — Emissão de Cobrança + Webhook (Épico 01 núcleo)

> **Job macro**: gerar boleto/PIX para o responsável; receber confirmação de pagamento via webhook idempotente.

### Tarefa 3.1 — Resolver/criar cliente Asaas
- **Job**: garantir o Responsável como customer na subconta (reusa se existe)
- **Subtarefas**:
  - `resolveCustomer`: `findCustomerByCpfCnpj` → reusa, senão `createCustomer`
- **DoD**: cria se não existe; reusa se existe; idempotente
- **Modelo**: **Haiku** — wrapper de chamada com lógica simples de reuso
- **Testes (Vitest)**: cria; reusa
- **Dependências**: Fase 1 (subconta), 2.2 (guardian)

### Tarefa 3.2 — Emitir Invoice (boleto/PIX)
- **Job**: gerar cobrança com PIX embutido, multa/juros, idempotente
- **Subtarefas**:
  - `invoice-service.ts` (NUNCA "boleto-service"): `createPayment`
  - **Conversão centavos→reais só na borda do cliente Asaas**; `externalReference` para idempotência
  - Aplica fine/interest do BillingConfig
  - Schema `Invoice` (asaasPaymentId, bankSlipUrl, invoiceUrl, pixQrCode, barCode, amountInCents)
  - Editar (PUT) / cancelar (DELETE) via cliente Asaas
  - **Cancelar invoices PENDING futuras quando enrollment é cancelado** (M8)
- **DoD**: emite com PIX; converte centavos→reais só na borda; idempotente; erro → status ERROR; cancelamento de matrícula cancela cobranças futuras
- **Modelo**: **Sonnet** — conversão de valores e idempotência são pontos de bug comuns
- **Testes (Vitest)**: centavos→reais; externalReference; fine/interest; idempotência; erro→ERROR; cancela invoice futura
- **Dependências**: 3.1

### Tarefa 3.3 — Webhook idempotente + event bus (M4, M9)
- **Job**: receber eventos Asaas e despachar para handlers, sem duplicar e sem virar god-function
- **Subtarefas**:
  - `POST /api/webhooks/asaas` com token no **header `X-Asaas-Token`** (M9 — não em query string)
  - **`WebhookEventBus` / `dispatchWebhookEvent(event)`** (M4): handlers se registram; 4.1 (NFS-e) e 5.2 (regularização) registram handler, **não editam o webhook**
  - `WebhookEvent` para idempotência (skip duplicado)
  - Mapear evento Asaas → estado interno PAID (ver pendência CONFIRMED vs RECEIVED)
- **DoD**: evento→handler via bus; token inválido→401; desconhecido→ignora; duplicado→skip; handler novo não toca no core do webhook
- **Modelo**: **Sonnet** — idempotência, segurança e design de dispatcher
- **Testes (Vitest)**: dispatch chama handler certo; 401 token errado; desconhecido; duplicado; handler isolado
- **Dependências**: 3.2

---

## FASE 4 — Nota Fiscal + Régua de Cobrança (Épico 01 + 02)

> **Job macro**: emitir NFS-e automática ao pagar; régua de avisos nativa Asaas; emissão em lote no fechamento.

### Tarefa 4.1 — NFS-e automática
- **Job**: emitir nota fiscal sempre que cobrança é paga (D9)
- **Subtarefas**:
  - `nfse-service.ts`: `createInvoice` (cliente Asaas) ao receber PAID — **registra handler no event bus** (M4)
  - Schema `NfseRecord` (status, number, pdfUrl, xmlUrl)
  - Pula se nfseMunicipal* não configurado (pendente + alerta), não duplica
- **DoD**: NFS-e no PAID sempre; pula sem config municipal; não duplica
- **Modelo**: **Sonnet** — integração fiscal com estados (pendente/emitida/erro)
- **Testes (Vitest)**: emite no PAID; pula sem config; não duplica
- **Dependências**: 3.3

### Tarefa 4.2 — Régua de avisos (Asaas nativo)
- **Job**: configurar avisos automáticos por evento/canal (emails ficam no Asaas — DEVOPS.md)
- **Subtarefas**:
  - `updateNotificationSettings` para PAYMENT_CREATED, DUEDATE_WARNING, OVERDUE, RECEIVED
  - scheduleOffset (dias antes/depois)
- **DoD**: configura por evento/canal; scheduleOffset correto
- **Modelo**: **Haiku** — configuração de notificações via API, baixa complexidade
- **Testes (Vitest)**: config por evento; scheduleOffset
- **Dependências**: 3.2

### Tarefa 4.3 — Cron de emissão em lote
- **Job**: emitir cobranças automaticamente no dia de fechamento da escola
- **Subtarefas**:
  - `GET /api/cron/emit-batch` (Vercel Cron) no closingDay — fan-out por unidade, chunking de 50 (SYSTEM-DESIGN.md)
  - Loop createPayment com agregação (sucesso/erro/jáExiste)
  - Guard: pula `Unit.suspended`; **pula enrollment com `cancelledAt != null`** (M8)
  - **Isolamento de erro (B12):** falha em uma escola não derruba o lote
- **DoD**: emite escolas ACTIVE; pula suspended; pula matrícula cancelada; erro isolado por escola; idempotente
- **Modelo**: **Sonnet** — orquestração de lote com guards e isolamento de falha
- **Testes (Vitest)**: emite ACTIVE; pula suspended; pula cancelado; erro em 1 escola não interrompe lote; idempotente
- **Dependências**: 3.2, 4.1

### Tarefa 4.4 — Contract tests mock → Asaas sandbox (C2) 🔴 GATE DE SHIP
- **Job**: garantir que o mock (96% verde) bate com o comportamento real da Asaas v3 antes de ir ao ar
- **Subtarefas**:
  - Rodar a suite de integração contra **Asaas sandbox** (não mock)
  - Resolver discrepâncias de enum/campo entre mock e API real
  - Confirmar `PAYMENT_DUNNING:WRITE` funcional na conta
  - Resolver CONFIRMED vs RECEIVED (qual dispara PAID interno) — ver pendência
- **DoD**: suite passa contra sandbox; discrepâncias resolvidas; dunning write confirmado; evento PAID definido
- **Modelo**: **Sonnet** — reconciliação mock↔real exige análise de diffs de contrato
- **Testes**: a própria suite rodando contra sandbox
- **Dependências**: 3.3, 4.1
- **Bloqueante**: nenhum deploy de produção antes desta tarefa passar

---

## FASE 5 — Negativação SPC/Serasa (Épico 03)

> **Insight que simplifica tudo:** a **Asaas opera o fluxo legal de negativação** — incluindo o **aviso prévio obrigatório** ao devedor (exigência Serasa/CDC) e o prazo de notificação. Nós **não reimplementamos a garantia legal** — só criamos a **interface por cima** do que a Asaas já faz. O risco jurídico do aviso fica com a Asaas, que é o produto regulado.
> **Job macro**: a escola dispara negativação de um inadimplente pela nossa UI; a Asaas cuida do aviso + prazo + registro; regularizamos ao pagar.

### Tarefa 5.1 — Schema + interface de negativação
- **Job**: a escola seleciona um inadimplente e dispara negativação via Asaas
- **Subtarefas**:
  - Schema `AsaasNegativacao` (status sincronizado da Asaas, asaasDunningId, timestamps)
  - `negativacao-service.ts`: `createDunning` (Asaas cuida do aviso + prazo)
  - Filtro de elegibilidade na UI (OVERDUE ≥ dias, valor ≥ mínimo) — só pra não oferecer negativação inviável
  - Sincronizar status retornado pela Asaas (aguardando aviso / negativado / etc.)
- **DoD**: escola dispara negativação; status reflete o que a Asaas reporta; elegibilidade filtra na UI
- **Modelo**: **Sonnet** — integração + sincronização de status (não é mais garantia legal nossa)
- **Testes (Vitest)**: createDunning chamado; status sincroniza; elegibilidade filtra
- **Dependências**: 3.3

### Tarefa 5.2 — Regularização automática + UI de negativação (4 status)
> Referência: `design-handoff/project/app/screens-d.jsx` (NegativacaoBody + D1). 4 status, KPIs por status, timeline, opt-out, solicitar baixa, CPF mascarado.
- **Job**: ao pagar, remover a negativação; escola acompanha cada caso e age (negativar / opt-out / solicitar baixa)
- **Subtarefas**:
  - PAID → `removeDunning` → REGULARIZADO (**handler no event bus** de 3.3)
  - **4 status:** `emaviso` (prazo legal em curso) / `elegivel` (prazo cumprido, aguarda decisão) / `negativado` (no SPC/Serasa) / `regularizado`
  - Tela D0 (aba de Cobranças): KPIs por status + valor total + tabela com CPF mascarado (`maskCpf`) + filtros (Todos/Elegíveis/Em aviso/Negativados) + botão "Negativar" inline (só elegíveis) com modal (CDC art. 43)
  - Tela D1 (detalhe): timeline por status + ações dependentes de status:
    - `elegivel`: Negativar agora / Reenviar cobrança / **Não negativar (opt-out)** → responsável sai da régua permanentemente, dívida segue sem registro SPC
    - `emaviso`: Negativar (disabled, "aguardando prazo") / Reenviar / opt-out
    - `negativado`: **Solicitar baixa** / Reenviar
- **DoD**: pagamento remove negativação automaticamente; 4 status corretos; KPIs por status; CPF mascarado; opt-out e solicitar baixa funcionam; ações respeitam o status
- **Modelo**: **Sonnet** — handler + UI de acompanhamento com máquina de estados
- **Testes (Vitest)**: PAID → removeDunning + REGULARIZADO; opt-out; solicitar baixa; ações por status. **(Playwright)**: D0 + D1 nos 3 breakpoints
- **Dependências**: 5.1, **3.3** (depende do PAID detectado no webhook)

> **Confirmação pendente (4.4):** validar na sandbox que a Asaas realmente envia o aviso prévio e cuida do prazo legal. Se por algum motivo a Asaas NÃO fizer isso, reabrir o escopo de aviso do nosso lado. Até lá, assumimos que a Asaas cuida (é o comportamento documentado do produto de negativação deles).

---

## FASE 6 — Painel da Escola (UI de operação)

> **Job macro**: Fran vê recebido/a vencer/vencido, lista de cobranças com filtros, e age (reenviar, gerar extra).

### Tarefa 6.1 — Dashboard (3 abas: Dashboard · Relatórios · Extrato)
> Referência: `design-handoff/project/app/screens-c.jsx` (C0Dashboard). 3 abas; a aba Relatórios tem **4 sub-relatórios** + **funil de recuperação** (métrica nº1 de venda segundo os chats).
- **Job**: visão financeira completa: KPIs, 4 relatórios com gráficos, extrato, próximos vencimentos
- **Subtarefas**:
  - Service de KPIs (computeKpis: recebido/a vencer/vencido/alunos ativos)
  - **Aba Dashboard:** 4 KPIs + saldo (FinanceiroBody, Fase 8) + tabela "Próximos vencimentos" (busca, filtro forma, ordenável, paginada)
  - **Aba Relatórios:** 4 sub-relatórios — Cobrança, Inadimplência, Crescimento, Cancelamentos — cada um com gráfico intercambiável (barras/linha/pizza) + **bloco RecoveryHero** (funil: Venceu → Recuperado na régua → Foram p/ negativação → Quitado após aviso, com valores em R$)
  - **Aba Extrato:** tabela por lançamento (origem PIX/Boleto/Cartão/Saque/Antecipação, status disponível/a liberar/concluído), filtro Entradas/Saídas, busca, paginada
  - Botão "Exportar" único → modal PDF ou CSV
  - **valores convertidos para reais no frontend**
- **DoD**: 3 abas; 4 relatórios com gráfico trocável; funil de recuperação; extrato; filtros recomputam local; export PDF/CSV; pt-BR; valores em reais
- **Modelo**: **Sonnet** (store/service de KPI + funil) + **Haiku** (cards/gráficos dumb)
- **Testes (Vitest)**: computeKpis soma correta; zeros para vazio; funil agrega correto. **(Playwright)**: 3 abas nos 3 breakpoints
- **Dependências**: 3.3, 1.4 (scope por unidade)

### Tarefa 6.2 — Lista de cobranças + detalhe + ações
> Referência: screens-c.jsx (C3 lista, C4 detalhe). Detalhe tem timeline, pagamento (boleto/linha/PIX/QR), NFS-e quando paga.
- **Job**: listar cobranças com status, ver detalhe completo, reenviar/cancelar
- **Subtarefas**:
  - Lista (C3) com filtros (Todas/A vencer/Pagas/Vencidas) + busca + MonthPicker — recompute local
  - Detalhe (C4): valor (com multa+juros se vencida), bloco pagamento (boleto PDF, linha digitável, PIX copia-e-cola, QR), bloco NFS-e (se paga: nº + PDF + XML), timeline (emitida/enviada/aguardando/lembrete/etc.)
  - Ações: reenviar cobrança (WhatsApp/email/SMS); cancelar cobrança (modal); banner → negativação se vencida
- **DoD**: filtros recomputam local; detalhe mostra pagamento + NFS-e + timeline; reenviar/cancelar funcionam
- **Modelo**: **Sonnet** (lógica) + **Haiku** (UI tabela/detalhe)
- **Testes (Vitest)**: filtros; reenvio; cancelamento. **(Playwright)**: lista + detalhe 3 breakpoints
- **Dependências**: 6.1, 3.2

### Tarefa 6.3 — Cobrança extra avulsa
> Referência: screens-c.jsx (C5). Cobrança fora da mensalidade (multa de cancelamento, taxa, material).
- **Job**: orientador gera cobrança avulsa para um responsável
- **Subtarefas**:
  - Tela C5: busca de responsável (nome ou CPF), descrição (default "Multa de cancelamento"), valor, desconto (nenhum/% /R$), cálculo de total em tempo real
  - Reusa `emitInvoice` (Fase 3) para emitir
  - Botão "Gerar cobrança" disabled sem responsável ou valor
- **DoD**: gera cobrança avulsa com desconto; reusa fluxo de Invoice; validação de campos
- **Modelo**: **Sonnet** (lógica/desconto) + **Haiku** (tela)
- **Testes (Vitest)**: cálculo de desconto; validação. **(Playwright)**: C5 desktop
- **Dependências**: 3.2

---

---

## FASE 7 — Portal do Responsável (mobile) + Cartão (Épico 07 + 04 — agora no MVP)

> **Job macro**: o responsável paga, vê histórico, baixa NF, cadastra cartão para assinatura e recebe notificações — tudo pelo celular.
> Referência: `design-handoff/project/app/screens-e.jsx` (FlowE). Estava em pós-MVP; protótipo aprovado o traz pro MVP.

### Tarefa 7.1 — Portal: home, pagamento PIX, quitar vencido, histórico, NF
- **Job**: responsável vê próxima cobrança, paga via PIX, quita vencidos, vê histórico e baixa NFS-e
- **Subtarefas**:
  - Home (mobile): saudação + próxima cobrança ("Pagar agora") + banner de risco de negativação + histórico (com badge "NF disponível")
  - Pagar PIX: QR + copia-e-cola + "Já paguei" → sucesso
  - Quitar vencido: valor atualizado (original + multa 2% + juros 1% a.m., breakdown) + aviso de regularização automática
  - Detalhe da cobrança: dados + forma + NFS-e (PDF) se paga
  - Centro de notificações: risco negativação / a vencer / mensagens da escola
- **DoD**: paga via PIX; quita vencido com valor atualizado correto; baixa NF; notificações por tipo; mobile-first
- **Modelo**: **Sonnet** (lógica de valor atualizado + estados) + **Haiku** (telas mobile)
- **Testes (Vitest)**: cálculo valor atualizado (multa+juros); estados de pagamento. **(Playwright)**: portal mobile (375px)
- **Dependências**: 3.3 (PAID), 4.1 (NFS-e), 3.2 (cobrança)

### Tarefa 7.2 — Cartão de crédito recorrente (assinatura)
> Épico 04 — estava em pós-MVP; protótipo tem cadastro de cartão no portal e no billing. Entra no MVP.
- **Job**: responsável cadastra cartão para débito automático recorrente; escola configura se aceita cartão
- **Subtarefas**:
  - Tela e-card: número, validade, CVV, nome + checkbox de autorização recorrente + aviso de taxa 2,99%
  - Tokenização via cliente Asaas (`tokenizeCreditCard` / `createCreditCardPayment`)
  - Aplica taxa de cartão conforme FeeRouter (responsável paga ou escola assume)
  - `Guardian` ganha `creditCardToken` (nunca armazenar PAN — só token)
- **DoD**: cartão tokenizado (não armazena número); autorização recorrente registrada; taxa aplicada conforme config; aviso de taxa exibido
- **Modelo**: **Sonnet** — tokenização e cobrança recorrente são pontos sensíveis
- **Testes (Vitest)**: tokeniza; aplica taxa; bloqueia sem aceite. **(Playwright)**: e-card mobile
- **Dependências**: 7.1, 4.4 (validar tokenização na sandbox Asaas)

---

## FASE 8 — Financeiro: Saldo, Saque e Antecipação (novo — protótipo aprovado)

> **Job macro**: a escola vê o saldo disponível, transfere para o banco (PIX) e antecipa recebíveis de cartão.
> Referência: `design-handoff/project/app/screens-fin.jsx` (FinanceiroBody). Não estava em nenhum roadmap.
> ⚠️ **Validar com Asaas:** transfer/PIX-out e anticipation API disponíveis na conta? (ver pendências)

### Tarefa 8.1 — Saldo + saque (transferência PIX)
- **Job**: a escola vê saldo disponível e transfere para a conta bancária
- **Subtarefas**:
  - Card de saldo (separa: PIX/boleto liberado na hora vs. cartão D+X) — `getBalance` (cliente Asaas)
  - Modal saque → `transfer` para conta cadastrada (PIX)
  - Embutido no Dashboard (FinanceiroBody)
- **DoD**: saldo correto por origem; saque transfere via PIX; conta de repasse do BillingConfig
- **Modelo**: **Sonnet** — movimentação de dinheiro, tratar falha
- **Testes (Vitest)**: saldo por origem; saque chama transfer; falha tratada. **(Playwright)**: modal saque
- **Dependências**: 3.3, validação Asaas

### Tarefa 8.2 — Antecipação de recebíveis de cartão
- **Job**: a escola antecipa lotes de recebíveis de cartão pagando taxa
- **Subtarefas**:
  - Lista de recebíveis (`getAnticipableReceivables`) com seleção
  - Cálculo: taxa **1,99% a.m. proporcional aos dias** (`bruto * 0.0199 * dias/30`) → bruto/taxa/líquido
  - Confirmar → `requestAnticipation` (cliente Asaas); líquido vira saldo disponível
  - Branding próprio: "Taxa de antecipação (Education X)" — nunca citar Asaas
- **DoD**: lista recebíveis; cálculo de taxa correto; antecipa via Asaas; líquido vira saldo
- **Modelo**: **Sonnet** — cálculo financeiro proporcional
- **Testes (Vitest)**: taxa proporcional aos dias; líquido = bruto - taxa. **(Playwright)**: modal antecipação
- **Dependências**: 8.1, validação Asaas

---

## FASE 9 — Billing da Plataforma + Importação + Settings (novo — protótipo aprovado)

> **Job macro**: a Education X cobra a própria escola (assinatura do SaaS); a escola importa matrículas em massa; configura dados/taxas/plano.
> ⚠️ **Bloqueia parcialmente:** o pricing dos planos Education X (Básico/Crescimento/Pro) é decisão do Rafael (semana de 15/jun).

### Tarefa 9.1 — Billing da plataforma (Education X cobra a escola)
> Referência: screens-d.jsx (Settings aba "Meu plano"). **Motor de receita do produto.**
- **Job**: gerenciar a assinatura da escola com a Education X — plano, forma de pagamento, faturas
- **Subtarefas**:
  - Schema `PlatformPlan` (nome, priceCents, limite de cobranças/mês), `PlatformInvoice` (mês, status, itens: mensalidade + taxa de negativação R$29,90/inclusão)
  - Card plano atual + uso (cobranças no mês / limite) + "Mudar de plano" (modal com 4 planos: Básico/Crescimento/Pro/Sob medida)
  - Forma de pagamento: cartão tokenizado (campos completos) — a própria escola é um customer Asaas da conta-mãe IX
  - Faturas: lista + filtros + modal de detalhe (itens + total + pagamento PIX/cartão)
  - Cobrança automática mensal da escola (cron) conforme uso/plano
- **DoD**: plano atual + uso; troca de plano; forma de pagamento tokenizada; faturas com detalhamento; cobrança automática da escola
- **Modelo**: **Sonnet** — é cobrança recorrente B2B, sensível
- **Testes (Vitest)**: cálculo de fatura (mensalidade + taxas variáveis); troca de plano; cron de cobrança da escola
- **Dependências**: 3.2 (reusa Invoice), **pricing definido pelo Rafael**

### Tarefa 9.2 — Settings completo (dados, taxas, plano)
> Referência: screens-d.jsx (Settings, 3 abas).
- **Job**: a escola gerencia dados, regras de taxas e (via 9.1) o plano
- **Subtarefas**:
  - Aba **Dados da escola**: razão social, CNPJ, conta de repasse, regras de cobrança (read + editar) + toggle "exigir contrato assinado na matrícula" + modo escuro
  - Aba **Taxas**: FeeChoice (quem paga taxa de cartão / negativação: responsável ou escola)
  - Aba **Meu plano**: renderiza a Fase 9.1
- **DoD**: 3 abas; edição de dados; FeeChoice persiste; toggle contrato obrigatório
- **Modelo**: **Sonnet** (lógica) + **Haiku** (telas)
- **Testes (Vitest)**: FeeChoice persiste; toggle contrato. **(Playwright)**: 3 abas
- **Dependências**: 1.1, 9.1

### Tarefa 9.3 — Importação de matrículas via CSV (Admin)
> Referência: screens-import.jsx (ImportCSV). Exclusiva do Admin (decisão dos chats). Estava em pós-MVP.
- **Job**: Admin importa até 5.000 matrículas via CSV com validação corrigível
- **Subtarefas**:
  - Upload CSV (até 5.000 linhas) + download de modelo. Colunas: `aluno, nascimento, pagante, cpf, email, telefone, plano, materias`
  - Validação linha-a-linha: pagante/CPF ausente, CPF inválido (regex), plano inexistente
  - Modal "Corrigir cadastro" inline + revalidação; import bloqueado enquanto houver erro
  - Relatório de erros (CSV) das linhas que ficaram de fora
- **DoD**: parse CSV; validação dos 3 erros; correção inline; import só sem erros; relatório de erros
- **Modelo**: **Sonnet** (parser + validação) + **Haiku** (telas/stepper)
- **Testes (Vitest)**: parse; cada tipo de erro; revalidação; bloqueio com erro. **(Playwright)**: 3 passos
- **Dependências**: 2.1 (planos válidos), 1.4 (Admin)

---

## Ordem de dependência

```
NÚCLEO DEMONSTRÁVEL (Bloco A — pronto ~3/jul):
0.1 revisão Asaas → 0.2 scaffold+migração → 0.3 CI
  → 1.1 schema → 1.2 onboarding service → 1.3 wizard 4 passos → 1.4 auth/tenant
                                        → 1.5 termos+isenção IX
  → 2.1 planos+descontos [paralelo: só dep 1.1] → 2.2 matrícula via link → 2.3 matrícula manual
  → 3.1 customer → 3.2 invoice → 3.3 webhook+eventbus
  → 4.1 NFS-e | 4.2 régua | 4.3 cron-lote → 4.4 contract tests sandbox (GATE)
  → 5.1 negativação (interface) → 5.2 regularização + UI 4-status (dep: 3.3)
  → 6.1 dashboard 3 abas → 6.2 lista+detalhe → 6.3 cobrança extra

RESTO DO MVP (Bloco B — ~17/jul):
  → 7.1 portal responsável → 7.2 cartão recorrente (dep: 4.4)
  → 8.1 saldo+saque → 8.2 antecipação (dep: validação Asaas)
  → 9.1 billing plataforma (dep: pricing) → 9.2 settings → 9.3 importação CSV
```

> **Paralelismo:** 2.1 e 1.5 dependem só de 1.1 — podem rodar em paralelo com 1.2→1.4. Bloco B é independente entre fases (7/8/9 podem paralelizar após o núcleo).
> **Gate de ship:** 4.4 bloqueia deploy de produção, independente do resto.
> **Demo do Pimenta:** só precisa do Bloco A (~3/jul). Bloco B entra nas 2 semanas seguintes sem segurar a demo.

## Mapa de modelos (justificado)

| Tier | Quando | Tarefas |
|------|--------|---------|
| **Haiku** | leitura, wrapper simples, UI dumb, config de API | 0.1(mapeamento), 3.1, 4.2, + componentes shadcn/telas dumb de 1.3/2.2/2.3/6.x/7.1/9.2/9.3 |
| **Sonnet** | services, regras de negócio, integração, idempotência, store, auth, termos, tokenização, cálculo financeiro | 0.1(análise), 0.2, 0.3, 1.1–1.5, 2.1–2.3, 3.2, 3.3, 4.1, 4.3, 4.4, 5.1, 5.2, 6.1–6.3, 7.1, 7.2, 8.1, 8.2, 9.1, 9.2, 9.3 |

> **Sem Opus no MVP:** mesmo com Portal/cartão/billing/antecipação no escopo, nenhuma tarefa carrega risco jurídico crítico que justifique Opus — tokenização e cobrança recorrente são padrões conhecidos via cliente Asaas. Sonnet cobre tudo. (Opus volta na fase de LGPD-proof pós-lançamento.)

## Pós-MVP (apenas listado — não detalhar)

> Portal do Responsável, Cartão de crédito, Importação CSV, Saque/Antecipação e Billing da plataforma **saíram do pós-MVP** e entraram no MVP (Fases 7/8/9) porque estão no protótipo aprovado.

- **LGPD-proof completo** — criptografia de PII, matriz de base legal, anonimização vs. retenção, direito do titular (acesso/correção/esquecimento), log de auditoria. **Após validar PMF.** Provável uso de Opus para a arquitetura de base legal.
- **Revisão jurídica** dos termos (1.5) e do fluxo de negativação — após lançar e validar
- **Multa de cancelamento automática** (Épico 06 fase 2 — hoje só cobrança extra manual via 6.3)
- **Contratos formais / Autentique** (Épico 05 fase 2 — hoje o contrato é PDF anexado + clickwrap)
- **Relatórios multi-unidade / ranking entre unidades** (sugerido nos chats, não aprovado)

> Entram **só quando a dor comprovada do cliente puxar** ([regra de escopo da 00-FILOSOFIA.md](../../../Strategy/00-FILOSOFIA.md)), não por cronograma. LGPD entra cedo no pós-MVP porque é obrigação, não feature — mas não bloqueia validar se alguém compra.

## Pendências a confirmar antes de implementar

- **CONFIRMED vs RECEIVED** (M7): qual evento Asaas dispara o estado PAID interno? Afeta NFS-e e regularização. Resolver antes de 3.3.
- **Pricing dos planos Education X** (Básico/Crescimento/Pro): decisão do Rafael, semana de 15/jun. Bloqueia a Fase 9.1.
- Kumon Camargos tem inscrição municipal para NFS-e? (afeta 4.1)
- `PAYMENT_DUNNING:WRITE` liberado com a Asaas? (afeta 5.x / 4.4)
- **Asaas transfer/PIX-out e anticipation API** disponíveis na conta? (afeta Fase 8 — saque e antecipação)
- **Asaas tokenização de cartão** (`tokenizeCreditCard` / cobrança recorrente) disponível? (afeta 7.2)
- **Confirmar na sandbox (4.4):** a Asaas envia o aviso prévio e cuida do prazo legal da negativação? (se não, reabrir escopo de aviso — ver Fase 5)

---

## Documentos relacionados

- [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md) — arquitetura, camadas, multi-tenancy, LGPD, escalabilidade
- [DEVOPS.md](DEVOPS.md) — infra, pricing, CI/CD, backups, monitoramento
- [00-FILOSOFIA.md](../../../Strategy/00-FILOSOFIA.md) — missão, regra de escopo

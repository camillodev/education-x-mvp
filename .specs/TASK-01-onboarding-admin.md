# TASK 1 — Onboarding admin: listar + editar escolas (CRUD sem Delete) + padrão de error handling

> Task Contract detalhado para revisão antes de codar. Ferramenta **interna (só admin IX)** — não é tela da escola. Fecha o MVP do onboarding atual adicionando **Read + Update** sobre o **Create** que já existe. A escola, no fluxo real, usará o link de cadastro (task separada — ver fim do arquivo).

---

## Objetivo
Adicionar **listagem** e **edição** das escolas ao onboarding admin existente (que hoje só cria), com **error handling de qualidade como padrão reutilizável do projeto**. CRUD sem o **D** (Create já existe; entra Read + Update; sem Delete).

## Contexto travado
- **Quem usa:** apenas **admin IX** (você). Enforçado por `requireAdmin()` (`src/lib/auth/unit-context.ts`) — role `admin`.
- **Campos:** vêm da **spec 01**, não do design. Layout/visual = referência do **design handoff**, mas os campos são os da spec.
- **Sem Delete** nesta task.
- **Sem o fluxo de link da escola** — isso é a task nova (ver fim).

## Scope (dentro)
0. **Setup mínimo de teste de integração** — banco real de teste (o atual, dev descartável; produção vem depois) + helper de transação/rollback (`tests/integration/_setup.ts`) + config Vitest separada (`vitest.integration.config.ts`) + script `pnpm test:integration`. Cadastro da escola é o primeiro fluxo crítico do repo, então esta task estabelece o padrão de integração para todas as tasks seguintes. Inclui 1 teste de integração de persistência do update (Unit + BillingConfig + Subjects) e 1 caso de atomicidade (falha → rollback total).
1. **Listagem** `GET /api/escolas` (admin-only) + página `src/app/(app)/escolas/page.tsx`:
   - Tabela das escolas (Unit) com: nome, CNPJ, cidade/UF, status (PENDING/ACTIVE/SUSPENDED), data de criação, nº de matérias.
   - Busca por nome/CNPJ e filtro por status.
   - Estado vazio, loading e erro tratados.
2. **Detalhe + edição** `GET /api/escolas/[unitId]` + `PATCH /api/escolas/[unitId]` + página `src/app/(app)/escolas/[unitId]/page.tsx`:
   - Ler e **editar** os campos da spec, agrupados como no onboarding: Dados da escola (Unit) · Cobrança/Plano (BillingConfig) · Matérias (Subject).
   - Reusar os componentes de form existentes (`src/components/onboarding/Card*`, `Step*`) onde possível.
   - `UpdateSchoolSchema` = subset do `CreateSchoolSchema` (`src/lib/validations/unit.ts`).
   - Update transacional (Unit + BillingConfig + Subjects) no padrão do `createSchool`.
3. **Padrão reutilizável de error handling** (`src/lib/errors/handle.ts` — NOVO):
   - Helper que: mostra **toast amigável** ao usuário (mensagem traduzida) + faz **`console.error` com o motivo real** (erro técnico/causa) + emite **log estruturado** (contexto: rota, unitId, code).
   - Usado na listagem, no detalhe e na edição. Vira o padrão que toda task futura usa.
4. **Navegação:** entrada "Escolas" no layout autenticado `(app)/` apontando pra `/escolas`.
5. **Campos read-only sensíveis:** `responsibleCpf` exibido mascarado e **não editável** nesta task (PII criptografada); `cnpj` read-only após criação.

## Not-Included (fora — mata scope creep)
- **Delete** de escola (sem o D).
- **Tela/fluxo da escola** (link de cadastro, aceite de termos pela escola) — task separada.
- **Matrícula, cobrança, qualquer fluxo das specs 02-09.**
- Mudança no wizard de criação (Create permanece como está).
- Editar `responsibleCpf` ou campos Asaas (`asaasAccountId` etc.).
- Paginação server-side avançada (lista simples basta no MVP; só busca/filtro client-side se o volume for baixo).

## DoD-comando
```bash
pnpm typecheck && pnpm test:run && pnpm test:integration && pnpm dlx playwright test escolas --reporter=line
```

> `pnpm test:integration` é script NOVO criado nesta task (aponta pra `vitest.integration.config.ts`). Banco real de teste (o atual, dev descartável). Cada teste roda dentro de transação revertida no `afterEach` (rollback) — não suja o banco entre casos.

## TDD (RED primeiro)
1. **Unit (Vitest):** `UpdateSchoolSchema` rejeita CNPJ alterado / CPF presente / campos obrigatórios vazios — escrever antes do schema.
2. **Unit (Vitest):** helper de error handling chama `console.error` com a causa real E dispara toast — testar antes de implementar.
3. **Integração (Vitest + banco real):**
   - Chamar o service de update passando o client Prisma transacional → grava → lê de volta → confirma que Unit + BillingConfig + Subjects persistiram corretamente.
   - Caso de falha atômica: simular erro no meio do update (ex: Subject inválido após BillingConfig gravado) → nenhuma alteração deve ter persistido (rollback total da transação).
   - Rodar dentro de transação revertida no `afterEach` (helper `tests/integration/_setup.ts`) para não sujar o banco.
4. **E2E (Playwright) `escolas`:**
   - lista carrega e mostra ≥1 escola (seed) → falha até `GET /api/escolas` existir.
   - abrir detalhe → editar `name` e um preço de matéria → salvar → recarregar mostra o valor novo.
   - tentar salvar campo obrigatório vazio → bloqueado com toast de erro claro (não quebra a tela).
   - usuário não-admin → 403 (não vê a lista).

## Decisões adotadas
- **CRUD sem Delete** (decisão Rafa). Read + Update sobre o Create existente.
- **Campos da spec 01**, layout do handoff (`/.specs/prototipo/design-handoff/`). Não há protótipo de lista/edição → seguir o padrão visual Alfabeto do onboarding, responsivo 375/768/1440.
- **Update de matérias:** estratégia delete-all + create (como o padrão já usado); reavaliar pra diff incremental só se necessário.
- **Error handling vira padrão do projeto** (decisão Rafa) → novo util + **regra na constitution** (toast amigável + `console.error` com causa real + log estruturado). Toast já existe (`src/components/ui/toast.tsx`, `useToast`); o helper padroniza o uso.
- **Só admin** (não aparece pra escola).
- **Cadastro da escola = fluxo crítico** → exige teste de integração (não só unit). Banco atual (dev) é o banco de teste; produção vem depois. Estratégia: rollback por transação no `afterEach` (padrão de mercado — mais rápido que truncate/reset). Service layer recebe client Prisma como parâmetro (injeção) para facilitar troca pelo client transacional no teste. Esta task estabelece o padrão de integração do repo.

## Arquivos-alvo
- **Novos:** `src/app/(app)/escolas/page.tsx` · `src/app/(app)/escolas/[unitId]/page.tsx` · `src/app/api/escolas/route.ts` (GET) · `src/app/api/escolas/[unitId]/route.ts` (GET+PATCH) · `src/hooks/use-schools.ts` · `src/lib/errors/handle.ts` · `e2e/escolas.spec.ts` · `tests/integration/escola-update.integration.test.ts` · `tests/integration/_setup.ts` (helper transação/rollback) · `vitest.integration.config.ts`
- **Editar:** `src/lib/validations/unit.ts` (add `UpdateSchoolSchema`) · `src/app/(app)/layout.tsx` (nav) · reuso de `src/components/onboarding/*` · `.specify/memory/constitution.md` (regra de error handling)
- **Referência (não editar):** `src/lib/services/onboarding.service.ts` (padrão de transação) · `src/lib/auth/unit-context.ts` (`requireAdmin`) · `prisma/schema.prisma` · `.specs/01-onboarding-escola.md` (campos) · `.specs/prototipo/design-handoff/` (layout)

## Campos editáveis (da spec 01)
- **Unit:** name, email, phone, cep, address, number, neighborhood, complement, city, state, isFranchise, franchiseParent · **CNPJ read-only**.
- **Responsável:** responsibleName, responsibleEmail, responsiblePhone · **CPF read-only mascarado**.
- **BillingConfig:** dueDay, closingDay, lateFeePercent, monthlyInterestBp, cardFeePayer, negativacaoFeePayer, municipalRegistration, planId, discountType, discountValueBp/Cents.
- **Subject (lista):** name, nfseServiceCode, priceCents, quarterlyPriceCents, semiannualPriceCents, annualPriceCents, isActive.

---

## Lembrete (TENANT_MODELS)
Nenhum model novo aqui — Unit/BillingConfig/Subject já existem. Sem mudança em `src/lib/db.ts`.

## Task NOVA pra adicionar ao backlog (separada desta)
**EDX-NEW · Link de cadastro da escola (self-service)** — a escola recebe um link, preenche seus **dados pessoais**, **escolhe o plano** e **aceita os termos** (gera TermsAcceptance). É o que a escola realmente vê (diferente da ferramenta admin acima). Depende do schema/onboarding existentes; espelha o fluxo de "link + aceite" já usado na matrícula (spec 02). A detalhar quando for a vez.

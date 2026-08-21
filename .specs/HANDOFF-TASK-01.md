# HANDOFF — Task 1: listar + editar escolas (onboarding admin)

> Para o agente (ou Rafa em sessão nova) que vai implementar. Ferramenta **interna (só admin IX)**, não tela do cliente. Contrato completo em [`TASK-01-onboarding-admin.md`](TASK-01-onboarding-admin.md).

## Pré-requisito: branch nova
A branch atual (`feature/onboarding-alfabeto-redesign`) está fechada num PR (cadastro completo + auth + persistência). **Criar branch nova a partir da main após o merge:**
```bash
git checkout main && git pull
git checkout -b feature/onboarding-admin-crud
```

## Estado atual (o que JÁ existe — NÃO refazer)
- **Create FEITO e funcionando:** wizard de 4 passos, `createSchool` (`src/lib/services/onboarding.service.ts`), `POST /api/setup/escola`, componentes em `src/components/onboarding/`, testes unit + 1 de integração da rota. **Não mexer no Create.**
- Auth/RBAC pronto: `requireAdmin()` em `src/lib/auth/unit-context.ts` (role `admin`).
- Toast pronto: `src/components/ui/toast.tsx` (`useToast`).

## O que falta (esta task): Read + Update. SEM Delete.
1. **Listagem:** `GET /api/escolas` (admin-only) + `src/app/(app)/escolas/page.tsx` — tabela (nome, CNPJ, cidade/UF, status, criação, nº matérias) + busca + filtro por status + estados vazio/loading/erro.
2. **Detalhe + edição:** `GET` + `PATCH /api/escolas/[unitId]` + `src/app/(app)/escolas/[unitId]/page.tsx` — editar campos da spec 01, reusando componentes do wizard. `UpdateSchoolSchema` (subset do `CreateSchoolSchema`). Update transacional (Unit + BillingConfig + Subjects).
3. **Error handling reutilizável:** `src/lib/errors/handle.ts` — toast amigável + `console.error` com causa real + log estruturado. Vira padrão do projeto.
4. **Nav:** entrada "Escolas" em `src/app/(app)/layout.tsx`.
5. **Setup de teste de integração** (1º fluxo crítico do repo): `vitest.integration.config.ts` + `tests/integration/_setup.ts` (rollback por transação) + `pnpm test:integration`.

## Campos editáveis (da spec 01 — não do design)
- **Unit:** name, email, phone, cep, address, number, neighborhood, complement, city, state, isFranchise, franchiseParent. **CNPJ read-only.**
- **Responsável:** responsibleName, responsibleEmail, responsiblePhone. **CPF read-only mascarado.**
- **BillingConfig:** dueDay, closingDay, lateFeePercent, monthlyInterestBp, cardFeePayer, negativacaoFeePayer, municipalRegistration, planId, discountType, discountValueBp/Cents.
- **Subject (lista):** name, nfseServiceCode, priceCents, quarterlyPriceCents, semiannualPriceCents, annualPriceCents, isActive.

## Design
Ferramenta **interna** → **NÃO** segue o protótipo do cliente. **Reusar o estilo e os componentes do wizard existente** (Alfabeto). Lista = tabela simples no mesmo estilo.

## Pipeline obrigatório (agent-workflow — já aplicado no repo)
- Skill `task-contract` (escopo travado) → `superpowers:writing-plans` (≥3 arquivos) → `superpowers:test-driven-development` (RED primeiro) → `feature-architect` desenha (renomeado de `code-architect`, ver `docs/PLANO-TIME-AGENTS.md`) → implementa → `code-reviewer` (≥80) → `superpowers:verification-before-completion`.
- Hooks ativos enforçam: `no-edit-tests`, `pr-contract-and-size` (≤400 linhas), `verification-loop-required`.
- **DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration && pnpm dlx playwright test escolas`

## Ordem sugerida de execução
1. Setup de integração (config + helper rollback) + **teste RED** de persistência.
2. `UpdateSchoolSchema` + **teste RED** (rejeita CNPJ alterado / CPF / vazio).
3. Helper de error handling + teste.
4. API: `GET /api/escolas`, `GET`+`PATCH /api/escolas/[unitId]`.
5. Páginas lista + edição (reuso de componentes do wizard).
6. E2E `escolas` (lista, editar, validação, 403 não-admin).
7. `verification-before-completion` → PR ≤400 linhas.

> Se a soma passar de ~400 linhas, **dividir em 2 PRs**: (A) setup integração + API + schema; (B) páginas + E2E.

## Não fazer (Not-Included)
Delete · fluxo da escola (link self-service) · specs 02-09 · mexer no Create · editar CPF/campos Asaas.

## Pendência anotada (fora desta task)
Rever o **processo de design** no pipeline (design como etapa separada + protótipo Claude Design como fonte viva) — `/design-login` indisponível neste ambiente; retomar em task dedicada.

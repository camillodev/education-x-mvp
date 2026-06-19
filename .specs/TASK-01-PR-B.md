# Task Contract: PR B — Onboarding admin (escolas): páginas lista + edição + E2E

> Derivado de [`TASK-01-onboarding-admin.md`](./TASK-01-onboarding-admin.md). **PR B** — camada de UI, sobre a main já com o PR A mergeado (API + UpdateSchema + error handler + setup de integração disponíveis).

## Objetivo
Dar ao admin IX a **interface** para listar e editar escolas — tabela filtrável e formulário de edição reusando os componentes do wizard Alfabeto — fechando o MVP de Read+Update do onboarding. A API já existe (PR A); falta a tela que a operação usa.

## Scope
- In:
  - `src/app/(app)/escolas/page.tsx` — tabela (nome, CNPJ, cidade/UF, status, criação, nº de matérias) + busca por nome/CNPJ + filtro por status + estados vazio/loading/erro (via `handle.ts` do PR A).
  - `src/app/(app)/escolas/[unitId]/page.tsx` — ler + editar campos da spec 01, agrupados como no onboarding, **reusando** `src/components/onboarding/Card*`/`Step*`. CNPJ read-only, CPF mascarado read-only.
  - `src/hooks/use-schools.ts` — data fetching da lista/detalhe.
  - Entrada "Escolas" no `src/app/(app)/layout.tsx` → `/escolas`.
  - **E2E `e2e/escolas.spec.ts`:** lista carrega ≥1 escola (seed) · editar `name` + 1 preço de matéria → salvar → recarregar mostra novo valor · obrigatório vazio → bloqueado com toast · não-admin → 403.
- 🚫 Not included:
  - Qualquer item do PR A (API, schema, service, error handler, setup de integração) — já mergeado.
  - Delete · fluxo/link da escola · specs 02-09 · wizard de criação · editar CPF/Asaas · paginação server-side avançada.

## DoD (comando — exit 0 = feito)
`cd /Users/rafae/projetos/education-x-mvp && pnpm typecheck && pnpm test:run && pnpm dlx playwright test escolas --reporter=line`

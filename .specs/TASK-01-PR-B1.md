# Task Contract: PR B1 — Onboarding admin: shell + lista de escolas

> Sub-PR de [`TASK-01-PR-B.md`](./TASK-01-PR-B.md). Camada de UI dividida: **B1 = shell admin + página lista**. B2 (edição) vem depois.

## Objetivo
Dar ao admin IX a tela de **listagem** de escolas — sidebar admin + tabela filtrável (busca, franquia, status) com paginação — consumindo o `GET /api/escolas` (PR A). Hoje não há tela; a operação não consegue ver/abrir escolas.

## Scope
- In:
  - **Shell admin:** `src/components/admin/AdminSidebar.tsx` + `AdminShell.tsx` (sidebar lateral Alfabeto, item "Escolas") + `src/app/(app)/escolas/layout.tsx` que a aplica.
  - **Componentes shadcn+Alfabeto reutilizáveis:** `src/components/ui/table.tsx` (e tabs SE `Segmented` não cobrir — preferir reusar Segmented).
  - **Página lista:** `src/app/(app)/escolas/page.tsx` — tabela (avatar+nome, franquia, CNPJ mascarado, status badge, "Abrir"), busca (nome/CNPJ/franquia), chips de franquia (de `franchiseParent`), tabs status (Todas/Ativas/Suspensas), paginação client-side, estados vazio/loading/erro.
  - **Hook:** `src/hooks/use-schools.ts` — fetch `GET /api/escolas`, filtros client-side.
  - **API:** `GET /api/escolas` passa a retornar `franchiseParent` (+ teste).
  - **E2E** `tests/e2e/escolas.spec.ts` (parte lista): carrega ≥1 escola · busca filtra · filtro status · não-admin 403.
- 🚫 Not included:
  - **Edição** (página `[unitId]`, `use-school-edit`, wizard, PATCH) → PR B2.
  - Delete · link da escola · specs 02-09 · Create/wizard · CPF/Asaas · paginação server-side.

## DoD (comando — exit 0 = feito)
`cd /Users/rafae/projetos/education-x-mvp && pnpm typecheck && pnpm test:run && DISABLE_CLERK=true pnpm dlx playwright test escolas --reporter=line`

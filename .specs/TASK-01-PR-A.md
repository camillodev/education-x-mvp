# Task Contract: PR A — Onboarding admin (escolas): setup de integração + API + UpdateSchema + error handler

> Derivado de [`TASK-01-onboarding-admin.md`](./TASK-01-onboarding-admin.md). A Task 1 foi dividida em 2 PRs para respeitar o limite de 400 linhas/PR da constitution. **Este é o PR A** (camada de dados/back). PR B (páginas + E2E) vem depois, sobre a main já com este merge.

## Objetivo
Estabelecer a camada de **leitura e edição** de escolas no onboarding admin — schema de update, API admin-only (GET lista, GET/PATCH detalhe), update transacional e o padrão reutilizável de error handling — junto com o **primeiro setup de teste de integração do repo** (banco real + rollback por transação). Hoje o onboarding só cria; isso bloqueia a operação de corrigir uma escola já cadastrada.

## Scope
- In:
  - **Setup de integração** (1º do repo): `vitest.integration.config.ts` + `tests/integration/_setup.ts` (helper transação/rollback no `afterEach`) + script `pnpm test:integration`.
  - `UpdateSchoolSchema` em `src/lib/validations/unit.ts` — subset do `CreateSchoolSchema` (rejeita `cnpj` alterado, rejeita `responsibleCpf`, exige obrigatórios).
  - `updateSchool(unitId, input, db)` no `onboarding.service.ts` — transacional (Unit + BillingConfig + Subjects; matérias = delete-all + create), client Prisma injetado.
  - `GET /api/escolas` (admin-only) — lista Unit + nº de matérias.
  - `GET` + `PATCH /api/escolas/[unitId]` (admin-only).
  - Padrão de error handling `src/lib/errors/handle.ts` — toast amigável + `console.error` com causa real + log estruturado (rota, unitId, code).
  - **Testes:** unit do `UpdateSchoolSchema` + unit do error handler + integração de persistência do update + integração de atomicidade (falha → rollback total). **RED primeiro.**
- 🚫 Not included:
  - **Páginas** (`(app)/escolas/page.tsx`, `[unitId]/page.tsx`), hook `use-schools.ts`, nav no layout, **E2E `escolas`** → tudo no **PR B**.
  - Delete · fluxo/link da escola · specs 02-09 · mexer no Create/wizard · editar `responsibleCpf` ou campos Asaas.

## DoD (comando — exit 0 = feito)
`cd /Users/rafae/projetos/education-x-mvp && pnpm typecheck && pnpm test:run && pnpm test:integration`

<!-- Toca financeiro (BillingConfig/preços de matéria): o DoD inclui teste de integração real contra banco (persistência + rollback atômico), não só typecheck. E2E do fluxo fica no PR B junto da UI. -->

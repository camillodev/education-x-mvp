# Education Hub — project facts

Enrollment and billing (Asaas) for franchise schools. This file states facts about the repo only: commands, stack, layout.

## Commands
- `pnpm install` then `pnpm prisma generate`
- `pnpm dev` — Next dev server (turbopack)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `next lint`
- `pnpm test:run` — unit tests (vitest); `pnpm test:integration` — integration (needs DB); `pnpm test:e2e` — Playwright
- `pnpm seed:dev` — dev seed

Package manager is pnpm (11.x), Node 22 (see CI). Do not use npm or yarn.

## Stack
Next.js 15 App Router, React 19, TypeScript, Prisma 6, Clerk (auth), Asaas (payments), Zod, Tailwind 4, TanStack Table, vitest, Playwright.

## Layout
- `src/app/` — routes; route groups `(app)`, `(auth)`, `(public)`, `(school)`; API handlers in `src/app/api/*`
- `src/lib/services/` — business logic (flat); `src/lib/integration/asaas/` — Asaas client; `src/lib/{auth,api,data,errors,email,onboarding}/`
- `src/components/` — UI by feature, `ui/` primitives, `patterns/` shared patterns
- `prisma/` — schema and seed; `tests/{unit,integration,e2e}/`
- `docs/decisions/` — ADRs; `docs/architecture/`, `docs/product/`, `.specs/` — domain and product docs

## Context
Read `docs/decisions/` (ADRs) before changing data model, tenancy, payments or auth.

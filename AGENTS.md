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

## Language
UI strings are Brazilian Portuguese.

## Context
Read `docs/decisions/` (ADRs) before changing data model, tenancy, payments or auth.

## Ticket workflow

- If the task names a Linear ticket (EDU-nnn), read it first with Linear `get_issue` and `list_comments`. The ticket is the spec: description, acceptance criteria and definition of done.
- Ask clarifying questions only before starting work. After that, finish the ticket end to end without waiting for input.
- When the work is committed, push the branch and open a pull request with `gh pr create`, following the project's instructions for pull requests. Never merge.
- Then post one comment on the ticket with Linear `save_comment`: summary of the change, commit hash, typecheck, lint and test:run results, and the PR link. Set the ticket status to In Review.
- Never put secrets or personal data in the comment.

## Agents and skills scope

- Use only the agents and skills defined in this repo's `.claude/`. Ignore agents or skills from user or plugin scope, even when their description fits better.

## Which agent or skill to use

Agents live in `.claude/agents/`, skills in `.claude/skills/`, rules in `.claude/rules/`. Pick by situation:

| Situation | Agent | Skills |
|---|---|---|
| Ticket without a spec, or a decision to record | `product-manager` | `prd-rfc`, `spec-driven-development`, `decision-questions-framework` |
| Understand existing code before changing it | `code-explorer` | `official-docs-first` |
| Design a feature | `feature-architect` | `system-design-patterns`, `api-design-patterns`, `frontend-system-design-patterns` |
| Irreversible or cross-cutting design (schema, tenancy, payments) | `system-architect` | `edx-decisao`, `decision-questions-framework` |
| Implement | `code-implementer` | `ix-code-guidelines`, `test-driven-development`, `writing-plans`, `executing-plans` |
| Tests | `test-writer` | `test-driven-development` |
| Bug | `debugger` | `systematic-debugging` |
| UI | `ux-designer` | `frontend-design`, `design-principles` |
| Before saying done | none | `verification-before-completion` |
| Review a diff | `code-review-orchestrator` (runs `code-reviewer`, `security-auditor`, `silent-failure-hunter`) | `ix-code-review`, `requesting-code-review` |
| Apply review findings | `review-fixer` (max 3 cycles) | `receiving-code-review`, `pr-review-loop` |
| Several independent tasks | none | `dispatching-parallel-agents`, `subagent-driven-development` |
| Isolated branch work, finishing a branch | none | `using-git-worktrees`, `finishing-a-development-branch` |

Rules in `.claude/rules/` apply when you touch their area: layering (backend, frontend), security checklist, data privacy, never commit to main, never commit secrets, ticket standards.
Consult official documentation before using a framework or API (`official-docs-first`).

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

## Commits and pull requests

Rules below are adapted from the PostHog development guide. `[lint: <id>]` is machine-enforced, `[review]` is not.

- Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages and PR titles. `[review]`
- Types: `feat` and `fix` touch production code; `chore` is everything else (docs, tests, config, CI, refactoring agent instructions). Format `<type>(<scope>): <description>`, description lowercase, no trailing period, first line under 72 characters. `[review]`
- A new `docs/**` file requires a person to request that specific document in the current conversation. Put PR-specific context in the PR description. `[review]`
- **Read `.github/pull_request_template.md` and use its exact section structure.** `[review]` Invoke `/writing-pr-descriptions` before writing the body. Always fill the `## 🤖 Agent context` section, including the exact model that wrote the code.
- **Never put sensitive information in a PR description or comment.** `[review]` A user may share sensitive data in an agent session; none of it belongs on the PR.
- **Never bypass the pre-commit hook (`--no-verify`).** `[review]` It runs lint-staged and `tsc --noEmit`; fix what it reports.
- **Agents must not merge a PR, or enqueue one, without explicit user approval in the current conversation for the identified PR.** `[review]` Do not infer approval from requests to prepare, monitor or fix a PR. An agent may inspect status, fix code and CI, and report that a PR is ready, then wait for a direct instruction.
- **Typecheck, lint and unit tests pass before you push.** `[lint: typecheck, lint, test:run]`

## Code style

### Frontend

- **TypeScript with explicit return types on exported functions.** `[review]`
- **Guard every network-triggering button against double submission.** `[review]` Disable it and show a loading state while the request is in flight, and reset in both the success and error paths. Applies to `<form onSubmit>` and any `onClick` that calls an API.
- Use tailwind utility classes over inline styles. `[review]`

### Comments

- **Explain _why_, not _what_,** and only where a future reader with no access to this PR or chat would otherwise be confused. `[review]` Default to one line.
- **Never log change history or chat context in code.** `[review]` No "previously did X, now does Y", no "per <task/PR>", no "changed because…", no "AI:" or "agent:" notes. That belongs in the commit message and PR description.
- **When refactoring or moving code, keep the existing comments** unless the change actually makes them obsolete. `[review]`

### Tests

- **Every new test must catch a realistic regression no existing test catches.** `[review]` If you cannot name that regression, do not add the test. Assert observable behavior through the public interface, not implementation details, and keep it cheap: deterministic, isolated, at the lowest level that catches the bug. See `/writing-tests`.
- **Extend a relevant existing test rather than adding a standalone one** where practical, and parameterize variations of the same behavior (`test.each`). `[review]`
- **A test for a bug fix must fail on the old code.** `[review]`

## User-facing copy

For any text a person reads (UI labels, tooltips, empty and error states, notifications, docs). Invoke `/writing-user-facing-copy` before writing or editing it.

- Sentence case, not Title Case: capitalize only the first word and proper nouns. `[review]`
- Avoid the tells of AI-generated text: em dashes, "not just X, but Y", rule-of-three padding, hedging preambles. `[review]`
- Plain language, no jargon. Use the labels users see, not internal names. `[review]`
- Errors and empty states guide, they don't dead-end: say what happened and the next action. `[review]`

## Tooling map (this repo is not PostHog)

The skills and agents in `.agents/skills/` and `.claude/` come from PostHog and name PostHog tools. Substitute when you follow them. `[review]`

| PostHog says | In this repo |
|---|---|
| pytest, Jest | vitest (`pnpm test:run`) |
| Django TestCase, DRF, ClickHouse tests | route-handler and service tests with mocked Prisma; integration tests in `tests/integration/` |
| kea logic | pure function or React hook |
| `hogli`, `bin/*`, `uv` | `pnpm` scripts |
| `frontend/src/`, `products/*/frontend/` | `src/components/`, `src/app/` |
| Lemon UI / quill components | `src/components/ui/` (shadcn) |
| Trunk merge queue, `gh stack` | not used; plain GitHub PRs |

## Agent automation

When automating a convention, try these in order. Only fall back to the next if the previous isn't suitable:

1. **Linters** (eslint, tsc), always paired with CI
2. **lint-staged / husky**: file-level validation at commit time
3. **Skills** (`.agents/skills/`)
4. **AGENTS.md instructions**, when automated enforcement isn't suitable

### Mandatory skill invocation

Each entry is a trigger, not a task list: it fires on what the diff contains, whether you are writing that code or reading someone else's. ALWAYS invoke the matching skill **first**.

**Always invoke:**

- `/writing-ui-components`: creating, moving, splitting or restructuring any component or file under `src/components/` or `src/app/`, extracting or promoting a shared component
- `/writing-tests`: any change to what a test asserts or sets up (vitest or Playwright), down to one assertion added to an existing block; renames, formatting and import sorts are exempt
- `/writing-user-facing-copy`: writing or editing any text a user reads, or any code change that adds or changes a visible string
- `/writing-code-comments`: writing or editing a code comment, or reviewing a diff that adds comments
- `/writing-pr-descriptions`: writing or editing any PR body, before `gh pr create` or `gh pr edit --body`

**Invoke when in the area:**

- `/security-audit`: auth, secrets, webhooks, raw SQL, payment or personal data
- `/announcing-behavior-changes`: shipping a fix that changes what an existing user sees
- `/fixing-flaky-tests`: a test fails intermittently
- `/playwright-test` and `/qa-frontend`: writing or running browser tests, or checking a UI change in a browser
- `/react-doctor`: reviewing React code for common problems
- `/autoresolving-pr-conflicts`: a PR has merge conflicts
- `/editing-agents-md`: adding, editing or removing a rule in any `AGENTS.md`
- `/writing-skills`: creating or updating skills in `.agents/skills/`

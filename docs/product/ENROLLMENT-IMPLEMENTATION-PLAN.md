# Enrollment — implementation plan and definition of done

Date: 2026-11-14. Inputs: `.specs/mvp-02-matricula.md`, `ENROLLMENT-AUDIT.md`, `.specs/HANDOFF-clerk-organizations.md`, ADR-0002, code read of `src/lib/auth`, `src/middleware.ts`, `src/lib/db.ts`. Nothing below is implemented yet.

## 1. Auth and multi-tenancy: current state (verified by reading code)

How it works today
- Clerk session -> `sessionClaims.metadata` ({ role, unitId } from user `publicMetadata`, fallback `currentUser()`) -> `getUnitContext()` -> `forUnit(unitId)` Prisma extension injects `unitId` on find/update/delete/create/upsert. Roles: `admin` (platform, sentinel `unitId='__admin__'`) and `orientador` (school).
- Page protection: `(app)/layout.tsx` (admin only) and `(school)/layout.tsx` (orientador only) redirect by role. API protection: `guardAdvisor` / `guardAdmin` in each handler.
- Dev bypass `DISABLE_CLERK` is hard-gated off in production, and is `false` in `.env`.
- Unit tests exist for `unit-context` and the approve/reject/pending routes. Tenant isolation has an integration test (`enrollment-tenant-isolation`, needs a DB).

Problems found that block "auth is working"
1. **Middleware makes too much public** (`src/middleware.ts`): `/api/enrollment(.*)` also matches `/api/enrollments/...` and `/m(.*)` also matches `/matriculas`, `/mock...`. Clerk's `auth.protect()` is skipped for them; only per-handler guards remain. (Path-matching behaviour inferred from the pattern; confirm with a test.)
2. **Four enrollment routes have no guard at all** and trust `unitId`/`guardianId`/`ip` from the body: `/api/enrollments/guardian`, `/students`, `/plan`, `/contract`. They duplicate the `/m/[token]` server actions and are unused by the UI.
3. **Tenant id from the client** in `GET /api/enrollments` (`?unitId=`).
4. **`pnpm build` fails** (it lints): one `no-explicit-any` error at `enrollment.service.ts:173`. Typecheck and 638 unit tests pass.
5. **Clerk Organizations migration is only a proposal** (handoff, status "not started", 5 open decisions). Nothing in `src` uses orgs.

Recommendation (decision D1): for this sprint keep the current `publicMetadata` -> `forUnit` model. It is Clerk-derived, tested and not blocking. Do the Organizations migration afterwards as its own track (handoff section 6). Enrollment code must only depend on `getUnitContext()`, so the later swap changes one file.

## 2. Work packages (order matters; each = tests first, then code, small PRs)

**P0 Unblock** — fix the lint error so build is green. Add `build` to the gate.

**P1 Auth and tenancy hardening**
- Middleware: replace the broad matchers with exact ones (`/m/:token*`, `/api/webhook`, `/confirmar/...`); remove the `/api/enrollment` public entry. Test with a matcher unit test.
- Delete the four unguarded routes (public flow uses server actions).
- `GET /api/enrollments`: unit only from `ctx.unitId`; add paging + status filter, drop `?unitId`.
- Add a cross-tenant test for every enrollment endpoint (unit A advisor cannot read/modify unit B; 404 not 403 leak).
- Auth test matrix: no session = 401, admin on advisor route = 403, advisor on admin route = 403, advisor without `unitId` = 403.

**P2 Enrollment domain service (CRUD per spec)**
- Split `enrollment.service.ts` (464 lines): `enrollment.service` (admin CRUD), `enrollment-link.service` (public flow), keep `approval.service`.
- Create: server-side price from `Subject` by plan (R5a), discount PERCENT/FIXED to `finalPriceCents` (R4/R5, floor at 0, integers), one plan per student (R19), max 5 students per flow (R1), `selfPayer` (R10), verify guardian/student/subject belong to the unit.
- Read: list by status with paging, detail with decrypted+masked PII (CPF `***.456.789-**`).
- Update: whitelist fields only (no status/price/guardianId from the client); status changes only via transition functions.
- Delete = cancel (soft), with `cancelledAt`; no hard delete of enrollments with invoices.
- State machine (single module, tested table): PENDING_CONFIRMATION -> PENDING_SCHOOL_APPROVAL -> ACTIVE; any -> CANCELLED; ACTIVE <-> SUSPENDED. Approve/reject/accept filter by current status; illegal transition = 409.
- Link-flow safety: re-submit must not delete ACTIVE data (only touch PENDING rows); Guardian dedupe by CPF (decision D2).

**P3 Real school panel (no mocks)** — `painel/matriculas` list/detail/nova read and write the real API; approve/reject buttons wired; delete `/api/mock/enrollments` and `lib/mock/enrollments` usage on these pages; loading/error/empty states.

**P4 Manual flow and confirmation link (spec slices 4, 7)** — migration `Enrollment.confirmationTokenExpiresAt`, `confirmedAt` (additive). `POST` creates Guardian/Student/Enrollment with discount, token (72h), email via Resend; public `/m/confirmar/[token]` page + API: editable personal fields only, accept terms with IP, status -> PENDING_SCHOOL_APPROVAL; expired/used token screens; "confirm now in person" (note + advisor IP).

**P5 Notifications** — approval/rejection emails to the guardian; school notification on new pending enrollment.

**P6 Serasa (slice 5)** — only after confirming the Asaas `/creditBureau/serasa` contract in sandbox (spec P7). Migration for score fields and `CONSULTA_SERASA` term kind. Not part of "enrollment done" unless you decide so (D4).

**P7 E2E** — rewrite `matricula-*.spec.ts` against the real pt-BR UI (the current file cannot pass); Clerk advisor persona for the panel; spec section 9 scenarios 3-6 and 10.

## 3. Definition of done — enrollment is DONE when all are true

Functional (spec mvp-02)
- [ ] Link flow: guardian completes all steps on 375px, data saved, acceptance with IP, status PENDING_SCHOOL_APPROVAL.
- [ ] Manual flow: advisor creates enrollment with discount, guardian gets email, confirms on `/m/confirmar/[token]`, token expiry works, personal-data edits override, price/plan locked.
- [ ] School approves -> Asaas customer created once (idempotent, no duplicate), status ACTIVE; rejects -> CANCELLED with email.
- [ ] Panel list/detail/create/cancel use only real endpoints; zero `/api/mock/*` calls on enrollment screens.
- [ ] Rules R1-R14, R19, R20 each covered by a test; prices always server-side integer cents.
- [ ] PII encrypted at rest (spec check 10) and masked in responses/logs.

Auth and tenancy
- [ ] Every enrollment endpoint derives unit from the Clerk session (or the public link token), never from the request.
- [ ] Middleware exposes only the intended public routes (matcher test).
- [ ] Cross-tenant read/write tests pass for every endpoint; auth matrix tests pass.
- [ ] Advisor login works end to end against the real Clerk dev instance (e2e): lands on `/painel`, sees only own unit's data.

Quality gate (all exit 0, evidence pasted in the PR)
- [ ] `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build`
- [ ] `pnpm test:integration` against a dev/branch database (never production)
- [ ] Playwright at 375/768/1440 for the enrollment specs, with screenshots
- [ ] No file over 500 lines, no `any` in new code, English identifiers, pt-BR UI
- [ ] Reality Checker review: defaults to "needs work" until the above is shown, not claimed

Explicitly out of scope for "done": Serasa (unless D4), subscriptions/billing, NFS-e, portal, Clerk Organizations migration.

## 4. Decisions needed (my default if you don't object)
- D1 Tenancy source this sprint: keep `publicMetadata` (default) vs migrate to Organizations first.
- D2 Guardian dedupe: add an HMAC blind-index column for CPF (default; one additive migration) vs rely on Asaas lookup only.
- D3 Database for integration/e2e: need a dev or Supabase branch DB; `.env` points at the pooled Supabase host and I will not run writes there until you confirm it is not production.
- D4 Serasa inside "enrollment done" or a follow-up (default: follow-up).
- D5 Approval per Guardian (current code, default) vs per Enrollment (spec text).

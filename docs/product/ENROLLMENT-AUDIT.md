# Enrollment audit — spec mvp-02 vs. code (2026-11-14)

Method: read `.specs/mvp-02-matricula.md` (8 slices, DoD, rules R1-R20) and compared it with the services, API routes, pages and e2e tests on branch `feat/improve-enrrolment`. Findings come from reading code, not from running the app. Items marked (unverified at runtime) were not reproduced.

## Verdict
The public link flow (`/m/[token]`, spec slices 2-3) is real and backed by the database. Almost everything else is mock, missing or unsafe. Spec DoD items 3-9 (Playwright tests) do not exist, and the e2e that does exist cannot pass.

## Slice status

| Spec slice | Status | Evidence |
|---|---|---|
| 1 Schema | PARTIAL | `Student`, `Enrollment`, enums exist. Missing: `Guardian.serasaScore/serasaCheckedAt`, `Enrollment.confirmationTokenExpiresAt/confirmedAt`, term kind `CONSULTA_SERASA`, a searchable CPF index. |
| 2 Link API | PARTIAL | Implemented as server actions in `src/app/m/[token]/*/actions.ts` + `enrollment.service.ts`, not as `/api/enrollment/link/...`. Works against the DB. Asaas customer is created at approval (matches R14). |
| 3 Link UI (mobile) | REAL | `/m/[token]` -> dados, aluno, plano, revisao, enviado. |
| 4 Manual flow (desktop) | MOCK / BROKEN | `painel/matriculas/nova` posts to `/api/mock/enrollments`, which only exports GET, so every submit gets 405 and shows the error toast. Nothing is persisted, no token, no email. |
| 5 Serasa | MISSING | No code outside the unrelated dunning screens. |
| 6 School contract settings | UNVERIFIED | `(app)/configuracoes/contrato` and `contract.service` exist; not audited here. |
| 7 Guardian confirmation link (manual flow) | MISSING | `(public)/confirmar/[token]` is the *school onboarding* confirmation (reads `Unit.confirmationToken`). There is no enrollment confirmation page or API. |
| 8 School approval | PARTIAL | Approve/reject routes + `approval.service` are real. List/detail pages in `painel/matriculas` read mock data (`/api/mock/enrollments`). No approval/rejection emails. Approval works per Guardian, not per Enrollment (a documented deviation). |

## P0 — security and data integrity
1. **Unauthenticated write with client-supplied tenant.** `POST /api/enrollments/guardian` has no guard and takes `unitId` from the request body. Anyone can create or overwrite Guardians in any unit. Violates golden rule 7.
2. **Cross-tenant read.** `GET /api/enrollments` uses `searchParams.get('unitId') || ctx.unitId`. Any logged-in advisor can list another unit's pending enrollments by passing `?unitId=`.
3. **Mass assignment.** `PUT /api/enrollments/[id]` passes the raw body to `prisma.update`. A client can set `status: ACTIVE`, `finalPriceCents`, `guardianId`. Same pattern in `updateStudent` and `updateGuardian`. Violates R5 (price is server-calculated).
4. **State-machine holes in approval.** `approveEnrollment` and `rejectEnrollment` do `updateMany({ where: { guardianId } })` with no status filter: approve can reactivate CANCELLED enrollments; reject can cancel ACTIVE ones. `submitAcceptanceStep` likewise moves every enrollment of the Guardian to PENDING_SCHOOL_APPROVAL regardless of status.
5. **Destructive re-submit (unverified at runtime).** The Guardian id lives in a session cookie. `submitStudentsStep` runs `student.deleteMany` and `submitPlanStep` runs `enrollment.deleteMany` for the Guardian. Students cascade-delete enrollments; Invoice has no cascade, so a Guardian with billed enrollments would error with a 500, one without invoices would lose ACTIVE enrollments.
6. **No duplicate-Guardian protection (R6/R7).** CPF is stored AES-GCM encrypted, so it cannot be searched. Each new link flow creates a new Guardian, and `approveEnrollment` relies on `findCustomerByCpfCnpj` at Asaas as the only dedupe.

## P1 — spec gaps
- Discount (R4/R5): the manual form collects it, no backend applies it; `createEnrollment` sets `finalPriceCents = agreedPriceCents`.
- `POST /api/enrollments` and `createEnrollment` do not verify guardian/student/subject belong to the unit, and use `as any`.
- No `selfPayer` flow (R10), no "confirm now in person" path (decision 15).
- No notification emails to the guardian or school (spec slices 7, 8).
- Link-flow validation lives in two parallel stacks (`src/features/enrollment` RHF form and `/m` server actions); `enrollment-form.schema.ts` still imports mock types.
- `enrollment.service.ts` is 464 lines (limit 500) and mixes admin CRUD with the public flow.
- `GET /api/enrollments` returns only PENDING_SCHOOL_APPROVAL, so the name is misleading; the real listing for the panel does not exist.

## Tests
- `tests/e2e/matricula-full.spec.ts` cannot pass: English labels ("Start enrollment", "Continue"), `button:contains()` (not valid Playwright), routes `/enrolled` and `/m/{token}/guardian` that do not exist, and it imports `@/lib/db`.
- `tests/e2e/matricula-b1.spec.ts` (welcome screen) is plausible but unrun.
- Last recorded Playwright run (7 Nov): 14 failed (`test-results/.last-run.json`).
- Spec DoD tests 3-9 (`matricula-link`, `matricula-manual`, `matricula-no-asaas-before-terms`, `matricula-guardian-existente`, serasa x3) do not exist.
- Unit: 638 pass; approve/reject/pending route tests exist. Integration tests need a DB and were not run.

## Proposed order (each slice: tests first, API-backed, e2e, then next)
1. **E1 Hardening** (P0 1-4): guard `/guardian`, derive unit from session/link token, drop `?unitId`, field whitelist on PUT, status guards on approve/reject/accept. Tenant-isolation and state-transition tests.
2. **E2 Real admin panel**: replace mock list/detail with real endpoints (list by status, detail), approve/reject wired in the UI.
3. **E3 Link flow safety**: fix re-submit behavior (P0 5), Guardian dedupe strategy (P0 6, needs a decision: CPF blind index vs. HMAC column), rewrite the e2e to match the real UI.
4. **E4 Manual flow**: real `POST` creating Guardian/Student/Enrollment with discount, confirmation token (+TTL migration), email, public `/m/confirmar/[token]` page, approval.
5. **E5 Serasa** (after P7: confirm the Asaas contract in sandbox).
6. Per-slice DoD Playwright tests from spec section 9.

## Decisions needed
- Dedupe: add a CPF blind index (HMAC) column on Guardian? (needs a migration)
- Run migrations against which database (the `.env` points at Supabase; use a dev/branch DB, never production)?
- Keep approval per Guardian (current) or move to per Enrollment (spec text)?

# NEXUS-Sprint Plan — Education Hub MVP (Basic)

> Draft by the Startup MVP Build runbook, 2026-11-14. Brownfield: the product is mid-build, not idea-stage.
> Scope source: vault `hot.md` (31 Jul revision) + `.specs/MASTER-MVP-EXECUCAO.md`. **Open conflict:** MASTER (9 Jul) puts negativação in the MVP; the vault (31 Jul) moves it to Pro. This plan follows the vault and marks it as a decision for Rafa.

## Goal / gate
3 paid pilots each running one real transaction (or the Beta cohort filled). Nothing else counts as validation.

## Baseline evidence (2026-11-14)
| Check | Result |
|---|---|
| `pnpm typecheck` | PASS (fixed: invalid `user` include on Guardian in `enrollment.service.ts`) |
| `pnpm test:run` | PASS, 638/638 |
| `pnpm lint` | FAIL, 1 error: `any` at `enrollment.service.ts:173` (pre-existing) |
| `pnpm build`, Playwright e2e | NOT RUN |

## Sprint 0 — Make the gate trustworthy (1-2 days)
Owner: Backend Architect + DevOps Automator. Evidence: Evidence Collector.
1. Fix the lint error; run `pnpm build`; run e2e and record results.
2. Reconcile docs: Next version (CLAUDE.md says 16, package.json ^15.3.3), stale ROADMAP dates.
3. Decide `feat/improve-enrrolment` (9 commits, ~83 files ahead of `develop`): review and merge, or split.
4. Confirm Vercel project + env vars + Asaas **sandbox** keys work in a preview deploy.

**Exit (Reality Checker):** typecheck + lint + test + build + e2e all green on the branch, preview deploy loads.

## Sprint 1 — Enrollment, fully real and API-integrated (revised 2026-11-14)
Owner decision: enrollment is not accurate, so Sprint 1 is enrollment only, every step real and wired to the API. Gap analysis: `ENROLLMENT-AUDIT.md`. Slices, in order: E1 hardening (security/state machine), E2 real admin panel (no mocks), E3 link-flow safety + e2e rewrite, E4 manual flow + guardian confirmation link, E5 Serasa. Exit: spec section 9 DoD tests pass against a real DB, zero `/api/mock/*` calls on enrollment screens.

Original Sprint 1 scope, now sequenced after enrollment:
1. **Enrollment** (mvp-02): link flow + manual double-approval flow (see above).
2. **Billing** (mvp-03): cron `POST /payments`, webhook `PAYMENT_RECEIVED` = PAID, invoices list/detail.
3. **Guardian portal** (f2-02): magic-link auth (DT-01 debt), pay + history.
4. **School dashboard** (f2-01 P0).

Per-slice DoD: tests first, tenant-isolation test per service, e2e for anything touching money, CI green.
Explicitly out: negativação and advanced reports (Pro), NFS-e automation, card deposit, balance transfer.

**Exit:** one end-to-end run in Asaas sandbox: enroll -> invoice -> payment -> PAID -> visible in dashboard, with screenshots.

## Sprint 2 — Pilot readiness
- Production Asaas sub-account flow (needs Rafa's explicit go-ahead; sandbox until then).
- LGPD minimum (DT-04 legal check for "confirmed in person"), terms, support by email.
- Onboard first Beta school with assisted setup; measure first real transaction.

## Growth team (from week 3, only once Sprint 1 exit is met)
Growth Hacker, Content Creator, Social Media Strategist follow the vault GTM: founder-led WhatsApp outbound -> 15-min demo without price -> contract -> activation. No mass campaigns before the direct channel works.

## Decisions needed from Rafa
1. Negativação in Basic MVP or Pro-only (vault says Pro).
2. Who reviews/merges `feat/improve-enrrolment`.
3. Beta discount and urgent-ticket SLA (open in the vault).
4. Time available per week (vault: job search takes priority; this sets the real calendar).

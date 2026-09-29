# Sizing: English-only code migration (EDU-83 to EDU-86)

Status: WIP — sizing input for scoping EDU-83/84/85/86, not a decision record itself.
Measured 2026-09-25 against `develop` (commit after EDU-82 merge) using
`scripts/check-language.mjs` plus targeted greps for what the checker doesn't cover
(test titles, markdown, commit history).

## Totals

| Category | Count | Ticket |
|---|---|---|
| PT-BR identifiers (`pt-identifier`) | 86 declarations | EDU-83 |
| PT-BR internal `api/` paths | 15 route files | EDU-83 |
| PT-BR comments (`pt-comment`) | 538 lines | EDU-84 |
| Comment history pollution (`comment-history`) | 52 lines | EDU-84 |
| Commented-out code | 3 lines | EDU-84 |
| PT-BR test/describe/it titles | 332 of 727 (46%) | EDU-85 |
| PT-BR markdown files | 120 of ~140 tracked `.md` (27,878 lines) | EDU-86 |
| PT-BR commit subjects | ~73% of recent history | EDU-85 (guard only; history isn't rewritten) |

**694 code-level violations across 150 files** (checker total: identifiers + paths + comments,
excluding test titles and markdown, which the checker doesn't scan yet).

## EDU-83 — Identifiers + paths (86 + 15 = 101 renames)

Heaviest concentration, ranked by declaration count:
- **Onboarding/matrícula flow** (~40 identifiers): `StepDados`, `StepCobranca`, `StepPlano`,
  `StepRevisao`, `StepFinanceiro`, `CardResponsavel`, `MatriculaDadosPage`,
  `MatriculaAlunoPage`, `MatriculaPlanoPage`, `MatriculaRevisaoPage`,
  `MatriculaEnviadaPage`, `MatriculaDetalhePage`, `MatriculaBoasVindasPage`,
  `MatriculasPendentesPage`, `PainelMatriculasPage`, `NovaMatriculaPage`,
  `DadosState`, `PlanoState`, `RevisaoCompatState`, `RevisaoForm`, `isDadosValid`,
  `isPlanoValid`, `emptyDados`, `emptyPlano`, `setDados`, `setPlano`, `planoAtual`,
  `planoMensal`, `planoObj`, `comPlano`, `renderRevisao`, `guardOrientador`,
  `payloadComBillingTypeNovo`.
- **Billing/cobrança screens** (~15): `CobrancaState`, `CobrancasPage`,
  `CobrancaDetalhePage`, `NovaCobrancaPage`, `CobrancasResponse`, `CobrancasTab`,
  `emptyCobranca`, `setCobranca`, `isCobrancaValid`, `FaturaDetalheModal`,
  `FaturaDetalheModalProps`, `FaturaFilter`, `FATURA_FILTERS`, `FATURAS_PER_PAGE`,
  `faturas`, `faturasFiltradas`, `faturasPagina`.
- **School/admin screens** (~10): `EscolaPage`, `EscolasPage`, `EditarEscolaPage`,
  `EditEscolaState`, `useEditEscola`, `ConfiguracoesPage`, `FinanceiroBody`,
  `FinanceiroResponse`, `ExtratoTab`, `NegativacaoBody`, `NegativacaoDetalhePage`.
- **Reports + misc constants** (~10): `RelatoriosTab`, `RelatoriosResponse`,
  `COBRANCAS`, `ESCOLAS`, `EXTRATO`, `MATRICULAS`, `PENDENTES`, `RELATORIOS`,
  `REL_ALUNOS`, `MATERIAS_POR_ESCOLA`.
- **15 API route files**: `api/escolas[/[unitId]]`, `api/matriculas/[guardianId]/{aprovar,recusar}`,
  `api/matriculas/pendentes`, `api/setup/escola`, `api/mock/{cobrancas,configuracoes-escola,
  escolas,faturas-plataforma,financeiro,matriculas,negativacao,portal-cobrancas,relatorios}`.

Mechanical: renames caught by `pnpm typecheck`. Each PR must also update every caller
(hooks, services, tests) and re-run E2E since route paths change. Realistic split:
**4 PRs** (onboarding, billing, school/admin, API routes), each comfortably ≤400 lines.

## EDU-84 — Comment cleanup (538 PT + 52 history + 3 commented-out = 593 lines to touch)

Top files by violation density (from the scan — these are where the noisiest, most
decision-laden comments live):

| File | Violations |
|---|---|
| `src/lib/services/billing.service.ts` | 52 |
| `src/lib/services/webhook.service.ts` | 49 |
| `tests/unit/services/webhook.service.test.ts` | 44 |
| `.specs/prototipo/design-handoff/project/app/data.js` | 30 |
| `tests/unit/services/billing.service.test.ts` | 27 |
| `src/hooks/use-onboarding.ts` | 23 |
| `src/lib/services/enrollment.service.ts` | 22 |
| `tests/unit/api/webhook.route.test.ts` | 22 |
| `tests/unit/db/dunning-log-result.test.ts` | 17 |
| `src/app/api/webhook/route.ts` | 16 |

Per the "delete first" rule in `code-standards.md`, expect most of the 52 `comment-history`
lines (ADR-0008 Emenda references, `EDU-XX —` prefixes) to be **deleted**, not translated —
their content already lives in merged PRs/ADRs. Realistic split by criticality, matching the
ticket's own ordering: **schema → services/asaas/dunning → api routes → hooks →
components/pages → tests/scripts**, roughly **6 PRs**.

## EDU-85 — Test titles + commits (332 titles)

332 of 727 titles (46%) across the same 69 test files. Concentrated in the files that also
top EDU-84 (`webhook.service.test.ts`, `billing.service.test.ts`, `dunning-log-result.test.ts`,
`for-unit.test.ts`) — **worth doing EDU-84 and EDU-85 together per file** instead of two full
passes over the same test suites, to avoid touching the same file twice. Split by folder
(`tests/unit/services`, `tests/unit/api`, `tests/unit/components`, `tests/integration`,
`tests/e2e`, `src/**/__tests__`): roughly **5 PRs**. Commit/PR-title guard is a CI check, not a
migration — no historical commits are rewritten.

## EDU-86 — Markdown (120 files, 27,878 lines)

By area:
- `docs/_archive/` — 18 files. Historical, not a source of truth. **Candidate to exclude
  from the check entirely** rather than translate (ticket already flags this as optional).
- `.specs/prototipo` + `.specs/design-handoff` — 24 files. Prototype reference material.
- `docs/decisions/` (ADRs) — 9 files. High priority: these are what EDU-84 comments point to.
- `.claude/rules/` — 9 files. Agent-read every session; translate early (ticket already orders
  this first).
- `docs/strategy/`, `docs/research/` — 10 files. Business docs, lowest code-relevance.
- `docs/product/` — 5 files (PLANO-TECNICO, SYSTEM-DESIGN, ROADMAP...). High-traffic reference.
- Root + misc (`README.md`, `CLAUDE.md`, `AGENTS.md`, `HANDOFF-scaffold.md`,
  `docs/PLANO-TIME-AGENTS.md`, `docs/LESSONS.md`, `docs/DISCREPANCIAS-...`) — ~10 files.

Excluding `docs/_archive` (18 files) drops the real scope to **~102 files, ~24k lines**. Even
split by the ticket's own ordering (agent instructions → ADRs/contracts → product docs →
`.specs` → strategy/research), this is the largest phase by file count: realistic split is
**6-8 PRs**, each one topic area.

## Total shape of the remaining work

| Ticket | PRs (est.) | Unit of change |
|---|---|---|
| EDU-83 | 4 | 101 renames (identifiers + paths) |
| EDU-84 | 6 | 593 comment lines (mostly deletions) |
| EDU-85 | 5 | 332 test titles (pair with EDU-84 per file where they overlap) |
| EDU-86 | 6–8 | ~102 markdown files / ~24k lines (archive excluded) |
| **Total** | **~21–23 PRs** | |

This is materially larger than a "translate strings" task — most of EDU-84's value comes from
**deleting** comments per the Keep/Remove list, not translating them, so the phase order
(delete → rename/extract → translate) actually shrinks the file before it's touched again by
EDU-85's title pass.

## Suggested execution order (revised)

1. **EDU-83** first (mechanical, typecheck-verified, unblocks nothing else but is cheap and safe).
2. **EDU-84 + EDU-85 combined per file/folder**, not as two separate full passes — same files,
   avoids double-touching `webhook.service.test.ts` etc. Start with `lib/services` +
   `lib/integration/asaas` (highest violation density, most business-critical).
3. **EDU-86 last**, and decide upfront whether `docs/_archive` is translated or excluded from
   the check (recommend: excluded — it's dead weight, translating it has zero payoff).

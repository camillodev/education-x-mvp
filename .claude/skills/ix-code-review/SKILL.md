---
name: ix-code-review
description: >
  Code review process and format for Impact X projects. Activate when mentioning: "code review",
  "review", "PR review", "revisa codigo", "merge", "review PR", "analisa PR", "aprovacao de codigo".
  Covers severity classification, finding format, merge blocking rules, false positive policy,
  review checklist. Stack-agnostic process — works for frontend, backend, or any IX project.
---

# IX Code Review — Review Process & Format

How to conduct and format code reviews at Impact X. Stack-agnostic process.

For security-specific knowledge, see `ix-security`.
For code quality rules, see `ix-code-guidelines`.

**Pre-requisito**: `ix-code-guidelines` (what to look for), relevant stack skill for context.

---

## Severity Classification

### [CRITICO] — Blocks merge

Issues that MUST be fixed before merge. No exceptions.

- Security vulnerabilities (injection, XSS, exposed secrets)
- Data loss risk (missing migrations, destructive operations without confirmation)
- Broken functionality (logic errors that break existing features)
- Exposed credentials or sensitive data
- Missing auth on protected endpoints

### [MEDIO] — Fix before production

Issues that should be fixed before going to production but don't need to block the PR immediately.

- Performance issues (N+1 queries, missing indexes, unbounded lists)
- Missing tests for critical paths
- Incorrect error handling (swallowing errors, wrong error codes)
- Missing input validation on system boundaries
- Race conditions or concurrency issues

### [BAIXO] — Best practices

Suggestions for improvement. Never block merge.

- Naming improvements
- Refactoring suggestions (extract function, simplify logic)
- Minor style issues not caught by linter
- Documentation suggestions
- Better abstractions available

---

## Finding Format

Every finding follows this structure:

```
[SEVERIDADE] Titulo conciso do problema
Arquivo: path/to/file.ts:42
Problema: descricao clara do que esta errado e por que e um problema
Exemplo: trecho de codigo problematico (se aplicavel)
Fix: solucao concreta — nao so apontar o problema, dar a resposta
Confianca: alta | media
```

**Rules**:
- ONLY report findings with **alta** or **media** confidence
- Never report low-confidence findings — they waste everyone's time
- If uncertain, mark as `Confianca: media` and explain why
- Always include a concrete Fix — never just identify the problem

---

## Merge Blocking Rules

| Condition | Action |
|---|---|
| Any `[CRITICO]` finding | **BLOCK** merge |
| 3+ `[MEDIO]` findings | **BLOCK** merge |
| 1-2 `[MEDIO]` findings | Approve with comments, fix before prod |
| Only `[BAIXO]` findings | **APPROVE** — optional improvements |
| Zero findings | **APPROVE** |

---

## Review Checklist

Supplements the PR checklist from `ix-code-guidelines`. Check these during review:

### Security
- [ ] No secrets in code (API keys, tokens, passwords)
- [ ] Auth present on protected routes/endpoints
- [ ] Input validation on all system boundaries (Zod)
- [ ] No `NEXT_PUBLIC_*` exposing server secrets

### Logic
- [ ] Error handling present and appropriate
- [ ] Edge cases covered (empty arrays, null values, concurrent access)
- [ ] No regression in existing functionality
- [ ] Business rules correctly implemented

### Quality
- [ ] Tests cover new/changed logic
- [ ] No file exceeds 500 lines
- [ ] No duplicated patterns — extracted to utils/hooks
- [ ] Naming follows conventions (see `ix-code-guidelines`)

### Operations
- [ ] Database migrations are reversible
- [ ] No console.logs or commented-out code
- [ ] Environment variables documented if new ones added
- [ ] API response format follows `{ data, error }` standard

---

## False Positive Policy

- ONLY report issues you are confident about
- If uncertain about a finding, ask the author rather than reporting it as an issue
- "Possivel falso positivo" prefix for medium-confidence findings
- Better to miss a low-severity issue than to waste time on false positives
- Focus on IMPACT — a minor style issue doesn't deserve the same attention as a security hole

---

## Review Process

1. **Read the PR description** — understand WHAT and WHY before looking at code
2. **Check the diff** — look at all changed files, not just the ones you recognize
3. **Apply checklist** — systematically check each item above
4. **Write findings** — use the finding format, one finding per issue
5. **Classify severity** — be honest, don't inflate severity for attention
6. **Decide** — approve, request changes, or block based on merge rules
7. **Be constructive** — review is about making code better, not about being right

---

## Encadeamento

| Quando | Encadeia com |
|---|---|
| Security depth | `ix-security` (OWASP, RLS, fintech checks) |
| Code quality rules | `ix-code-guidelines` (naming, TDD, DRY) |
| Frontend specifics | `ix-frontend` (layers, Zustand patterns) |
| Backend specifics | `ix-backend` (API format, error classes) |

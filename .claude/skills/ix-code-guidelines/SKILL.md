---
name: ix-code-guidelines
description: >
  Cross-cutting code quality rules for all IX projects. Covers naming, file structure, TDD, error handling,
  DRY, language rules, commits, PRs. Activate BEFORE writing any code in any IX project (frontend, backend,
  CLI, scripts). This skill is stack-agnostic -- specific architecture patterns live in ix-frontend (layers,
  Zustand) or ix-engineering (system design, PRD). This skill covers HOW to write code; those cover WHERE
  to put it.
---

# IX Code Guidelines

Cross-cutting rules for all code written by agents in IX projects.
Read this BEFORE writing any code. Stack-agnostic.

**For frontend architecture** (layers, Zustand, Next.js): chain with `ix-frontend`.
**For engineering cycle** (PRD, system design, deploy): chain with `ix-engineering`.

---

## Rule 0 -- Before You Write Code

1. **Check for existing patterns** in the codebase. Reuse before creating.
2. **Name the file and function first.** If you can't name it clearly, the responsibility is not clear enough.
3. **Write the test first (TDD).** RED -> GREEN -> REFACTOR.
4. **Check the target file's line count.** If adding code pushes it past 500 lines, split FIRST.

---

## File Size Limit -- 500 Lines Max

Any application code file exceeding 500 lines must be split.
Applies to: components, hooks, stores, services, utils, actions, pages, tests.
Does NOT apply to: skill files, documentation, config files.

### Decision flow
```
File > 500 lines?
  -> YES -> Identify responsibilities inside the file
         -> Each responsibility becomes its own file
         -> Each new file follows single-responsibility
         -> Original file becomes an orchestrator or gets deleted
  -> NO  -> Keep as is
```

---

## DRY -- Extract Before Repeating

Same pattern in 2+ places? Extract immediately.

| Repeated pattern | Extract to |
|---|---|
| Same UI block | Sub-component |
| Same state logic (toggle, debounce, pagination) | Custom hook |
| Same data transformation | Utility function |
| Same event handler pattern | Custom hook or helper |
| Same loading/error boilerplate | Helper (e.g. `withLoading`) |

Before creating anything new, search the codebase for similar patterns. Compose existing code before creating new.

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `InvoiceCard.tsx` |
| Hook file | `useCamelCase.ts` | `useBilling.ts` |
| Store file | `camelCaseStore.ts` | `billingStore.ts` |
| Service file | `kebab-case-service.ts` | `billing-service.ts` |
| Utility file | `kebab-case.ts` | `filter-utils.ts` |
| Type file | `kebab-case.ts` | `billing-types.ts` |
| Test file | `__tests__/source-name.test.ts` | `__tests__/billing-service.test.ts` |
| Function (public) | `verbNoun` | `getGuardianRows` |
| Function (private) | `_verbNoun` or non-exported | `_validateInput` |
| Constant | `UPPER_SNAKE` | `MAX_RETRY_COUNT` |
| Type/Interface | `PascalCase` | `BillingKpis` |
| Enum value | `UPPER_SNAKE` | `Status.INVOICED` |

### Private function naming categories

| Category | Pattern | Example |
|---|---|---|
| Validation | `validate[What]` | `validateInput()` |
| Mapping | `map[Source]To[Target]` | `mapInvoiceToRow()` |
| Business rules | `can[Action]` / `is[Condition]` | `canTransition()` |
| Error handling | `handle[Context]Error` | `handleApiError()` |
| Data building | `build[What]` | `buildPayload()` |
| Processing | `process[What]` | `processQueue()` |

---

## Language Rules

| What | Language |
|---|---|
| Code (variables, functions, files) | **English** |
| Comments | **English** |
| UI text (labels, buttons, toasts, errors) | **pt-BR** |
| Commit messages | **English** (imperative) |
| TypeScript types/interfaces | **English** |
| Test descriptions | **English** |

---

## Error Handling

### Result types for expected failures
```ts
type Result<T> = { success: true; data: T } | { success: false; error: string }
```

### Error categorization
```ts
function mapErrorCategory(err: unknown): ErrorCategory {
  if (err instanceof ApiError) return 'API'
  if (err instanceof ZodError) return 'VALIDATION'
  if (err instanceof PrismaClientKnownRequestError) return 'DATABASE'
  return 'UNKNOWN'
}
```

### User-facing error messages: always pt-BR
```ts
catch (err) {
  set({ error: 'Erro ao processar. Tente novamente.' })
}
```

### Fire-and-forget for non-critical side effects
```ts
notifySlack(params).catch(() => {})  // don't block main operation
```

---

## Testing -- TDD

### Rules
- Write the test first. RED -> GREEN -> REFACTOR.
- Test file lives next to the source: `__tests__/[name].test.ts`.
- Services and business logic get the most tests.
- Pure utility functions get exhaustive tests -- they're cheap to test.

### Execution order
```
1. pure-utils.test.ts   -> RED -> GREEN   (independent)
2. service-a.test.ts    -> RED -> GREEN   (independent)
3. service-b.test.ts    -> RED -> GREEN   (independent)
4. main-service.test.ts -> RED -> GREEN   (depends on 1+2+3)
5. Wiring (actions, store, page)
6. npm run test:run && npm run lint && npm run build
```

Steps 1-3 are independent -- run in parallel when possible.

### Test naming
```ts
describe('MetricsService', () => {
  describe('computeKpis', () => {
    it('sums INVOICED + PAID + OVERDUE into totalBilled', () => { ... })
    it('returns all zeros for empty array', () => { ... })
  })
})
```

---

## Refactoring -- Before You Touch Existing Code

1. **Identify existing patterns** that already solve part of the problem.
2. **List them** in a reuse table (pattern, location, how to reuse).
3. **Never reinvent** what exists.

### When decomposing a God Function
1. Identify each responsibility (fetch, validate, transform, persist, notify).
2. Each becomes its own private function with a clear name.
3. The public function becomes an orchestrator.
4. Each private is independently testable.

---

## Commits (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body -- explain WHY, not WHAT]

[optional footer -- breaking changes, closes #issue]
```

**Types**: `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `style` | `perf`

**Rules:**
- 1 commit = 1 logical change. Never "WIP" or "misc fixes".
- English, imperative, <72 chars.
- Body explains WHY, not WHAT.

---

## Pull Requests

```
## What
[1-2 sentences]

## Why
[Context: Linear ticket link, problem it solves]

## How
[Technical approach in 2-3 bullets]

## Testing
- [ ] [concrete test steps]

## Screenshots
[if UI changes]
```

**Rules:**
- Title: conventional commit format
- Max 400 lines. If larger, split into smaller PRs.
- Self-review before requesting review
- No console.logs or commented-out code

---

## PR Checklist

Before opening any pull request:

- [ ] No application code file exceeds 500 lines
- [ ] No duplicated patterns -- extracted to utils/hooks
- [ ] Every new function has a test
- [ ] Tests written before implementation (TDD)
- [ ] Services are stateless with clear public/private separation
- [ ] Existing patterns reused (check reuse table)
- [ ] All code and comments in English, UI text in pt-BR
- [ ] `npm run test:run && npm run lint && npm run build` passes
- [ ] No console.logs or commented-out code
- [ ] No secrets hardcoded

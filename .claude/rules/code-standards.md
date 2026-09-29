# Code Standards — Naming, Comments, Tests, Commits

Loads for any code change. Enforced by `pnpm lint` (`scripts/check-language.mjs`) — see EDU-82.

## Language

- **Code, comments, tests, identifiers, internal paths, commits, PR titles: English.**
- **UI stays pt-BR**: string literals rendered to the user, JSX text, page route segments under
  `src/app/` (outside `src/app/api/`) since they are user-facing URLs, and test fixtures that
  simulate pt-BR user data.
- `prisma/migrations/*` already applied: never touched (immutable history).

## Naming (domain glossary)

English everywhere in code. Use these mappings — do not invent alternatives:

| pt-BR | English |
|---|---|
| cobrança | `Invoice` / charge |
| matrícula | `Enrollment` |
| responsável | `Guardian` |
| escola | `Unit` (or `School` in admin-facing UI code) |
| aluno | `Student` |
| negativação | `Dunning` |
| mensalidade | tuition |
| vencimento | `dueDate` |
| orientador | `Advisor` |
| dados | details / info |
| plano | `Plan` |
| pendente | pending |
| aprovar / recusar | approve / reject |

Intention-revealing names so the name replaces the need for a comment. Keep the repo's existing
conventions: PascalCase for components/types, camelCase for functions/vars, kebab-case for
`lib/` and `hooks/` files.

## Comments — a comment only exists if it earns its place

**Keep (English, 1–2 lines):**
1. **Non-obvious local "why"** — an invariant, a workaround for an external API (Asaas), a
   constraint that stops someone from "fixing" it wrong.
   ✅ `// Asaas expects reais, not cents`
2. **Warning of consequences.**
   ✅ `// Must stay idempotent: webhook retries replay events`
3. **Public contract docs (JSDoc)** on exported functions in `lib/services` and
   `lib/integration` only when the signature doesn't explain itself.
4. **`TODO(EDU-123)`** — always tied to a ticket.
5. **A 1-line pointer to a decision.**
   ✅ `// See ADR-0008`

**Remove (do not write, delete on sight):**
- **Journal / history** — ticket refs outside `TODO(...)`, "Emenda", "was X before", "no longer",
  "renamed from", "security review finding". That belongs in the commit/PR/ADR; git already
  stores it.
  ❌ `// EDU-27 — listInvoices filtra por unitId (via forUnit)`
  ❌ `// não mais string literal (ADR-0008 Emenda 3)`
- **Redundant** — restates what the code already says.
  ❌ `// fetch invoices` above `getInvoices()`
- **Decision narrative** — paragraphs on why A was chosen over B. Goes to the ADR; leave only a
  pointer (item 5 above).
- **Banners / position markers.**
  ❌ `// ------`, `// ===== Section`
- **Commented-out code.**
- **Nonlocal info** — describes behavior that lives in another file.
- **Walls of text** — if a comment needs more than 3 lines, the code needs a better name/extraction,
  or the text belongs in an ADR.

**Cleanup rule of thumb:** for each comment — **delete first**, then **rename/extract** if the
code got unclear without it, and only **translate** what survives the Keep list.

**Never edit `.language-baseline.json` to lower a violation count without actually fixing the
code** — same principle as never editing a test to make it pass.

## Tests

Behavior-shaped titles in English: `it("returns 403 when unit differs")`, not
`it("deve retornar 403")`.

## Commits & PRs

Conventional Commits in English: `feat(billing): EDU-74 add dunning schema`. PR title in
English. Decision rationale goes in the PR description, not in code comments.

## Check command

```bash
pnpm lint            # runs next lint + node scripts/check-language.mjs
node scripts/check-language.mjs --files <path>   # single file, used by the pre-edit hook
```

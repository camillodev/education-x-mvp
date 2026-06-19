# AGENTS.md — agentic-workflow

> Builder portável de SaaS com agentes. Contrato cross-tool para Claude, Copilot, Cursor, Gemini.

## Project Overview

Fábrica de SaaS com agentes embutidos. Config reutilizável + 7 subagents + skills de disciplina = novo SaaS em semanas. Stack: Next.js App Router, Supabase, Tailwind/shadcn, Zod, Vitest, Playwright.

## Build & Test

```bash
npm run dev          # localhost:3000
npm run build        # production bundle
npm run lint         # eslint + prettier
npm run typecheck    # tsc strict
npm run test         # vitest unit
npm run test:e2e     # playwright
```

## Code Style

- **TypeScript strict mode** — sempre. Sem `any`.
- **Arquivo ≤ 500 linhas** — split grande lógica em utils ou hooks.
- **DRY obrigatório** — zero duplicação, abstrair patterns.
- **Código em inglês**, UI em pt-BR (i18n pronto em `/locales`).
- **Server Actions > Route Handlers** — preferência Next.js App Router.
- **Zod schema = fonte de tipos** — não deixar type divergir de schema.

## Boundaries

- ❌ **Nunca commit em main** — sempre `feature/` ou `fix/` branch
- ❌ **PR ≤ 400 linhas** — split task grande em múltiplos PRs
- ❌ **Nunca editar testes pra passar** — fix código, não teste
- ❌ **Secrets nunca hardcoded** — `process.env.VAR`, `.env.local`, Bitwarden vault
- ❌ **Cliente-side nunca toca secret** — RLS em toda tabela Supabase

## Agents & Skills

**Subagents em `.claude/agents/`:**
1. `ana-journal` — logging/auditing
2. `bruno-api` — integrations Asaas/HubSpot
3. `coda-coder` — engineering lead Sonnet
4. `davi-agent-builder` — cria agentes novos
5. `leo-devops` — infra/CI
6. `julia-weekly` — síntese semanal
7. `kai-secrets-rotation` — security

**Skills obrigatórias:**
- `ix-core` (sempre primeiro)
- `task-contract` (specification ritual)
- `superpowers:*` (brainstorm/plan/verify/code-review)

## Where to Learn

- `lessons/00-INDEX.md` — onboarding, patterns, anti-patterns
- `.specify/memory/constitution.md` — arquitetura, decisões congeladas
- `.claude/CLAUDE.md` — instruções para Claude (já importa este arquivo)

# AGENTS.md — agentic-workflow

> Builder portável de SaaS com agentes. Contrato cross-tool para Claude, Copilot, Cursor, Gemini.

## Project Overview

Fábrica de SaaS com agentes embutidos. Config reutilizável + 10 subagents + skills de disciplina = novo SaaS em semanas. Stack: Next.js App Router, Supabase, Tailwind/shadcn, Zod, Vitest, Playwright.

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
- ❌ **Nunca `Read`/`cat`/`grep` direto em `.env`/`.env.local`** para confirmar se uma secret existe — é bloqueado por permissão e não deve ser contornado. Para checar presença/formato plausível sem expor o valor: `source arquivo.env 2>/dev/null; echo "${#VAR_NAME}"` (reporta só o comprimento). Ver `.claude/rules/security.md`.

## Agents & Skills

**Subagents em `.claude/agents/`** (espelho global em `~/.claude/agents/`; histórico completo de decisão em `docs/PLANO-TIME-AGENTS.md`):
1. `product-manager` — prioriza Backlog do Linear e mantém "A Fazer" com lote fixo pré-aprovado; cria issue nova quando item do roadmap não tem ticket
2. `system-architect` — decide arquitetura fundacional irreversível: schema Prisma, isolamento de tenant, contrato de pagamento, escolha estrutural de lib
3. `feature-architect` — desenha blueprint executável de uma feature dentro do padrão já estabelecido no repo (renomeia `code-architect`)
4. `code-explorer` — mapeia o território do codebase relevante ao ticket/tarefa e devolve sumário destilado
5. `code-implementer` — implementa o blueprint aprovado respeitando as regras de camada e tipo do repo
6. `test-writer` — escreve teste que falha antes da mudança e passa depois, para os módulos tocados
7. `debugger` — reproduz a falha reportada, encontra a causa raiz, aplica patch mínimo
8. `code-reviewer` — audita o diff em busca de bug, violação de padrão e risco de qualidade, reportando só achados de alta confiança
9. `security-auditor` — encontra vulnerabilidade OWASP, falha de isolamento multi-tenant, secret exposto e vazamento de PII antes de produção
10. `silent-failure-hunter` — caça código que falha sem avisar: catch vazio, fallback silencioso, erro suprimido

**Skills do projeto em `.claude/skills/`:**
- `dev-workflow` — orquestrador do pipeline (tabela de gatilho, 4 gates, falha parcial, teto de 3 ciclos)
- `task-contract` — ritual de especificação antes de codar
- `agent-builder` — criar/auditar agente
- `edx-spec`, `edx-adr`, `edx-homologacao`, `edx-datatable` — skills auto-contidas específicas do projeto

**Skills globais herdadas (fora deste repo):** `ix-core`, `superpowers:*` (brainstorm/plan/verify/code-review) — carregadas pelo ambiente Claude Code do Rafael, não vivem em `.claude/skills/` deste projeto.

## Where to Learn

- `lessons/00-INDEX.md` — **não existe neste repo hoje** (verificado); se for criado, é o destino correto para onboarding/patterns/anti-patterns
- `.specify/memory/constitution.md` — arquitetura, decisões congeladas
- `CLAUDE.md` (raiz do projeto, sem `.claude/`) — instruções para Claude (já importa este arquivo via `@AGENTS.md`)

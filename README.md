# Education X

Plataforma de gestão financeira escolar: matrícula → cobrança → recebimento → nota fiscal → negativação. Multi-tenant (cada escola é uma `Unit` isolada). Primeiro mercado: franquias Kumon.

## Stack
Next 15.5 (App Router) · React 19 · TypeScript strict · Prisma 6 + Supabase (Postgres) · Clerk 6 · Tailwind 4 + shadcn (tokens Alfabeto) · TanStack Table v8 · Asaas · Vercel.

## Pré-requisitos
- **Node 22+** e **pnpm 11+** (`corepack enable` ou `npm i -g pnpm`)
- Contas: **Supabase** (Postgres `sa-east-1`), **Clerk** (auth), **Asaas sandbox** (pagamentos)

## Setup (primeira vez)
```bash
# 1. Instalar dependências (instala também o git pre-commit hook automaticamente)
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env.local
#    Preencher .env.local:
#    - DATABASE_URL / DIRECT_URL → Supabase (Project Settings > Database > Connection string)
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY → Clerk Dashboard (test keys)
#    - ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3 + ASAAS_MASTER_API_KEY (sandbox)
#    - ENCRYPTION_KEY → 32 bytes hex: `openssl rand -hex 32`
#    - NEXT_PUBLIC_APP_URL=http://localhost:3000

# 3. Banco: gerar client + aplicar schema
pnpm prisma generate
pnpm prisma migrate dev

# 4. Subir o dev server
pnpm dev   # http://localhost:3000
```

### Checklist "primeira rodada OK"
- [ ] `pnpm dev` sobe sem erro · home renderiza com o azul Alfabeto (`#0467DB`)
- [ ] `pnpm typecheck` passa · `pnpm test:run` verde
- [ ] `pnpm build` completa
- [ ] `.git/hooks/pre-commit` existe (symlink criado pelo `pnpm install`)

## Estrutura
```
.claude/          # como o Claude trabalha (auto-contido, portátil)
  AGENTS.md       # pipeline de engenharia + papéis dos modelos (fonte de verdade da orquestração)
  rules/          # regras path-scoped (frontend, backend, asaas, security, lgpd)
  skills/         # workflows do projeto (edx-asaas, edx-datatable)
  agents/         # subagent revisor (coda-reviewer, Opus)
  hooks/          # enforcement (block-secrets, pre-commit, install-hooks)
specs/            # o que construir (protótipo aprovado + épicos)
docs/
  product/        # PLANO-TECNICO, SYSTEM-DESIGN, ROADMAP, DEVOPS, ESTIMATIVA
  strategy/       # ICP, market sizing (revisados) + WIP-* (não validados)
  research/       # personas, hipóteses (WIP)
  decisions/      # ADRs (por que cada decisão de arquitetura)
  api-contracts/  # payloads Asaas (verificados via MCP em sandbox)
  superpowers/plans/  # planos de implementação por tarefa
src/              # código (camadas: Component→Hook→Store→Service→API)
prisma/           # schema + migrations
tests/            # unit / integration / e2e
```

> **Setup:** skills e regras específicas do projeto (`.claude/rules/`, `.claude/skills/edx-*`) vivem no repo. Os 10 agentes de execução (`code-implementer`, `code-reviewer`, etc.) são globais em `~/.claude/agents/` — outro dev precisa desse setup além de `git clone` + `pnpm install`.

## Como o Claude trabalha aqui
Leia **`AGENTS.md`** — define o pipeline de execução de tarefa (contexto → plano → docs → execução TDD → verificação E2E → review → ship) e quais modelos usar (Sonnet orquestra/constrói · Haiku mecaniza · Opus revisa o crítico).

## Regras essenciais (detalhe em `CLAUDE.md` + `.claude/rules/`)
- TDD · 500 linhas/arquivo · valores em **centavos** (reais só na borda Asaas e na exibição)
- Isolamento de tenant por `unitId` da sessão Clerk · secrets via env (`${VAR}`)
- Nomenclatura inglesa nas entidades (`Unit`, `Guardian`, `Student`, `Subject`)

## Git flow
`feature/` | `fix/` | `chore/` → PR. **Nunca** commit direto em `main`/`develop` (o pre-commit hook bloqueia).
O hook é instalado automaticamente no `pnpm install`. Para reinstalar manualmente: `pnpm prepare`.

## Qualidade (gate)
```bash
pnpm test:run && pnpm typecheck && pnpm lint && pnpm build
```
Em cada PR, o CI (`.github/workflows/ci.yml`) roda esses gates + Playwright E2E nos 3 breakpoints (375/768/1440) e a Vercel gera um preview deploy para revisão assíncrona.

# Education X

Plataforma de gestão financeira escolar: matrícula → cobrança → recebimento → nota fiscal → negativação. Multi-tenant (cada escola é uma `Unit` isolada). Primeiro mercado: franquias Kumon.

## Status
**Fase 0 — Setup** (governança montada). Scaffold Next/Prisma e features a partir de 16/jun. Ver `docs/PLANO-FASE-0-SETUP.md` e `CLAUDE.md`.

## Stack
Next 16 (App Router) · React 19 · TypeScript · Prisma + Supabase · Clerk · Tailwind 4 + shadcn (tokens Alfabeto) · TanStack Table · Asaas · Vercel.

## Estrutura
```
.claude/          # como o Claude trabalha (settings, rules, skills, agents, hooks)
specs/            # o que construir (protótipo + épicos)
docs/
  decisions/      # ADRs (por que cada decisão de arquitetura)
  api-contracts/  # payloads Asaas (descobertos via MCP)
  system-design.md
src/              # código (camadas: Component→Hook→Store→Service→API)
prisma/           # schema + migrations
tests/            # unit / integration / e2e
```

## Regras essenciais
Ver `CLAUDE.md` (constituição) e `.claude/rules/` (frontend, backend, asaas, security, lgpd).
- TDD · 500 linhas/arquivo · valores em centavos (reais só na borda Asaas/frontend)
- Isolamento de tenant por `unitId` da sessão · secrets via env · branch flow (nunca commit em main)

## Setup local (pós-scaffold)
```bash
pnpm install
cp .env.example .env.local   # preencher
pnpm dev
```

## Git flow
`feature/` | `fix/` | `chore/` → PR. Nunca commit direto em `main`/`develop`.
Instalar o pre-commit: `ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit`

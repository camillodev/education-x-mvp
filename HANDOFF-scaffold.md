# HANDOFF — Finalizar Fase 0 (scaffold) e iniciar Tarefa 1

> Para a próxima sessão. A governança da Fase 0 está mergeada (PR #1), mas o **scaffold do projeto Next NÃO foi feito**. Sem ele não há `pnpm dev`, então a Fase 0 não está 100% — falta esta parte. Comece por aqui.

## Estado atual (verdade)

**✅ Feito (PR #1 mergeado na `main`):**
- Governança: `CLAUDE.md`, `.claude/rules/` (frontend/backend/asaas/security/lgpd), hooks (block-secrets, pre-commit), `.claude/agents/coda-reviewer.md`, `.github/pull_request_template.md`, `.mcp.json`
- 5 ADRs em `docs/decisions/` (stack travada — ler antes de codar)
- Cliente Asaas migrado em `src/lib/integration/asaas/` (interface+live+mock+tests)
- `.env.local` com chave **sandbox** preenchida e validada (HTTP 200)
- Asaas verificado: dunning/antecipação/transfer liberados (`docs/api-contracts/asaas-verificacao-conta.md`)

**❌ NÃO feito (este handoff):**
- Scaffold Next 16 / Prisma / Clerk / shadcn / tokens Alfabeto
- `package.json`, `pnpm install`, `pnpm dev` funcionando
- CI + preview deploy (Vercel)
- Tarefa 1 (cadastro da escola)

## Localização
- Repo local: `/Users/rafae/projetos/education-x` · branch `main`
- GitHub: `camillodev/education-x-mvp` (privado)
- Plano técnico: `docs/PLANO-TECNICO.md` · Deadlines: núcleo 20/jun, MVP 30/jun

## Decisões travadas (ADRs — NÃO reabrir)
- **Next 16** App Router (RSC) · **monolito modular** (não NestJS) — ADR-0001
- **Multitenancy por aplicação** (unitId da sessão Clerk, Prisma extension, não RLS) — ADR-0002
- **Asaas via cliente tipado** (já migrado) — ADR-0003
- **shadcn/ui + tokens Alfabeto** (não @impactxlab/design-system) — ADR-0004
- **TanStack Table** = DataTable único — ADR-0005
- Valores em **centavos** no app, reais só na borda Asaas · entidades em **inglês** (`Unit`, `Guardian`, `Student`, `Invoice`)

---

## PLANO da próxima sessão

### Passo 0 — Abrir contexto (5 min)
1. Ler `CLAUDE.md` + `docs/decisions/*.md` (ADRs) + `docs/system-design.md`
2. Confirmar branch: `git checkout main && git pull` → criar `feature/scaffold` (NUNCA commit em main)
3. **Consultar context7** antes de qualquer config (Next 16, Prisma, Clerk, Tailwind 4, shadcn mudam — cutoff do modelo pode estar defasado)

### Passo 1 — Scaffold (Fase 0 — parte 2) → vira o 2º PR
Tudo isto é a Tarefa 0.2/0.3 do PLANO-TECNICO:
- [ ] `create-next-app` — Next 16, React 19, TS strict, App Router, Tailwind 4, **pnpm**, src/ dir
- [ ] Estrutura de pastas do `docs/system-design.md` §3: `components/ui` (átomos shadcn), `components/patterns` (DataTable etc.), `lib/services`, `lib/db.ts`, `lib/integration/asaas` (já existe)
- [ ] **shadcn init** + componentes base (Button, Input, Card, Table, Dialog, Form, Select) estilizados com **tokens Alfabeto** (`src/styles/alfabeto.css` já existe — importar)
- [ ] **Prisma** init + `lib/db.ts` (singleton) + `schema.prisma` base (vazio por enquanto, ou só `Unit`)
- [ ] **Clerk** instalado + middleware (sem implementar auth ainda, só o setup)
- [ ] **TanStack Table** instalado (dependência, sem DataTable ainda)
- [ ] `config/env.ts` — validação Zod das env vars no boot (derruba app se faltar)
- [ ] **vitest** + **playwright** configurados (vitest.config thresholds; playwright 3 breakpoints 375/768/1440)
- [ ] Confirmar: `pnpm dev` sobe · `pnpm build` passa · suite Asaas (já migrada) **verde**
- [ ] Instalar o pre-commit hook: `ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit`
- [ ] CI (GitHub Actions): test+typecheck+lint+build+e2e · Preview deploy Vercel
- [ ] PR #2 contra `main` usando o template

### Passo 2 — Verificação do scaffold (antes de fechar o PR #2)
- `pnpm dev` abre em localhost:3000 sem erro
- `pnpm test:run` — suite Asaas verde
- `pnpm typecheck && pnpm lint && pnpm build` — tudo passa
- Um componente shadcn renderiza com a cor Alfabeto (#0467DB)
- Env inválido derruba o boot (testar removendo uma var)

### Passo 3 — Tarefa 1 (cadastro da escola) → pode ser 3º PR ou continuar no 2º
Só DEPOIS do scaffold verde. Ver PLANO-TECNICO Tarefa 1.1→1.4 + 1.3 detalhada (wizard 4 passos).
Deadline da Tarefa 1: **ter 17/jun**.

---

## Avisos importantes
- **Asaas sempre sandbox.** A chave no `.env.local` é `$aact_hmlg_...` (sandbox). Header `access_token` (não Bearer). Valores em REAIS na API Asaas, centavos no resto.
- **Secret:** o `$` é parte da chave Asaas — no `.env.local` precisa de **aspas simples** (`'$aact...'`) senão o shell expande. Não ler/expor o valor.
- **Modelos:** Opus pra arquitetura/schema/auth; Fable pra telas/services; Haiku pro mecânico.
- **Pendências Asaas abertas:** CONFIRMED vs RECEIVED (decidir no webhook), tokenização cartão (Tarefa 7.2). Dunning/antecipação/transfer já confirmados liberados.

## Comando pra iniciar a próxima sessão
```
cd /Users/rafae/projetos/education-x && git checkout main && git pull
# então: "leia o HANDOFF-scaffold.md e finalize o scaffold da Fase 0"
```

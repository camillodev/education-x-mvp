# Education X — Constituição do Projeto

Plataforma de gestão financeira escolar (matrícula → cobrança → recebimento → nota fiscal → negativação). Multi-tenant: cada escola é uma `Unit` isolada. Primeiro mercado: franquias Kumon.

## Stack
- **Next 16** (App Router, RSC) · **React 19** · **TypeScript strict**
- **Prisma** + **Supabase PostgreSQL** (`sa-east-1`)
- **Clerk** (auth) · **Tailwind 4** + **shadcn/ui** (tokens Alfabeto) · **TanStack Table**
- **Asaas** (pagamentos, via cliente tipado) · **Vercel** (deploy)

## Regras de ouro (inegociáveis)
1. **TDD:** RED → GREEN → REFACTOR. Teste antes do código.
2. **500 linhas/arquivo máx.** Split antes de ultrapassar.
3. **Camadas:** Component → Hook → Store → Service → API. Nunca pular.
4. **Valores em centavos (Int) no app.** Converter pra reais SÓ na borda do cliente Asaas e no frontend. Nunca Float.
5. **Nomenclatura inglesa** nas entidades: `Unit`, `Guardian`, `Student`, `Invoice`, `Enrollment`. Nunca `Escola`/`Boleto`.
6. **Idioma:** código e comentários em inglês; UI em pt-BR.
7. **Isolamento de tenant:** `unitId` SEMPRE vem da sessão Clerk, NUNCA de parâmetro HTTP (exceto webhook Asaas, validado por token).
8. **Secrets:** sempre `${VAR}` / env. Nunca hardcoded. Hook bloqueia.
9. **Branch flow:** `feature/` | `fix/` | `chore/` → PR. Nunca commit direto em `main`/`develop`. Sem `Co-Authored-By`.
10. **Reuso > recriação:** antes de criar componente/função, checar se já existe. Zero duplicação (atomic design).

## Onde estão as regras detalhadas
- `.claude/rules/frontend.md` — React/Next/shadcn/Alfabeto/atomic/responsividade
- `.claude/rules/backend.md` — services/Prisma/camadas
- `.claude/rules/asaas.md` — contratos Asaas (sandbox-first, reais na API)
- `.claude/rules/security.md` — isolamento de tenant, secrets
- `.claude/rules/lgpd.md` — proteção de dados pessoais (PII)
- `docs/system-design.md` — arquitetura, camadas, atomic, DataTable, responsividade
- `docs/decisions/` — ADRs (por que cada decisão de arquitetura foi tomada)
- `specs/epicos/` — o que cada fluxo faz (EDX-01..09)

## Quando usar cada modelo (orquestrador)
- **Opus** — arquitetura, schema, auth/tenant, contratos Asaas, review crítico
- **Fable** — massa do código: telas, services testáveis, CRUD, DataTable
- **Haiku** — componentes dumb, columns, boilerplate

## Workflow
- Antes de propor config/sintaxe de lib externa: consultar `context7` (docs live; o cutoff do modelo pode estar defasado).
- Asaas: **sandbox primeiro**, sempre. Confirmar antes de mover dinheiro real.
- Cada tarefa grande = 1 PR com preview. Arquitetura (schema/auth/webhook) = PRs granulares.
- Quality gate: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build` + Playwright (375/768/1440).

## Pendências (antes de codar o que depende) — ver detalhe em `.claude/rules/asaas.md`
- ✅ **Verificado 2026-06-13 na conta sandbox** (`docs/api-contracts/asaas-verificacao-conta.md`): dunning, antecipação e transfer **todos liberados** (HTTP 200). Confirmar o POST de cada na implementação.
- **Decisão sua (ainda aberta):** CONFIRMED vs RECEIVED (qual evento dispara PAID) — resolver ao implementar o webhook. Recomendação: RECEIVED dispara NF/regularização.
- **Tokenização de cartão:** verificar no fluxo de cartão (Tarefa 7.2).
- **Não é Asaas:** inscrição municipal do Kumon Camargos (NFS-e — lado do cliente).

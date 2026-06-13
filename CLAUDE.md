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

## Docs do produto — fonte ÚNICA de verdade (versionada no repo)
> Migrados do Claude Desktop em 13/jun/2026. O repo é a única fonte; o Desktop tem só um README ponteiro. NUNCA buscar docs de produto fora daqui.

**Leituras obrigatórias antes de codar qualquer tarefa:**
- `docs/product/PLANO-TECNICO.md` — o quê + ordem das fases/tarefas (fonte do escopo)
- `docs/product/SYSTEM-DESIGN.md` — arquitetura, camadas, atomic, DataTable, responsividade
- `docs/decisions/` — ADRs (por que cada decisão de arquitetura foi tomada)
- `specs/prototipo/design-handoff/` — protótipo aprovado (fonte pixel-perfect de layout/fluxo). O HTML standalone é o artefato renderizável aprovado; os `.jsx` soltos são apoio de lógica (podem divergir — o standalone manda).

**Referência (consultar quando relevante):**
- `docs/product/ROADMAP.md` · `docs/product/ESTIMATIVA-bottom-up.md` · `docs/product/DEVOPS.md` · `docs/product/DESCOBERTAS-SETUP.md`
- `docs/strategy/` — ICP-FASEADO, MARKET-SIZING (negócio, não orienta código)
- `docs/research/` — PERSONAS, CONFIANCA-PERSONAS, HIPOTESES-VALIDACAO
- `docs/api-contracts/` — payloads reais Asaas (descobertos via MCP)
- `docs/DISCREPANCIAS-roadmap-vs-prototipo.md` — onde roadmap e protótipo divergem
- `docs/_archive/` — material histórico/não-revisado (não é fonte de verdade)
- `specs/epicos/README.md` — índice dos 9 fluxos do MVP

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

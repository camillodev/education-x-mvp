# Education X — Constituição do Projeto

Plataforma de gestão financeira escolar (matrícula → cobrança → recebimento → nota fiscal → negativação). Multi-tenant: cada escola é uma `Unit` isolada. Primeiro mercado: franquias Kumon.

## Contexto de produto/negócio (fonte viva: vault do Rafael)

> Números e escopo abaixo são **snapshot do vault em 18/ago/2026**, não spec de billing congelada — o vault (`profissional/wiki/hot.md`, repo privado `second-brain`) muda mais rápido que este arquivo e é a fonte de verdade contínua **só pra contexto de negócio** (pricing vigente, ICP, prioridade comercial). Isso não muda a regra de "fonte ÚNICA de verdade" da seção "Docs do produto" abaixo — spec e arquitetura de código continuam vindo só de `docs/product/`, `docs/decisions/` e `specs/` deste repo, nunca do vault.

- **Pricing (definido 31/jul, ainda não é doc "revisado" formal — ver `docs/strategy` deste repo pra status de revisão):** Básico = repasse Asaas + margem, teto 15% total; Pro = R$99/mês + **negativação + relatórios avançados** + contas a pagar/receber + gestão de funcionários + suporte prioritário WhatsApp. Isso importa pro código porque negativação e relatórios avançados são feature-gate do Pro, não do MVP Básico.
- **MVP (revisado 31/jul):** negativação e relatórios avançados **saem do escopo inicial (Básico)** e viram gatilho de upgrade pro Pro, construídos na Fase 2 do roadmap — não implementar como parte do Básico. Fintech: cash-in via cartão Asaas com spread 5% já decidido (RFC no vault), mas o pricing de transação do Básico usa o teto de 15% total, não esse spread isolado.
- **ICP:** franquias Kumon primeiro, expandindo depois pra qualquer franquia micro (dono decide, sem TI dedicado) — informa prioridade de feature (simplicidade > configurabilidade).

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
- `docs/product/ROADMAP.md` · `docs/product/ESTIMATIVA-bottom-up.md` · `docs/product/DEVOPS.md`
- `docs/strategy/` e `docs/research/` — negócio, não orienta código diretamente
- `docs/api-contracts/` — payloads reais Asaas (descobertos via MCP)
- `docs/DISCREPANCIAS-roadmap-vs-prototipo.md` — onde roadmap e protótipo divergem
- `docs/_archive/` — material histórico/não-revisado (não é fonte de verdade)
- `specs/epicos/README.md` — índice dos 9 fluxos do MVP

> **Convenção `WIP-`:** docs com prefixo `WIP-` NÃO estão prontos/validados — não tratar como verdade. Revisados de fato: `docs/strategy/ICP-FASEADO.md` e `docs/strategy/MARKET-SIZING.md`. Todo o resto de strategy/research é WIP (`WIP-GTM-PLAN`, `WIP-PRICING-STRATEGY`, `WIP-ALFA-BETA-STRATEGY`, `WIP-SUPORTE-WHATSAPP`, `WIP-DECK-DE-VENDAS`, `WIP-00-PERSONAS`, `WIP-HIPOTESES-VALIDACAO`). As 5 hipóteses críticas (H1/H6/H9/H12/H16) foram resolvidas em 13/jun e estão marcadas dentro de `WIP-HIPOTESES-VALIDACAO`.

## Quando usar cada modelo (papéis — detalhe em `AGENTS.md`)
- **Sonnet** — orquestrador + construtor: coordena o pipeline E constrói a massa (telas, services, CRUD). *(Fable indisponível 14/jun — Sonnet acumula construção; ver AGENTS.md.)*
- **Haiku** — mecânico: componentes dumb, columns, boilerplate de teste.
- **Opus** — arquiteto/revisor: schema, auth/tenant, cripto, contratos Asaas, review crítico (via `advisor()` + subagents `system-architect` e `security-auditor`). Só onde o custo do erro justifica.
- **Pipeline completo de execução de tarefa:** `AGENTS.md` (auto-contido, não depende de skills globais).

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

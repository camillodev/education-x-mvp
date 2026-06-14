# AGENTS — Pipeline de Engenharia do Education X

> **Fonte de verdade da orquestração.** Auto-contido no repo — não depende de nenhuma skill/agent global `~/.claude`. Qualquer Claude (ou dev) lê este arquivo e sabe executar uma tarefa do zero, em qualquer máquina.

## Modelos coordenados (papéis)

| Papel | Modelo | O que faz | Como acionar |
|-------|--------|-----------|--------------|
| **Orquestrador + Construtor** | **Sonnet** | Coordena o pipeline, decide, integra E constrói a massa de código (telas, wizard, services, CRUD). | É o modelo que roda a sessão. `/model sonnet`. |
| **Mecânico** | **Haiku** | Componentes dumb, columns de DataTable, boilerplate de teste, transcrição/conversão. | Subagent `Task` com `model: haiku`, ou `/model haiku` para lote mecânico. |
| **Arquiteto / Revisor crítico** | **Opus** | Schema, auth/tenant, criptografia, contratos Asaas, review de PR crítico. Só onde o custo do erro justifica o custo do modelo. | `advisor()` (review inline) + subagent `coda-reviewer` (`.claude/agents/coda-reviewer.md`). |

> **Fable indisponível (14/jun/2026):** o Roteiro Oficial cita Fable como construtor rápido, mas está indisponível. Enquanto isso, **Sonnet acumula orquestrador + construtor**. Se Fable voltar, migrar a massa de construção pra ele e Sonnet volta a só orquestrar.

**Regra de custo:** Opus só em arquitetura/schema/auth/dinheiro/review crítico. Haiku no mecânico. Sonnet no resto. Nunca usar Opus pra CRUD nem Haiku pra decisão de arquitetura.

## Pipeline de execução de tarefa (7 passos)

Toda tarefa de código passa por aqui. Skip só pra trivial (<20 linhas em arquivo conhecido).

### 1. Contexto (sempre primeiro)
- Ler `CLAUDE.md` (constituição) + a(s) `.claude/rules/` do escopo:
  - `frontend.md` (React/Next/shadcn/Alfabeto/DataTable/responsividade)
  - `backend.md` (Prisma/camadas/centavos)
  - `asaas.md` + skill `.claude/skills/edx-asaas/` (integração pagamento)
  - `security.md` (isolamento tenant, secrets, cripto)
  - `lgpd.md` (PII)
- Ler o ADR relevante em `docs/decisions/` (o porquê das decisões).

### 2. Plano (skip se trivial)
- Tarefa grande (≥3 arquivos ou arquitetura nova) → escrever plano em `docs/superpowers/plans/AAAA-MM-DD-<feature>.md` com TDD, paths exatos, código nos pontos críticos.
- Intenção ambígua → brainstorm com o Rafa antes (uma pergunta por vez).

### 3. Docs ao vivo
- Antes de assumir sintaxe de lib externa (Next 16, React 19, Prisma 6, Clerk 6, Tailwind 4, TanStack v8): consultar `context7` (`mcp__context7__query-docs`). Cutoff do modelo é jan/2026 — libs mudaram.

### 4. Execução (TDD obrigatório)
- RED → GREEN → REFACTOR. Teste antes do código.
- Seguir `.claude/rules/` da stack. Camadas: Component → Hook → Store → Service → API. Nunca pular.
- 500 linhas/arquivo máx. DRY — checar se já existe antes de criar (especialmente DataTable: usar `.claude/skills/edx-datatable/`).
- Valores em centavos no app; reais só na borda Asaas e na exibição.
- Modelo: Sonnet constrói; Haiku faz columns/boilerplate em paralelo (subagent).

### 5. Verificação E2E (OBRIGATÓRIO — não declarar pronto sem isto)
- Gates: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build`.
- Se toca UI/rota: Playwright nos 3 breakpoints (375/768/1440) — console limpo + screenshot em cada. **Tests verdes ≠ feature funcionando.**

### 6. Review
- `advisor()` (Opus) para mudanças críticas: schema, auth/tenant, cripto, dinheiro, webhook.
- Subagent `coda-reviewer` (Opus) antes do PR em qualquer mudança que toque dinheiro/tenant/PII.

### 7. Ship
- Branch `feature/` | `fix/` | `chore/` — NUNCA commit direto em `main`/`develop`.
- Commit SEM `Co-Authored-By` (histórico 100% do Rafa).
- PR via `gh`. CI roda (typecheck+lint+test+build+e2e) + preview deploy Vercel. Rafa revisa assíncrono no preview.
- 1 PR por fluxo (granular onde é crítico: schema/auth em PRs separados).

## Subagents do projeto
- `.claude/agents/coda-reviewer.md` (Opus, read-only) — revisor crítico antes do Rafa: dinheiro, tenant, PII, camadas, usabilidade. **Único subagent.** Não criar fleet de agents-papel — modelos se trocam por `/model`, não por arquivo de agent.

## Regras inegociáveis (resumo — detalhe em CLAUDE.md + rules/)
- Secrets só via env (`${VAR}`). Hook `block-secrets.sh` barra hardcoded.
- `unitId` sempre da sessão Clerk, nunca de HTTP param (exceto webhook Asaas validado por token).
- TypeScript strict. Nomenclatura inglesa nas entidades.
- Sandbox Asaas primeiro; produção só com confirmação do Rafa.

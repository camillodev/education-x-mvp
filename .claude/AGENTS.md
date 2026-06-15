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
- **Ler `docs/LESSONS.md` SEMPRE** — lições de sessões anteriores (erros já cometidos, padrões, correções do Rafa). Não repetir erro registrado.
- Ler `CLAUDE.md` (constituição — sempre) + **só as `.claude/rules/` que a task toca** (não ler todas). Mapa:
  - toca UI/tela/componente → `frontend.md` (+ skill `edx-datatable` se tabela)
  - toca Prisma/service/API → `backend.md`
  - toca pagamento/cobrança → `asaas.md` + skill `edx-asaas`
  - toca auth/tenant/secret/cripto → `security.md`
  - toca dado pessoal (CPF, aluno, responsável) → `lgpd.md`
- Ler **só o ADR relevante** em `docs/decisions/` (o porquê da decisão que a task encosta), não todos.
- Princípio: carregar o mínimo que a task exige. Contexto irrelevante dilui o sinal.

### 2. Plano (skip se trivial)
- Tarefa grande (≥3 arquivos ou arquitetura nova) → escrever plano em `docs/superpowers/plans/AAAA-MM-DD-<feature>.md` com TDD, paths exatos, código nos pontos críticos.
- Intenção ambígua → perguntar ao Rafa antes. **Até 10 perguntas por vez** (não 1 a 1, que é lento). **Linguagem direta e objetiva — Rafa tem AuDHD:** sem rodeio, sem jargão, uma decisão clara por pergunta, opções concretas. Agrupar perguntas relacionadas.

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

### 6. Review (todo PR com mudança visível, não só o financeiro)
- **Crítico (dinheiro/tenant/PII/schema/auth/cripto/webhook):** `advisor()` (Opus) + subagent `coda-reviewer` (Opus) antes do PR.
- **Visual / fluxo (qualquer mudança de UI, mesmo não-financeira):** subagent `edx-ui-reviewer` antes de marcar production-ready. Divisão de modelo: **Haiku coleta** (screenshots nos 3 breakpoints 375/768/1440 + console errors + árvore semântica via Playwright); **Sonnet analisa** (acha bugs visuais/UX/a11y e escreve os achados). Só reporta, não edita.
- Princípio: nenhum fluxo vai pra "pronto" sem review visual. Review não é só de dinheiro.

### 7. Ship
- Branch `feature/` | `fix/` | `chore/` — NUNCA commit direto em `main`/`develop`.
- Commit SEM `Co-Authored-By` (histórico 100% do Rafa).
- PR via `gh`. CI roda (typecheck+lint+test+build+e2e).
- **O PR SEMPRE inclui, no corpo:**
  1. **Link do preview deploy da Vercel** (o ambiente onde o Rafa testa).
  2. **Checklist de revisão pro Rafa** — itens concretos do que verificar (fluxo X funciona, valores corretos, responsivo nos 3 breakpoints, estados vazio/erro, etc.), pra ele não esquecer nada de fora. Marcar o que o CI/reviewer já cobriu vs o que precisa de olho humano.
- 1 PR por fluxo (granular onde é crítico: schema/auth em PRs separados).

### 8. Registrar lição (fecha o loop de aprendizado)
- Se a sessão **errou, descobriu um padrão, ou o Rafa corrigiu algo** → adicionar uma entrada em `docs/LESSONS.md` (append, mais recente no topo): data · o que aconteceu · a lição · como aplicar.
- É o que faz cada sessão aprender com a anterior. O Passo 1 lê este arquivo; o Passo 8 alimenta ele.

## Subagents do projeto (só reviewers especializados — não agents-papel)
- `.claude/agents/coda-reviewer.md` (Opus, read-only) — revisor crítico: dinheiro, tenant, PII, camadas, segurança.
- `.claude/agents/edx-ui-reviewer.md` (Sonnet, read-only) — revisor visual/UX/a11y nos 3 breakpoints (Haiku coleta, Sonnet analisa). Todo PR com mudança de UI.

> Cada subagent tem **propósito especializado** (review). NÃO criar agents-papel ("codador", "arquiteto") — modelos se trocam por `/model`, não por arquivo. Ver tabela de papéis no topo.

## Regras inegociáveis (resumo — detalhe em CLAUDE.md + rules/)
- Secrets só via env (`${VAR}`). Hook `block-secrets.sh` barra hardcoded.
- `unitId` sempre da sessão Clerk, nunca de HTTP param (exceto webhook Asaas validado por token).
- TypeScript strict. Nomenclatura inglesa nas entidades.
- Sandbox Asaas primeiro; produção só com confirmação do Rafa.

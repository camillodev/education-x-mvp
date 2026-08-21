# agentic-workflow

@../AGENTS.md

Builder portável para construir SaaS de alta qualidade com agentes Claude. Este repo é a fábrica (config + agents + skills + hooks + specs + lessons), não o produto. As regras cross-tool estão no `AGENTS.md` (importado acima); este arquivo carrega o que é específico do Claude.

## Regras inegociáveis
- Seguir a constitution: `.specify/memory/constitution.md` (prevalece sobre tudo).
- **Task Contract antes de codar** — Objetivo · Scope/Not-Included · DoD-comando.
- **WIP=1** — uma task ativa por vez.
- **"Pronto" = DoD-comando com `exit 0`**, nunca opinião. Tests passing ≠ feature works.
- **PR ≤ 400 linhas, branch sempre** (nunca `main`). Commits sem `Co-Authored-By`.
- **Nunca editar testes** pra passar. Conserta o código, não o gate.
- **Secrets só via env** (Zod no startup), nunca no client, nunca hardcoded.
- **Verificação real antes de "pronto"** — rules-based (lint/typecheck/test) > visual > LLM-judge.

## Loop Linear

**Linear (time EDU) é a única casa de tarefas deste projeto.** Trello e Plane estão congelados — não migrar, não usar, não apagar.

### Status do workflow (human-in-the-loop explícito)

`Backlog` → `Todo` → `In Progress` → `In Review` → `Ready to Merge` → `Production`
(fora da linha principal: `Blocked`, `Canceled`, `Duplicate`)

- **`Backlog`** — ainda não aprovado pra ser implementado. Fonte de conteúdo: `.specs/BACKLOG.md`.
- **`Todo`** — task já definida e priorizada, pronta pra puxar. Agente escolhe daqui, nunca do `Backlog` direto.
- **`In Progress`** — agente codando. WIP=1 (só um issue aqui por vez).
- **`In Review`** — PR aberto, esperando revisão/aprovação humana no GitHub.
- **`Ready to Merge`** — **só o Rafa move pra cá**, depois de aprovar o PR no GitHub. O agente nunca move um issue pra `Ready to Merge` ou `Production` sozinho — é o gate humano do pipeline.
- **`Production`** — merge feito manualmente por humano em `main`.

- Toda tarefa começa por um issue no Linear (time EDU, `teamId e5623300-f420-4627-ab05-1612f7b2f981`), puxado de `Todo` (não de `Backlog`).
- **WIP=1** — só um issue "In Progress" por vez. Se não existe issue pra tarefa, criar antes de codar (em `Backlog` se ainda não priorizado, ou `Todo` se já aprovado).
- Ao terminar com o **DoD-comando** em `exit 0`: abrir o PR e mover o issue pra `In Review` (resolver o ID via `list_issue_statuses`, nunca hardcodar) e comentar o que foi feito + DoD + commit hash. Ver seção "Fechamento (Linear)" em `task-contract` skill.
- **Nunca mover um issue pra `Ready to Merge` ou `Production`** — essas transições são exclusivamente humanas, feitas depois da aprovação/merge real no GitHub.

## Fluxo (sem desvio)
1. Humano fala em linguagem natural → Claude monta o **Task Contract** (pergunta 1-2 coisas pra fechar Scope e DoD).
2. Ativa a task (WIP=1) — grava DoD onde os hooks leem.
3. Executa com disciplina: **startup-anchor** (`git log -5` + smoke) → **investigate-first** (lê antes de afirmar) → **recusa fora do Scope** (vira ticket novo).
4. Reviewer roda o DoD-comando — aprova só se `exit 0` e Scope respeitado. Issue vai pra `In Review`.
5. Humano aprova o PR no GitHub (último gate) → move o issue pra `Ready to Merge` → mergeia manualmente → move pra `Production`.

## Stack alvo
Next.js App Router (RSC, TS strict) · Supabase (RLS) · Tailwind v4 + shadcn/ui · Zod (fonte de tipos) · Vitest (unit) · Playwright (E2E contra `build`, não dev). Server Actions > Route Handlers pra mutations.

## Modelo
Haiku (mecânico) · Sonnet (padrão, 90%) · Opus (crítico: arquitetura nova, decisão irreversível).

## Onde aprender mais
- `lessons/00-INDEX.md` — conhecimento destilado da pesquisa (10 lessons verificadas).
- `.specify/memory/constitution.md` — os princípios completos + gates.

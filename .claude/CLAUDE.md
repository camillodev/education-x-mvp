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

## Fluxo (sem desvio)
1. Humano fala em linguagem natural → Claude monta o **Task Contract** (pergunta 1-2 coisas pra fechar Scope e DoD).
2. Ativa a task (WIP=1) — grava DoD onde os hooks leem.
3. Executa com disciplina: **startup-anchor** (`git log -5` + smoke) → **investigate-first** (lê antes de afirmar) → **recusa fora do Scope** (vira ticket novo).
4. Reviewer roda o DoD-comando — aprova só se `exit 0` e Scope respeitado.
5. Humano aprova o PR no GitHub (último gate).

## Stack alvo
Next.js App Router (RSC, TS strict) · Supabase (RLS) · Tailwind v4 + shadcn/ui · Zod (fonte de tipos) · Vitest (unit) · Playwright (E2E contra `build`, não dev). Server Actions > Route Handlers pra mutations.

## Modelo
Haiku (mecânico) · Sonnet (padrão, 90%) · Opus (crítico: arquitetura nova, decisão irreversível).

## Onde aprender mais
- `lessons/00-INDEX.md` — conhecimento destilado da pesquisa (10 lessons verificadas).
- `.specify/memory/constitution.md` — os princípios completos + gates.

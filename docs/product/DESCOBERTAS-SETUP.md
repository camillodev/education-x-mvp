# Descobertas e Motivações do Setup — Education X
> Versão 1.0 · 13/jun/2026 · De onde veio cada decisão da Fase 0, e quem seguir pra ser um dev + Claude profissional.
> Pesquisa: 4 frentes paralelas (docs oficiais Anthropic · setups reais de campo/Reddit · Clean Architecture/ADRs · especialistas a seguir).

> ⚠️ **CORREÇÃO 14/jun/2026:** a descoberta nº 3 ("reaproveitar > recriar — apontar pras skills globais `ix-*`") foi **revista por portabilidade**. O projeto NÃO reaproveita do `~/.claude` global — tudo é auto-contido no repo (skills `edx-asaas`/`edx-datatable`, pipeline em `.claude/AGENTS.md`). O princípio "não duplicar conteúdo de lib" continua válido (isso o `context7` resolve), mas "reaproveitar do global" foi trocado por "auto-contido no repo" — porque o global não existe na máquina de outro dev.

---

## Por que pesquisei isso

Você trouxe uma hipótese de um anúncio (`.claude/` + `.spec/`) e pediu pra eu **não confiar nela** — descobrir o padrão real de quem mais sabe (Anthropic e devs de referência), não de eco de Reddit. Isso foi a decisão certa: a hipótese estava metade errada, e só a fonte primária revelou o padrão correto.

---

## As descobertas que mudaram o plano

### 1. `.claude/` é canônico — `.spec/` não é
**Achado (Anthropic docs oficiais):** a estrutura `.claude/` versionada (settings, rules, skills, agents, hooks) é exatamente o que a Anthropic recomenda. Mas o "o quê" do produto **não** vai em `.spec/` — vai em **`specs/`** (features) + **`docs/decisions/`** (ADRs). Isso apareceu igual nas 3 fontes independentes.
**Motivação da decisão:** uso o padrão real. `.claude/` = como, `specs/` + `docs/decisions/` = o quê + por quê.
**Fonte:** [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) · [GitHub spec-kit](https://github.com/github/spec-kit)

### 2. CLAUDE.md enxuto vence CLAUDE.md enciclopédico
**Achado (consenso forte de campo):** CLAUDE.md grande **faz o Claude ignorar regras** — dilui o sinal. Limite duro ~40k chars; zona de conforto **<200 linhas**. Está na própria doc da Anthropic.
**Motivação:** o CLAUDE.md do projeto fica em ~150 linhas, referenciando `docs/` e as skills globais em vez de embutir. Isso é o oposto do meu instinto inicial de "setup forte = muito conteúdo".
**Fonte:** [Claude Code anti-patterns](https://www.aicodex.to/articles/claude-code-antipatterns) · [Context Rot](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files)

### 3. Reaproveitar > recriar (anti-overengineering)
**Achado:** máx ~15 skills por projeto; audit trimestral; criar skill só quando o padrão se repete. Times reais relatam arrependimento com setup pesado.
**Motivação:** já temos `ix-code-guidelines` e `ix-asaas` no global. As skills do projeto ficam **finas** — apontam pras globais + só o específico do Education X (Alfabeto, TanStack DataTable, payloads Asaas do produto). Não duplico conteúdo de lib (React/Next) — isso o `context7` busca ao vivo.
**Fonte:** [How to Stop Overengineering — Nathan Onn](https://www.nathanonn.com/how-to-stop-claude-code-from-overengineering-everything/)

### 4. Hooks são enforcement; CLAUDE.md é sugestão
**Achado:** CLAUDE.md é contexto (o Claude pode ignorar). Pra regra que NUNCA pode quebrar (secret hardcoded, commit em main), use **hook** — roda determinístico, não depende do Claude lembrar.
**Motivação:** as proteções críticas (block-secrets, pre-commit, no-commit-main) viram hooks, não linhas no CLAUDE.md. É o que garante a baixa manutenção mesmo quando o Claude constrói à noite.
**Fonte:** [code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide)

### 5. Spec-driven + ADRs é o método de quem constrói com agentes
**Achado:** o padrão dominante (GitHub spec-kit, Amazon Kiro, cursos DeepLearning.ai) é spec → plan → tasks → code, com **ADRs** (Architecture Decision Records) pra registrar cada decisão grande imutável. "Contrato primeiro, código depois" tem nome e formato.
**Motivação:** os 5 ADRs de partida + a descoberta dos contratos Asaas via MCP **antes** de codar são exatamente esse método. Resolve suas pendências (CONFIRMED vs RECEIVED, etc.) na Fase 0, não no meio da implementação.
**Fonte:** [DeepLearning.ai — Spec-Driven Development](https://www.deeplearning.ai/courses/spec-driven-development-with-coding-agents) · [ADR — GitHub](https://github.com/architecture-decision-record/architecture-decision-record)

### 6. PR + preview + revisão assíncrona é capacidade real (não improviso)
**Achado:** o Claude Code já suporta preview visual, PR automática e revisão assíncrona — é o workflow que devs de produção usam (Boris Cherny rodava 20-30 PRs/dia).
**Motivação:** seu "dormir e acordar com PR pra revisar" não é doideira — é o padrão. Por isso o CI + preview deploy é peça crítica da Fase 0.
**Fonte:** [Preview, Review & Merge — Anthropic](https://claude.com/blog/preview-review-and-merge-with-claude-code)

---

## 👥 Quem seguir pra ser um dev + Claude profissional

Selecionados por **fonte primária** (constrói/define) vs **bom divulgador**. ~8 nomes que importam, não 30.

### (A) Anthropic oficial — quem define o padrão

| Pessoa | Quem é | Por que seguir | Onde |
|--------|--------|----------------|------|
| **Boris Cherny** | Criador e Head do Claude Code (ex-Principal Eng Meta, autor *Programming TypeScript*) | Define a estratégia. Mostra workflow real (5 sessões paralelas, 20-30 PRs/dia). **A fonte nº1.** | X [@bcherny](https://x.com/bcherny) · [borischerny.com](https://borischerny.com) |
| **Katelyn Lesse** | Head of Platform Eng (ex-Stripe) | Governa APIs/SDKs/capabilities do Claude Code. "Unhobbled agents", contexto long-running. | X [@katelyn_lesse](https://x.com/katelyn_lesse) |
| **Elie Schoppik** | Head of Technical Education | Ensina o curso oficial "Claude Code" com Andrew Ng. Conhecimento canônico didático. | [Curso DeepLearning.ai](https://learn.deeplearning.ai/courses/claude-code-a-highly-agentic-coding-assistant/) |
| **Angela Jiang** | Head of Product, Claude Platform | Ponte research → devs. Traz capabilities frontier pra mão de quem constrói. | [LinkedIn](https://www.linkedin.com/in/angelajiang/) |

### (B) Devs independentes de referência — quem domina o ofício

| Pessoa | Quem é | Por que seguir | Onde |
|--------|--------|----------------|------|
| **Simon Willison** | Criador do Datasette, hoje pesquisa AI+code full-time | **Fonte primária de padrões agentic engineering.** Distingue "vibe coding" de engenharia de verdade. Leitura obrigatória. | [simonwillison.net](https://simonwillison.net/) · X [@simonw](https://x.com/simonw) |
| **Harper Reed** | Ex-CTO campanha Obama 2012; empresa que gera 80% do código com AI | Prático, resultado. **TDD como contra-alucinação.** Defensive patterns (TDD + lint + hooks) que o Claude precisa. | [harper.blog](https://harper.blog/) |
| **Steve Yegge** | 40+ anos (Amazon, Google); autor "Vibe Coding" | Frameworks: "8 Levels of AI Adoption", orquestração multi-agente (rodava 20-30 Claudes paralelos). | [steveyegge.spicytakes.org](https://steveyegge.spicytakes.org/) |
| **Gergely Orosz** | Editor Pragmatic Engineer (300k+ subs) | Não constrói, mas **documenta com profundidade**. Entrevistou Boris e Yegge. Faz as perguntas certas. | [pragmaticengineer.com](https://newsletter.pragmaticengineer.com/) · X [@GergelyOrosz](https://x.com/GergelyOrosz) |

### Canais oficiais
- [Anthropic Engineering Blog](https://www.anthropic.com/engineering) — postmortems, arquitetura
- [Curso oficial Claude Code (Andrew Ng + Elie)](https://learn.deeplearning.ai/courses/claude-code-a-highly-agentic-coding-assistant/)
- [Code with Claude 2026 — talks](https://claude.com/code-with-claude/)

### Roteiro de estudo sugerido (3 semanas, em paralelo ao Education X)
1. **Sem 1:** [Boris Cherny no Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) + [Simon Willison — agentic patterns](https://simonw.substack.com/p/agentic-engineering-patterns)
2. **Sem 2:** curso DeepLearning.ai (Elie) + [Harper Reed — Basic Claude Code](https://harper.blog/2025/05/08/basic-claude-code/) (TDD/defensive)
3. **Sem 3:** [Steve Yegge — 8 Levels](https://newsletter.pragmaticengineer.com/p/from-ides-to-ai-agents-with-steve)
4. **Contínuo:** seguir @bcherny, @simonw, @katelyn_lesse no X

---

## O fio que conecta tudo

As três ideias que apareceram em TODAS as fontes, e que sustentam a Fase 0:

1. **Clareza vence esperteza** — CLAUDE.md curto, skills simples, specs claros. Não setup elaborado.
2. **Separação de responsabilidades** — CLAUDE.md = regras · skill = workflow · subagent = contexto isolado · hook = enforcement · spec/ADR = o quê e por quê.
3. **Aparar regularmente** — o setup cresce; audit trimestral remove ruído. O risco real é overengineering, não falta de estrutura.

> Tradução pro Education X: setup forte **e** enxuto. Reaproveitar o que já existe (`ix-code-guidelines`, `ix-asaas`), travar contratos antes de codar (ADRs + payloads Asaas), proteger com hooks, revisar por PR. É isso que faz "construir à noite, revisar de manhã" funcionar sem virar pesadelo de manutenção.

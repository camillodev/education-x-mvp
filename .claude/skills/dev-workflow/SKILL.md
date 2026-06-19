---
name: dev-workflow
description: "ROTEADOR obrigatório de desenvolvimento. Ativa SEMPRE que mencionar feature, bug, fix, refactor, implementar, criar, build, deploy, debug, test, review, PR, código. Encadeia as skills do superpowers na ordem certa."
triggers:
  - feature
  - bug
  - fix
  - refactor
  - implementar
  - criar
  - build
  - deploy
  - debug
  - test
  - review
  - PR
  - código
---

# Dev Workflow — Pipeline Obrigatório

Este é o PIPELINE ÚNICO de desenvolvimento. **Não editar código sem passar por ele.** Toda menção a feature, bug, fix, refactor, implementar, criar, build, deploy, debug, test, review ou PR dispara este skill AUTOMATICAMENTE.

## O Pipeline (8 passos)

### 1. Task Contract (OBRIGATÓRIO PRIMEIRO)
Skill: `task-contract`

**VOCÊ DEVE** preencher o Task Contract ANTES de escrever uma linha. 3 campos:
- Objetivo (1-2 linhas claras)
- Scope & Not-Included (bullets: o que entra, o que sai)
- DoD-comando (comando que prova "pronto")

**VOCÊ NUNCA vai** pular isto.

---

### 2. Brainstorming (se design > código)
Skill: `superpowers:brainstorming`

**ATIVA SE:** o problema é ambíguo, precisa validar abordagem ANTES de codar, ou a solução tem múltiplas caminhos.

**OUTPUT:** decisão documentada + sketches/pseudo-código.

**SKIP SE:** tarefa é trivial, escopo blindado no contract, ou solução óbvia.

---

### 3. Plano (se ≥3 arquivos)
Skill: `superpowers:writing-plans`

**ATIVA SE:** mudança toca 3+ arquivos OU é feature que demanda sequência.

**VOCÊ DEVE:**
- Quebrar em sub-tarefas bite-sized (≤15 min cada)
- Listar arquivos impactados
- Validar dependências
- Propor TDD approach

**OUTPUT:** `PLAN-<feature>.md` salvo em `~/agent-workspace/plans/` (durável, não morre no chat).

**SKIP SE:** 1-2 arquivos + mudança linear.

---

### 4. Test-Driven Development (OBRIGATÓRIO)
Skill: `superpowers:test-driven-development`

**VOCÊ DEVE:**
- RED: escrever teste que FALHA
- GREEN: código mínimo que passa
- REFACTOR: limpar sem quebrar

**Nenhum código novo sem teste falhando antes.**

**SKIP SE:** refactor em código legado sem cobertura (negocie com Rafa).

---

### 5. Paralelização (se ≥2 subtarefas independentes)
Skill: `superpowers:dispatching-parallel-agents`

**ATIVA SE:** task tem 2+ subtarefas que não dependem uma da outra.

**PADRÃO:**
- Haikus paralelos: leitura, escrita mecânica, transcrição, refactor isolado
- Sonnet orquestra + análise + integração
- Ganho típico: 6x mais rápido + 10x mais barato em tokens

**EXEMPLO:** implementar 3 endpoints → 3 Haikus em paralelo pra endpoints A/B/C, Sonnet integra.

---

### 6. Execução com Code Review Contínuo

**Arquitetura:**
- **code-architect** (Sonnet) — desenha a solução
- **implementador** (Haiku ou Sonnet) — escreve código
- **code-reviewer** (Sonnet, ≥80 severity) — encontra bugs + simplificação
- **security-auditor** (Sonnet) — auth, billing, secrets

**VOCÊ DEVE:**
- Seguir `~/.claude/skills/ix-dev/STYLE.md` (DRY, 500-line max, TDD)
- Nenhum secret hardcoded (sempre `${VAR}`)
- Linter + formatter antes de commit

---

### 7. Verificação E2E (OBRIGATÓRIO PRÉ-PRONTO)
Skill: `superpowers:verification-before-completion`

**VOCÊ DEVE:**
- Testes passando (via `npm test`)
- TypeCheck passando (`npm run typecheck`)
- Build sem erro (`npm run build`)
- Feature funciona no app real (não só testes)

**NUNCA declare "pronto" sem isto.**

**Prova:** rodar o DoD-comando do Task Contract → exit 0.

---

### 8. Code Review + Finishing Branch (OBRIGATÓRIO PRÉ-MERGE)
Skill: `superpowers:requesting-code-review` + `superpowers:finishing-a-development-branch`

**VOCÊ DEVE:**
- PR ≤400 linhas (quebra em múltiplos PRs se > 400)
- Branch sempre (`feature/` | `fix/` | `chore/` | `report/`)
- NUNCA merge local direto em main
- Mensagem de commit: 50 chars + corpo; NUNCA `Co-Authored-By`

**Code Review:**
- Rodada 1: arquitetura + lógica
- Rodada 2: performance + segurança
- Rodada 3: style + TDD completude

---

## Tabela de Gatilhos

| Você disse | Skill obrigatória | Status |
|---|---|---|
| feature | task-contract → brainstorming (se design ambíguo) → writing-plans (se ≥3 arquivos) → TDD → exec → verification → code-review | 🔒 OBRIGATÓRIA |
| bug | task-contract → TDD (RED = bug reproduction) → exec → verification → code-review | 🔒 OBRIGATÓRIA |
| fix | task-contract → TDD → exec → verification | 🔒 OBRIGATÓRIA |
| refactor | task-contract → brainstorming (se não-óbvio) → TDD (com cobertura existente) → verification | 🔒 OBRIGATÓRIA |
| implementar | task-contract → todo o pipeline | 🔒 OBRIGATÓRIA |
| criar [componente/função/módulo] | task-contract → brainstorming → TDD → exec → verification | 🔒 OBRIGATÓRIA |
| build | task-contract → exec (se build novo) → verification | 🔒 OBRIGATÓRIA |
| deploy | task-contract → verification → PR → merge + notificação #bots | 🔒 OBRIGATÓRIA |
| debug | task-contract → TDD (RED = reprodução bug) → exec (fix) → verification | 🔒 OBRIGATÓRIA |
| test | task-contract (se test framework novo) → TDD → verification | 🔒 OBRIGATÓRIA |
| review [PRs] | code-review (severity nivel) + advisor (se > 1000 linhas ou crítico) | 🔒 OBRIGATÓRIA |
| PR | task-contract → pipeline completo → code-review + finishing-branch | 🔒 OBRIGATÓRIA |
| código | task-contract → dev-workflow obrigatória | 🔒 OBRIGATÓRIA |

---

## Regras Duras (Nenhuma Exceção)

1. **Task Contract primeiro.** Sem ele, não saia do chat.
2. **TDD sempre.** RED→GREEN→REFACTOR. Testes falhando antes do código.
3. **DoD-comando passa.** Exit 0 obrigatório antes de "pronto".
4. **PRs ≤400 linhas.** Nenhuma exceção (quebra em múltiplos).
5. **Nenhum secret hardcoded.** Sempre `${VAR}` ou `env:`.
6. **Branch sempre.** Nunca merge direto em main.
7. **Verification E2E.** Tests passing ≠ feature works.
8. **Code review antes de merge.** NUNCA pule reviewer.

---

## Anti-Padrões (NUNCA FAÇA)

❌ Editar código sem Task Contract
❌ Editar código sem invocar `ix-core` + stack skill primeiro
❌ Pesquisar no main thread quando subagent serve (≥2 arquivos)
❌ Propor config de lib externa sem `context7` query
❌ Declarar feature "pronto" sem `verification-before-completion`
❌ Commit com `Co-Authored-By` Claude
❌ Secret hardcoded (sempre `${VAR}`)
❌ Criar skill nova pra cobrir gap antes de usar as 20+ que já existem
❌ PR > 400 linhas sem quebrar
❌ Tests passing = "pronto" (tests passing ≠ feature works)

---

## Quando Pular (Exceptions)

- **Typo, rename, <20 linhas em arquivo conhecido** → pode pular Task Contract + brainstorming
- **Refactor legado sem cobertura** → negocie TDD com Rafa, talvez coverage-first
- **Tarefa é 100% determinística/óbvia** → brainstorming pode sair, mas pipeline resta

Mas quando em dúvida: **rodei o pipeline completo.**

---

**Lembrete:** Este pipeline é OBRIGATÓRIO. Hook `dev-workflow-gate.sh` em `~/.config/ai-tools/hooks/` reforça isto — se você tentar editar código sem ativar dev-workflow, o hook avisa.


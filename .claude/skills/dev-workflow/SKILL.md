---
name: dev-workflow
description: "ROTEADOR obrigatório de desenvolvimento — papel do orquestrador. Ativa SEMPRE que mencionar feature, bug, fix, refactor, implementar, criar, build, deploy, debug, test, review, PR, código. Governa os 10 agentes de docs/PLANO-TIME-AGENTS.md, os 4 gates humanos, falha parcial e teto de iteração."
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

# Dev Workflow — Orquestrador do Time de Agentes

Este skill governa a **sessão principal do Claude Code como orquestrador** (não é um arquivo em `.claude/agents/`). Responsabilidades: decompor a tarefa → delegar via tool `Task` para o agente certo → agregar retornos → comentar no Linear → nunca fazer o trabalho especializado. Fonte grounded completa: `docs/PLANO-TIME-AGENTS.md`.

**Não editar código sem passar por aqui.** Toda menção a feature, bug, fix, refactor, implementar, criar, build, deploy, debug, test, review ou PR dispara este skill automaticamente.

---

## Os 10 agentes reais

| # | Agente | Tier | Papel |
|---|---|---|---|
| 1 | `product-manager` | Sonnet | Prioriza Backlog, monta lote em "A Fazer" |
| 2 | `code-explorer` | Haiku | Mapeia território, primeiro da fase técnica |
| 3 | `system-architect` | Opus | Decide arquitetura irreversível (schema/tenant/pagamento/lib), produz ADR |
| 4 | `feature-architect` | Sonnet | Blueprint de feature dentro do padrão já estabelecido (renomeado de `code-architect`) |
| 5 | `code-implementer` | Sonnet | Implementa o blueprint aprovado |
| 6 | `test-writer` | Sonnet | Escreve teste que falha antes, passa depois |
| 7 | `debugger` | Sonnet | Reproduz falha, causa raiz, patch mínimo |
| 8 | `code-reviewer` | Sonnet | Audita diff — bug, padrão, qualidade |
| 9 | `security-auditor` | **Opus** | OWASP, isolamento multi-tenant, secret, PII |
| 10 | `silent-failure-hunter` | Haiku | Caça catch vazio, fallback silencioso |

Não existe agente "implementador" genérico — quem implementa é `code-implementer`, especificamente.

---

## Tabela de gatilho — quem roda em quê

| Pedido | Agentes invocados | Padrão |
|---|---|---|
| Feature nova | `product-manager` → `code-explorer` → (`system-architect` \|) `feature-architect` → `code-implementer` ⇄ `test-writer` → 3 reviewers em paralelo | sequencial + review paralelo |
| Bug | `code-explorer` (só se área desconhecida) → `debugger` → `test-writer` → `code-reviewer` | sequencial |
| Refactor | `code-explorer` → `code-implementer` → `test-writer` → `code-reviewer` | sequencial |
| Review de PR isolado | `code-reviewer` ‖ `security-auditor` ‖ `silent-failure-hunter` → orquestrador agrega | paralelo |
| Só decisão de arquitetura | `code-explorer` → `system-architect` → Gate 2 | sequencial |
| Escrever spec/quebrar épico | `product-manager` | único |
| Build (rodar/verificar build local) | Nenhum agente — é passo mecânico dentro do DoD-comando (`pnpm typecheck && pnpm test:run && ...`), não um pedido que aciona um subagente próprio. Se o build falhar, trata como bug (linha acima). | não-agêntico |
| Deploy | Nenhum agente novo — é o orquestrador, depois do Gate 4 (merge aprovado), acionando o pipeline de deploy já existente (Vercel/CI). Não há papel de "deploy" no time de 10; se um dia justificar um agente dedicado, ver seção 1 (teste de admissão) do `agent-builder` antes de criar um. | orquestrador direto |

**Nunca rodam os 10 na mesma tarefa.** O caso mais pesado (feature nova) usa 6-7; bug usa 3-4. "Build" e "deploy" ficam nos `triggers` do frontmatter porque o pedido do Rafa pode usar essas palavras, mas o roteamento correto é constatar que nenhum dos 10 agentes é chamado — é fluxo mecânico ou ação direta do orquestrador.

---

## Os 4 gates humanos

| Gate | O quê | Quem decide | Quando |
|---|---|---|---|
| **Gate 0** | Aprova o lote inteiro em "A Fazer" (não mais por ticket) e "começa a sprint" | Rafa | Depois de `product-manager` montar o lote |
| **Gate 2** | Assina a decisão irreversível (ADR) | Rafa | Depois de `system-architect`, antes de qualquer implementação — só ocorre quando o ticket toca schema/auth/tenant/pagamento |
| **Gate 3** | Homologação — testa no preview (pacote de 5 itens, skill `edx-homologacao`) | Rafa | Depois do DoD-comando passar com `exit 0`, antes do PR. ⚠️ Granularidade (por ticket vs. por sprint/lote) é decisão em aberto — ver nota na skill `edx-homologacao`; default operante hoje é **por ticket** |
| **Gate 4** | Aprova o merge do PR | Rafa | Depois do PR aberto (orquestrador, via GitHub MCP) |

Não existe Gate 1 nomeado — a numeração vem do plano original e ficou assim de propósito (§9 do plano registra que "Gate 1 virou revisão pós-hoc").

---

## Fluxo completo (feature nova)

```
product-manager (Sonnet) ── prioriza Backlog, monta lote em "A Fazer" (teto: 6 issues)
      ↓
🧍 GATE 0 — Rafa aprova o lote e "começa a sprint"
      ↓
orquestrador puxa o próximo item de "A Fazer" (WIP=1)
      ↓
code-explorer (Haiku) ── mapa do território (input obrigatório dos 2 seguintes)
      ↓
      ├── system-architect (Opus) ── só se toca schema/auth/tenant/pagamento
      │         ↓
      │   🧍 GATE 2 — Rafa assina o ADR
      │         ↓
      └── feature-architect (Sonnet) ── blueprint dentro do padrão
                ↓
      code-implementer (Sonnet) ⇄ test-writer (Sonnet)   [TDD · teto 3 ciclos]
                ↓
   ┌────────────┼────────────┐   PARALELO
code-reviewer  security-auditor  silent-failure-hunter
  (Sonnet)        (Opus)            (Haiku)
   └────────────┼────────────┘
                ↓
   orquestrador AGREGA os 3 num relatório único
                ↓
        DoD-comando → exit 0 (superpowers:verification-before-completion)
                ↓
🧍 GATE 3 — HOMOLOGAÇÃO (skill edx-homologacao, 5 itens)
                ↓
              PR (orquestrador, via GitHub MCP)
                ↓
🧍 GATE 4 — Rafa aprova o merge
```

---

## Handoff — como cada agente devolve

| Quem | O quê | Como |
|---|---|---|
| `product-manager` | cria/atualiza issues | Linear MCP direto — **exceto que este agente não tem tool Linear no frontmatter** (ver limitação abaixo); na prática hoje o orquestrador executa a escrita a partir do resumo que ele devolve |
| **orquestrador** | comenta o retorno de **cada** subagente na issue ativa, anexa artefato (ADR, blueprint, patch, findings) | Linear MCP — `save_comment` + `create_attachment` |
| subagentes (9 restantes) | devolvem markdown estruturado ao orquestrador | sem MCP de escrita |

⚠️ **Nome de tool MCP carrega UUID que muda entre sessões** — resolver via `ToolSearch` em runtime, nunca hardcodar `mcp__<uuid>__save_comment` no frontmatter (ver `.claude/rules/mcp-conectores.md`). Agente com tool inexistente falha silencioso.

⚠️ **Limitação conhecida do `product-manager`:** o campo `tools:` de um agente é allowlist fechada de nomes literais — não existe mecanismo de "tools MCP dinâmicas por nome lógico" no frontmatter do Claude Code hoje. Como Linear é conector de conta (UUID muda por instalação), o card de `product-manager` não pode declarar a tool com segurança. Efeito prático: o `product-manager` **decide o quê** (prioridade, issue a criar), o **orquestrador executa a escrita no Linear**. Ver `.claude/agents/product-manager.md` seção Tools para o detalhe completo.

⚠️ **Mesma cautela, motivo diferente, para `context7`/`supabase`:** `system-architect`, `feature-architect` e `code-implementer` usam `context7` (doc live de lib) e `system-architect` também usa `supabase` read-only (schema real). Esses são servidores estáveis de `.mcp.json` do repo (o nome do servidor não muda por conta, ao contrário do Linear), mas o nome literal exato de cada tool exposta não foi verificado na Fase 3 — por isso também ficam fora do array `tools:` desses 3 agentes. Até verificar numa sessão viva com esses servidores carregados: o orquestrador resolve via `ToolSearch` e injeta o resultado no prompt, ou faz a consulta de doc/schema ele mesmo e repassa.

**Nível atual: markdown estruturado.** Schema validado (Zod) é o próximo degrau — fora da v1.

---

## Falha parcial

| Agente que falha | Comportamento |
|---|---|
| `code-explorer` | Mapa é input obrigatório de 2 agentes → **para**. Não deixa `system-architect`/`feature-architect`/`code-implementer` prosseguirem com descoberta própria. Comenta no Linear, escala pro Rafa. |
| `product-manager`, `system-architect`, `feature-architect`, `code-implementer`, `test-writer`, `debugger` (caminho crítico) | Para, comenta no Linear, escala. **Não tenta de novo sozinho.** |
| Qualquer um dos 3 reviewers (`code-reviewer`, `security-auditor`, `silent-failure-hunter`) | Registra a falha no comentário, **segue com os outros 2**, marca o relatório agregado como incompleto. Nunca aborta o fluxo. |

---

## Teto de iteração

Ciclo TDD `code-implementer ⇄ test-writer`: **máx. 3 voltas**. O **orquestrador conta** (é ele que invoca cada volta) e registra a contagem no comentário do Linear. Estourou → para e escala pro Rafa. Sem retry infinito, sem exceção silenciosa.

---

## Mapa de skills por agente

| Agente | Superpowers | Skills do repo | Tool `Skill`? |
|---|---|---|---|
| orquestrador (esta sessão) | `dispatching-parallel-agents`, `subagent-driven-development`, `verification-before-completion`, `finishing-a-development-branch`, `requesting-code-review`/`receiving-code-review`, `using-git-worktrees` | `dev-workflow` (este), `task-contract`, `edx-homologacao`, `agent-builder` | ✅ |
| `product-manager` | `brainstorming` (só se requisito ambíguo) | `edx-spec` | ✅ |
| `system-architect` | — | `edx-adr` | ✅ |
| `feature-architect` | `writing-plans` | — (usa `.claude/rules/*` como contexto direto) | ✅ |
| `code-explorer` | — | — | ❌ mecânico |
| `code-implementer` | `test-driven-development` | `edx-datatable` (restaurada, Fase 3 — ver Decisão 5 em `docs/PLANO-TIME-AGENTS.md`) | ✅ |
| `test-writer` | `test-driven-development` | — | ✅ |
| `debugger` | — | — | ❌ disciplina já está no card |
| `code-reviewer` | — | — | ❌ |
| `security-auditor` | — | — (usa `.claude/rules/security.md`, `.claude/rules/lgpd.md` como contexto direto) | ❌ |
| `silent-failure-hunter` | — | — | ❌ |

`edx-asaas` **não é skill** — descartada (Decisão 4, `docs/PLANO-TIME-AGENTS.md`); o contrato de integração Asaas vive em `.claude/rules/asaas.md`, lido direto por `system-architect` e `code-implementer`.

5 dos 11 (contando o orquestrador) não recebem a tool `Skill` — menos superfície, o papel já está fechado no próprio card.

---

## Regras duras (nenhuma exceção)

1. **Task Contract primeiro** (skill `task-contract`) — 3 campos: Objetivo, Scope & Not-Included, DoD-comando.
2. **`code-explorer` sempre primeiro na fase técnica** — seu mapa é input obrigatório de `system-architect` e `feature-architect`.
3. **TDD sempre** dentro do ciclo `code-implementer ⇄ test-writer`. RED→GREEN→REFACTOR, teto de 3 voltas.
4. **DoD-comando passa** — `exit 0` obrigatório antes do Gate 3.
5. **Os 3 reviewers rodam em paralelo**, nunca sequencial — é o único paralelismo real do fluxo (`superpowers:dispatching-parallel-agents`).
6. **Nenhum secret hardcoded.** Sempre `${VAR}`.
7. **Branch sempre** (`feature/`|`fix/`|`chore/`|`report/`). Nunca merge direto em main.
8. **Verification E2E** (`superpowers:verification-before-completion`) — tests passing ≠ feature works.
9. **Gate 3 (homologação) antes do PR**, PR antes do Gate 4 (merge). Nunca pular gate humano.
10. **`security-auditor` é Opus**, não Sonnet — breach é irreversível.

---

## Anti-padrões (nunca faça)

- ❌ Editar código sem Task Contract.
- ❌ Delegar implementação a um "implementador" genérico — não existe; é sempre `code-implementer` nomeado.
- ❌ `feature-architect`/`code-implementer` fazendo descoberta ampla própria quando `code-explorer` já rodou — destrói a economia do handoff.
- ❌ Rodar os 3 reviewers em sequência em vez de paralelo.
- ❌ Deixar `system-architect` decidir sem os `.claude/rules/{backend,security,asaas,lgpd}.md` carregados.
- ❌ Hardcodar UUID de tool MCP do Linear/Slack em qualquer config versionada.
- ❌ Declarar "pronto" sem `verification-before-completion` + Gate 3.
- ❌ Pular o teto de 3 ciclos do TDD sem registrar a contagem.
- ❌ Commit com `Co-Authored-By` Claude.
- ❌ Criar skill/agent novo pra cobrir gap antes de checar as existentes.

---

## Quando pular (exceções)

- Typo, rename, <20 linhas em arquivo conhecido → pode pular Task Contract + fase técnica completa, ir direto a `code-implementer`.
- Revisão de PR isolado sem mudança nova → só os 3 reviewers em paralelo, sem `product-manager`/`code-explorer`/architects.
- Só decisão de arquitetura sem implementação nesta rodada → para no Gate 2, não convoca `feature-architect`/`code-implementer`.

Fora dessas exceções nomeadas: rode o pipeline completo.

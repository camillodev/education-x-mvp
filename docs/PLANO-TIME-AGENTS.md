# Plano de Implementação — Time de Agentes (Education X)

> Desenhado e auditado com a skill `agent-builder` (síntese do curso "AI Engineering with Claude").
> Data: 17/08/2026 · Revisão 2 (auditoria própria — 8 erros corrigidos, ver §9) · Status: **Fases 0-4 implementadas — ver nota abaixo (18/08/2026), que supersede "aprovado, não implementado".**

> **Status de implementação (18/08/2026): Fases 0-4 implementadas.** Os 10 agent cards existem em `.claude/agents/` (espelho global `~/.claude/agents/`), `AGENTS.md` e `CLAUDE.md` corrigidos (sem os 7 fantasmas / `coda-reviewer` / paths mortos), `dev-workflow` reescrito com os 10 agentes + tabela de gatilho + 4 gates + falha parcial + teto de 3 ciclos, e `e2e-quality-gate.sh` estendido pra bloquear o Stop sem confirmação do Gate 3 (marker `.claude/.gate3-confirmed`). Dry-run real ponta a ponta rodado via Task com agentes reais: `code-explorer` (mapeou a feature "escolas") → `feature-architect` (blueprint pra campo `website` em `Unit`) → `silent-failure-hunter` (achou 2 fallbacks silenciosos reais em `onboarding.service.ts`, linhas 165-172 e 327-328). Pendências conscientes que seguem em aberto (não bloqueiam o "implementado"): granularidade do Gate 3 (por ticket vs. lote, §5), item 19 da Fase 4 (medir se `code-explorer` se paga / promover os 6 genéricos pra global) e a dívida consciente do §10.

---

## 1. Arquitetura

**Padrão:** hub-and-spoke híbrido — orquestrador central, subagentes escopados, review em paralelo, resto sequencial.

```
product-manager (Sonnet) ── prioriza Backlog, monta lote em "A Fazer" (teto: 1 sprint)
      ↓
🧍 GATE 0 — Rafa aprova o lote inteiro (não mais por ticket) e "começa a sprint"
      ↓
orquestrador puxa o próximo item de "A Fazer" (WIP=1, sem perguntar de novo por ticket)
      ↓
code-explorer (Haiku) ── mapa do território
      ↓                    ⇩ mapa é INPUT OBRIGATÓRIO dos dois abaixo
      ├── system-architect (Opus) ── só se toca schema/auth/tenant/pagamento
      │         ↓
      │   🧍 GATE 2 — Rafa assina a decisão irreversível (ADR)
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
        DoD-comando → exit 0
                ↓
🧍 GATE 3 — HOMOLOGAÇÃO: Rafa testa no preview (pacote definido em §5)
                ↓
              PR (orquestrador, via GitHub MCP)
                ↓
🧍 GATE 4 — Rafa aprova o merge
```

**Orquestrador** = sessão principal do Claude Code, governada pelo skill `dev-workflow`. Não é arquivo em `.claude/agents/`.
Responsabilidades: decompor → delegar via tool `Task` → agregar → comentar no Linear → nunca fazer o trabalho especializado.

### Tabela de gatilho — quem roda em quê

| Pedido | Agentes invocados | Padrão |
|---|---|---|
| Feature nova | product-manager → code-explorer → (system-architect \|) feature-architect → code-implementer ⇄ test-writer → 3 reviewers | sequencial + review paralelo |
| Bug | code-explorer (só se área desconhecida) → debugger → test-writer → code-reviewer | sequencial |
| Refactor | code-explorer → code-implementer → test-writer → code-reviewer | sequencial |
| Review de PR isolado | code-reviewer ‖ security-auditor ‖ silent-failure-hunter → agrega | paralelo |
| Só decisão de arquitetura | code-explorer → system-architect → Gate 2 | sequencial |
| Escrever spec/quebrar épico | product-manager | único |

**Nunca rodam os 10 na mesma tarefa.** O caso mais pesado (feature nova) usa 6-7; bug usa 3-4.

---

## 2. Localização — todos globais, contexto em duas camadas (revisto 17/08)

**Decisão revista:** os 10 vão pra `~/.claude/agents/` (global), não pro repo. O campo 3 da skill (contexto = paths exatos, nunca genérico) não proíbe global — só exige que o path continue exato mesmo fora de um repo específico. Solução: todo agent lê contexto em duas camadas:

| Camada | O que é | Exemplo |
|---|---|---|
| **Relativa ao cwd** | Paths dentro do repo onde o Claude Code está rodando — resolvem sozinhos em qualquer projeto que siga a mesma convenção de pastas | `docs/product/ROADMAP.md`, `.specify/memory/constitution.md` |
| **Fixa (absoluta)** | 1 destino sempre igual, fora do repo — hoje só o second-brain | `/Users/rafae/Documents/Claude/second-brain/profissional/wiki/hot.md` |

| Só cwd-relativo (100% genérico) | cwd-relativo + fixo second-brain (contexto de negócio) |
|---|---|
| code-explorer, silent-failure-hunter, debugger, test-writer, code-reviewer, security-auditor | product-manager, system-architect, feature-architect, code-implementer |

**Por quê:** o próprio `.claude/CLAUDE.md` do education-x-mvp já se descreve como "builder portável" — a intenção de reuso sempre existiu, só não estava em `~/.claude/`. E as skills globais (`ix-financial-ops`, `ix-weekly-plan`) já cruzam repo + second-brain do mesmo jeito — os agents ficam consistentes com o resto do setup, em vez de um padrão à parte.

**Dívida consciente:** hoje só existe 1 projeto ativo (education-x-mvp), então o risco de colisão é zero. Se surgir um 2º SaaS, os 4 agents "cwd + second-brain" competem pelo mesmo nome global apontando pra contextos diferentes — resolver quando aparecer, não antes.

⚠️ **Limite de sessão:** esta sessão Cowork não tem acesso de escrita a `~/.claude/agents/` (só aos 3 diretórios conectados). Os arquivos são escritos em `education-x-mvp/.claude/agents/` e cada um vem com o comando `mv` pra você rodar no terminal real e promover a global.

---

## 3. Os 10 agent cards (7 campos cada)

### 🆕 product-manager — Sonnet *(revisto 17/08 — grounded nos status reais do Linear)*

Status confirmados no time **EDU** via `list_issue_statuses` (não assumidos): `Backlog` (backlog) · `Ideação`, `Arquitetura`, `Design`, **`A Fazer`** (unstarted) · `Spec`, `Codificação`, `Revisão`, `Blocked` (started) · `Deploy` (completed) · `Duplicate`, `Canceled`. **"A Fazer" é o "Todo" que o Rafa descreveu** — nome já existe, não precisa criar status novo. `list_cycles` retornou vazio: **o time não usa Cycles do Linear** — "sprint" aqui é informal (lote com teto de itens em "A Fazer"), não uma feature nativa.

| | |
|---|---|
| **Escopo** | Prioriza issues em `Backlog` e mantém `A Fazer` com um lote fixo pré-aprovado (a "sprint" corrente), pronto pros outros agents puxarem em ordem; cria issue nova em `Backlog` quando um item do roadmap ainda não tem ticket. |
| **Nunca faz** | Não move issue pra status `started` (`Spec`, `Codificação`, `Revisão`, `Blocked`) — isso é o orquestrador puxando de `A Fazer` quando o trabalho começa de verdade · não decide arquitetura nem escreve spec técnica de implementação · não excede o teto do lote em `A Fazer` sem Rafa pedir explicitamente · não inicia a sprint sozinho (monta e para — "começar" é ação do Rafa) · não tira/rebaixa item de `A Fazer` sem comentar o porquê. |
| **Contexto** | cwd-relativo: `docs/product/ROADMAP.md`, `docs/product/PLANO-TECNICO.md`, `specs/epicos/README.md` (ignora `docs/_archive/` e `WIP-*`). Fixo: `/Users/rafae/Documents/Claude/second-brain/profissional/wiki/hot.md` + `plans/education-hub-*.md` (pricing/ICP/GTM — contexto de negócio que não vive no repo). Linear: status `Backlog` e `A Fazer` do time do projeto atual. |
| **Tools** | `Read, Grep, Glob, LS, Skill` + Linear (`list_issues`, `list_issue_statuses`, `get_issue`, `save_issue`, `save_comment`, `list_comments`) — leitura de docs, leitura+escrita no Linear, zero código. **`Skill` estava faltando na v1 do card** — §6 já dizia que product-manager usa `edx-spec` + `brainstorming`, mas sem a tool ele não consegue invocar nenhuma das duas. Corrigido aqui e no arquivo. |
| **Tier** | Sonnet — priorizar exige julgamento (pesar roadmap × dependência × pricing/ICP), mas é reversível: reordenar backlog não trava nada por meses. |
| **Saída** | Por issue promovido `Backlog`→`A Fazer`: comment com a razão (driver do roadmap + dependência). Ao terminar: resumo markdown — lista ordenada + link de cada issue promovido, teto usado, quantos restam em `Backlog` não-priorizados — pro Rafa aprovar antes de "começar a sprint". |
| **Coordenação** | Disparado manualmente ("monta a sprint", "prioriza backlog", "próxima do roadmap") — não é automático/contínuo, porque a prioridade muda a cada rodada (se fosse sempre igual, seria hook, não agent). |
| ⚠️ **Teto do lote** | Default: **6 issues em `A Fazer`**. Verifica quanto já tem antes de adicionar — só completa até o teto, nunca empilha em cima de sprint não-finalizada. Ajustável por pedido do Rafa numa rodada específica (não precisa reconfigurar o agent pra isso). |

### 🆕 system-architect — Opus
| | |
|---|---|
| **Escopo** | Decide arquitetura fundacional irreversível: schema Prisma, isolamento de tenant, contrato de integração de pagamento, escolha estrutural de lib. |
| **Nunca faz** | Não desenha feature dentro de padrão existente (delega a `feature-architect`) · não edita código nem migration · não implementa a decisão · nunca conclui sem passar pelo Gate 2. |
| **Contexto** | **Mapa do `code-explorer` (obrigatório)** · `prisma/schema.prisma` · `.specify/memory/constitution.md` · `docs/decisions/` · `docs/api-contracts/` · `.claude/rules/{backend,security,asaas,lgpd}.md` — ⚠️ **pré-requisito: esses `rules/` precisam ser restaurados na Fase 1; sem eles o agente decide sem as regras de LGPD/Asaas e não avisa.** |
| **Tools** | `Read, Grep, Glob, LS` + **context7** (doc live de lib — exigência do CLAUDE.md) + **supabase (read-only)** (schema real do banco; `schema.prisma` pode estar dessincronizado) |
| **Tier** | **Opus** — decisão que trava o produto por meses. Custo de erro assimétrico. |
| **Saída** | ADR no formato de `docs/decisions/`: contexto · opções consideradas · decisão · consequências · **o que fica irreversível**. |
| **Coordenação** | Raro. Sequencial, depois do explorer, antes de qualquer implementação. Gatilho: ticket toca schema/auth/tenant/pagamento. |

### ♻️ feature-architect — Sonnet *(renomeia `code-architect`)*
| | |
|---|---|
| **Escopo** | Desenha blueprint executável de uma feature dentro do padrão já estabelecido no repo. |
| **Nunca faz** | Não inventa padrão novo · não decide schema/auth/tenant (escala pro `system-architect`) · não edita código · não devolve menu de opções ("pode ser A ou B") · não faz descoberta ampla do codebase (usa o mapa). |
| **Contexto** | **Mapa do `code-explorer` (obrigatório)** · `docs/product/SYSTEM-DESIGN.md` · `specs/prototipo/design-handoff/` (o HTML standalone manda, não os `.jsx`) · `.claude/rules/{frontend,backend}.md`. Aprofunda só no que o mapa apontou. |
| **Tools** | `Read, Grep, Glob, LS` + **context7** (só se o blueprint toca config de lib) |
| **Tier** | Sonnet — decisão reversível, vira PR normal. |
| **Saída** | Blueprint: arquivos criar/modificar/deletar · data flow · fases + dependências · quais camadas toca. |
| **Coordenação** | Sequencial, depois do `code-explorer`. |

### ✅ code-explorer — Haiku *(corrigir tools)*
| | |
|---|---|
| **Escopo** | Mapeia o território do codebase relevante ao ticket e devolve sumário destilado. |
| **Nunca faz** | Não edita · não propõe mudança · não opina sobre arquitetura · nunca devolve listagem crua de arquivos · nunca excede 500 linhas de retorno. |
| **Contexto** | `src/`, `prisma/`, `tests/` — escopado pelo ticket, não o repo inteiro. |
| **Tools** | `Read, Grep, Glob, LS` — ⚠️ **remover `Bash`** do arquivo atual (privilégio além do papel; `silent-failure-hunter`, mesmo perfil, já não tem). |
| **Tier** | Haiku — mapear estrutura é o caso canônico do tier leve. |
| **Saída** | Mapa ≤500 linhas: camadas · execution paths · dependências · **código existente reaproveitável** (constitution: reuso > recriação). |
| **Coordenação** | Sequencial, **primeiro da fase técnica**. Justificativa econômica: 1 varredura ampla barata substitui 2 varreduras amplas caras (architect + implementer redescobririam o mesmo em Sonnet). |

### 🆕 code-implementer — Sonnet
| | |
|---|---|
| **Escopo** | Implementa o blueprint aprovado respeitando as regras de camada e tipo do repo. |
| **Nunca faz** | Não decide arquitetura (segue blueprint) · **não escreve nem edita arquivo de teste** (é `test-writer`; hook `no-edit-tests` reforça) · não revisa o próprio código · não commita · não cria arquivo >500 linhas. |
| **Contexto** | Blueprint do architect · **mapa do `code-explorer` (obrigatório)** · `.claude/rules/{frontend,backend}.md` · `AGENTS.md` · `.specify/memory/constitution.md`. |
| **Tools** | `Read, Write, Edit, Bash, Grep, Glob` + **context7** — Bash pra `pnpm test:run` / `typecheck` durante o ciclo TDD. |
| **Tier** | **Sonnet** — precisa segurar em paralelo: TS strict sem `any` · camadas Component→Hook→Store→Service→API · centavos Int nunca Float · `unitId` só da sessão Clerk · ≤500 linhas · checar reuso antes de criar. Isso é reasoning, não transcrição. **Exceção Haiku:** batch de N peças idênticas com blueprint fechado (ex: 3 endpoints iguais) — invocar explicitamente, não por padrão. |
| **Saída** | Diff · arquivos tocados · quais regras de camada aplicou · resultado do último `test:run`/`typecheck`. |
| **Coordenação** | Sequencial, em ciclo TDD com `test-writer` (teto 3 — ver §4). |

### ✅ test-writer — Sonnet
| | |
|---|---|
| **Escopo** | Escreve teste que falha antes da mudança e passa depois, pros módulos tocados. |
| **Nunca faz** | Não implementa feature · não altera código de produção pra fazer teste passar · não testa a mesma coisa de 2 formas · não deixa teste dependente de timing/rede · não testa código que não mudou. |
| **Contexto** | Diff do `code-implementer` · `tests/` (convenção existente) · `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`. |
| **Tools** | `Read, Write, Edit, Bash, Glob, Grep` — escreve `.spec.ts` e roda via Bash. **Sem Playwright MCP** (aquilo é browser interativo, não autoria de teste). |
| **Tier** | Sonnet — decidir o que é edge case relevante é reasoning. |
| **Saída** | Arquivo(s) de teste + evidência RED (falhou antes) e GREEN (passa depois). |
| **Coordenação** | Sequencial, alterna com `code-implementer`. **Independente dele por design** — quem escreve o código não vê os casos que quebram. |

### ✅ debugger — Sonnet
| | |
|---|---|
| **Escopo** | Reproduz a falha reportada, encontra causa raiz, aplica patch mínimo. |
| **Nunca faz** | Não implementa feature nova · não refatora o código ao redor · não assume a causa (prova com teste) · não declara resolvido sem teste verde. |
| **Contexto** | Descrição do bug · stack trace/log · `src/` da área afetada · testes existentes relacionados. |
| **Tools** | `Read, Edit, Bash, Grep, Glob` + **supabase (read-only)** (`query_logs` — erro real de produção) + **playwright MCP** (reproduzir no browser; reprodução é o passo 1 do papel). |
| **Tier** | Sonnet — diagnóstico é reasoning; o patch é cirúrgico e reversível. |
| **Saída** | 1) reprodução confirmada (comando + resultado) 2) causa raiz 3) patch mínimo 4) teste verde. |
| **Coordenação** | Sequencial. Gatilho: "bug", "está quebrado", stack trace colado. **Independente do implementador** — autor do bug não vê o óbvio. |

### ✅ code-reviewer — Sonnet
| | |
|---|---|
| **Escopo** | Audita o diff em busca de bug, violação de padrão e risco de qualidade, reportando só achados de alta confiança. |
| **Nunca faz** | Não edita nada · não reporta achado com confiança <80 (mata false-positive) · não revisa código que ele mesmo escreveu · não repete o que `security-auditor`/`silent-failure-hunter` cobrem. |
| **Contexto** | Diff do PR/branch · `.specify/memory/constitution.md` · `.claude/rules/*` · `AGENTS.md`. |
| **Tools** | `Read, Grep, Glob, LS` — read-only. |
| **Tier** | Sonnet — julgamento sobre qualidade; achado errado é descartável (reversível). |
| **Saída** | Lista ordenada por confiança decrescente: `arquivo:linha` · problema · fix proposto · confiança 0-100. |
| **Coordenação** | **Paralelo** com os outros 2 reviewers. Orquestrador agrega. |

### ✅ security-auditor — Opus *(corrigir doc)*
| | |
|---|---|
| **Escopo** | Encontra vulnerabilidade OWASP, falha de isolamento multi-tenant, secret exposto e vazamento de PII antes de produção. |
| **Nunca faz** | Não edita código · não aprova/reprova o PR (reporta, Rafa decide) · não tenta payload destrutivo contra banco real. |
| **Contexto** | Diff · `src/app/api/`, `src/lib/`, `prisma/schema.prisma` · `.claude/rules/{security,lgpd}.md` · `.specify/memory/constitution.md` (princípios 6, 7, 13, 14). |
| **Tools** | `Read, Grep, Glob, LS` + **supabase (read-only)** — checar RLS contra o banco real. |
| **Tier** | **Opus** — breach é irreversível. ⚠️ **`dev-workflow` hoje diz "Sonnet"; o arquivo diz `opus`. Corrigir a doc, não o agente.** |
| **Saída** | `arquivo:linha` · vulnerabilidade · severidade (CVSS) · remediação. |
| **Coordenação** | **Paralelo** com os outros 2 reviewers. Invocado sempre que o diff toca auth, pagamento, API, schema ou PII. |
| ⚠️ **Limite conhecido** | Supabase MCP é `read_only=true` — "testar RLS com múltiplos `user_id`" (constitution, princípio 6) exige tentativa de **escrita** como usuários diferentes, o que o MCP não permite. Decisão pendente: verificação estática + suíte de teste RLS local via Bash, ou aceitar cobertura parcial. Não deixar implícito. |

### ✅ silent-failure-hunter — Haiku *(melhor escopado dos atuais)*
| | |
|---|---|
| **Escopo** | Caça código que falha sem avisar: catch vazio, fallback silencioso, erro suprimido. |
| **Nunca faz** | Não edita · não analisa se o código funciona (só *como* ele falha) · não sugere refactor. |
| **Contexto** | Diff · `src/` da área tocada. |
| **Tools** | `Read, Grep, Glob, LS` — já sem `Bash`, manter. |
| **Tier** | Haiku — é caça-padrão mecânica. **Separar do `code-reviewer` economiza**: essa passada não paga preço de Sonnet. |
| **Saída** | `arquivo:linha` · padrão encontrado · risco (o que o usuário não vê quando isso falha) · 5 linhas de contexto. |
| **Coordenação** | **Paralelo** com os outros 2 reviewers. |

---

## 4. Handoff, falha parcial e teto de iteração

### Handoff
| Quem | O quê | Como |
|---|---|---|
| **product-manager** | cria/atualiza issues | Linear MCP direto (é o papel dele) |
| **orquestrador** | comenta o retorno de **cada** subagente na issue ativa, anexa artefato (ADR, blueprint, patch, findings) | Linear MCP — `save_comment` + `create_attachment` |
| **subagentes (9)** | devolvem markdown estruturado ao orquestrador | sem MCP de escrita |

⚠️ **Nome de tool MCP carrega UUID que muda entre sessões** — resolver via ToolSearch em runtime, **nunca hardcodar** `mcp__<uuid>__save_comment` no frontmatter. Agente com tool inexistente falha silencioso.

**Nível atual: markdown estruturado.** Schema validado (Zod) é o próximo degrau — fora da v1, registrado em §8.

### Falha parcial
| Agente que falha | Comportamento |
|---|---|
| **code-explorer** | Mapa é input obrigatório de 2 agentes → **para**. Não deixa architect/implementer prosseguirem com descoberta própria (destruiria a economia e o contrato). Comenta no Linear, escala pro Rafa. |
| **product-manager, architects, implementer, test-writer, debugger** (caminho crítico) | Para, comenta no Linear, escala. **Não tenta de novo sozinho.** |
| **qualquer um dos 3 reviewers** | Registra a falha no comentário, **segue com os outros 2**, marca o relatório agregado como incompleto. Nunca aborta o fluxo. |

### Teto de iteração
Ciclo TDD `code-implementer ⇄ test-writer`: **máx. 3 voltas**. O **orquestrador** conta (é ele que invoca) e registra a contagem no comentário do Linear. Estourou → para e escala pro Rafa. Sem retry infinito.

---

## 5. Pacote de homologação (Gate 3)

⚠️ **Aberto:** Rafa disse "eu testo no final da sprint" — sugere Gate 3 em lote (1x por sprint), não por ticket como estava desenhado até aqui. Não resolvido nesta revisão pra não decidir por conta própria uma mudança que afeta os 4 gates inteiros; decidir junto na Fase 3 (reescrita do `dev-workflow`). Até lá, o pacote abaixo continua valendo por ticket.

Produzido pelo **orquestrador**, não é agente (cabe como passo — regra "quando NÃO criar agent"). Conteúdo obrigatório, pra não virar handoff vago:

1. **O que mudou** — 3-5 bullets em linguagem de produto, não de código.
2. **Como testar** — passos numerados no preview (URL do Vercel MCP), com dado de exemplo.
3. **O que olhar de perto** — onde o risco está concentrado, vindo do relatório agregado dos reviewers.
4. **O que ficou fora** — Not-Included do Task Contract, pra não te confundir com "faltou".
5. **Evidência** — saída do DoD-comando com `exit 0`.

Se doer manter isso manual, promove a agente depois (Haiku — é síntese mecânica sobre material já produzido).

---

## 6. Skills

### Decisão de design: como um subagente acessa skill

Duas opções — **subagente recebe a tool `Skill`** e invoca sozinho, ou **orquestrador carrega e injeta no prompt**.

**Escolha: `Skill` na tool list de quem precisa.** Motivo: mantém o contexto isolado (a disciplina de TDD carregada dentro do `test-writer` não polui o orquestrador) e respeita "o único canal pai→subagente é a string de prompt" sem inflar essa string. Exceção: quando a orientação é curta e específica do ticket, o orquestrador injeta direto.

### Skills existentes

| Skill | Quem usa | Ação |
|---|---|---|
| `agent-builder` | Rafa + orquestrador | ✅ pronta (conta) — criar/auditar qualquer agent |
| `task-contract` | orquestrador | ✅ mantém — ritual de escopo antes de codar |
| `dev-workflow` | orquestrador | 🔧 **reescrever como orquestrador**: (a) assumir o papel · (b) registrar os 10 agents · (c) tabela de gatilho (§1) · (d) os 4 gates (Gate 0 agora aprova o lote/sprint inteiro, não ticket a ticket) · (e) comentário Linear · (f) falha parcial · (g) teto de 3 ciclos · (h) `security-auditor` = **Opus** · (i) remover `implementador` fantasma · (j) chamar `edx-homologacao` |

### Superpowers — quem usa o quê

Nomes conforme já referenciados no `dev-workflow` atual e no `hot.md`:

| Superpower skill | Consumidor | Pra quê |
|---|---|---|
| `dispatching-parallel-agents` | **orquestrador** | disparar os 3 reviewers em paralelo (o único paralelismo real do fluxo) |
| `subagent-driven-development` | **orquestrador** | disciplina de delegação/handoff |
| `using-git-worktrees` | **orquestrador** | isolamento quando houver 2+ frentes (hoje WIP=1, então raro) |
| `verification-before-completion` | **orquestrador** | gate do DoD-comando antes do Gate 3 |
| `finishing-a-development-branch` | **orquestrador** | PR no Gate 4 |
| `requesting-code-review` / `receiving-code-review` | **orquestrador** | é quem pede e quem recebe — **não** os agentes reviewers |
| `test-driven-development` | `code-implementer` + `test-writer` | disciplina RED→GREEN→REFACTOR dentro do ciclo |
| `brainstorming` | `product-manager` | só quando o requisito do roadmap está ambíguo |
| `writing-plans` | `feature-architect` | quebrar blueprint em fases bite-sized |

⚠️ Os superpowers vêm do plugin `superpowers@claude-plugins-official` (já habilitado no `.claude/settings.json`). Se o plugin não estiver disponível numa sessão, os agentes que dependem dele degradam silenciosamente — **verificar na Fase 4**.

### Skills a criar 🆕

| Skill | Consumidor | Por quê (e por que é skill, não agent) |
|---|---|---|
| `edx-spec` | `product-manager` | Formato de spec + critério de aceite deste repo, e como quebrar épico em issue Linear com AC. É ritual/checklist sem contexto isolado → skill. |
| `edx-adr` | `system-architect` | Formato de ADR de `docs/decisions/` + o que conta como "irreversível" neste produto. Garante que 2 ADRs escritos em meses diferentes tenham a mesma forma. |
| `edx-homologacao` | orquestrador | O pacote do Gate 3 (§5). **Reclassificado:** na rev. 1 era "passo do orquestrador"; é checklist puro, então a própria regra do `agent-builder` diz que é skill. |

### Skills a restaurar ⚠️

De `.claude.archived-20260619-135236/`:

| Item | Consumidor | Criticidade |
|---|---|---|
| `rules/frontend.md`, `rules/backend.md` | `feature-architect`, `code-implementer` | 🔴 **bloqueia Fase 2** — estão no contexto declarado desses agentes |
| `rules/security.md`, `rules/lgpd.md` | `security-auditor`, `system-architect` | 🔴 **bloqueia Fase 2** — sem elas o auditor Opus roda sem as regras de PII |
| `rules/asaas.md` | `system-architect`, `code-implementer` | 🔴 contrato de pagamento — erro aqui é dinheiro real |
| skill `edx-asaas` | `code-implementer` | 🟡 padrões de integração; avaliar se ainda bate com a API atual |
| skill `edx-datatable` | `code-implementer` | 🟡 padrão de DataTable/TanStack do repo |

**Nota sobre `rules/` vs skill:** ficam como **arquivos de contexto** (path explícito no card do agente), não como skills. Skill ativa por gatilho — bom pra ritual; regra de camada precisa ser lida sempre por quem toca aquela camada, e path explícito garante isso sem depender de trigger dar match.

### Mapa final — skills por agente

| Agente | Superpowers | Skills do repo | Tool `Skill`? |
|---|---|---|---|
| orquestrador | dispatching-parallel-agents, subagent-driven-development, verification-before-completion, finishing-a-development-branch, requesting/receiving-code-review, using-git-worktrees | dev-workflow, task-contract, edx-homologacao, agent-builder | ✅ |
| product-manager | brainstorming | edx-spec | ✅ |
| system-architect | — | edx-adr | ✅ |
| feature-architect | writing-plans | — (usa `rules/` como contexto) | ✅ |
| code-explorer | — | — | ❌ mecânico |
| code-implementer | test-driven-development | edx-asaas, edx-datatable | ✅ |
| test-writer | test-driven-development | — | ✅ |
| debugger | — | — | ❌ a disciplina está no próprio card |
| code-reviewer | — | — | ❌ |
| security-auditor | — | — (usa `rules/security,lgpd` como contexto) | ❌ |
| silent-failure-hunter | — | — | ❌ |

5 dos 11 (contando orquestrador) não recebem a tool `Skill` — menos superfície, e o papel deles já está fechado no próprio card.

---

## 7. MCP e hooks

### MCP — o que o projeto já tem (`.mcp.json`)
`context7` · `playwright` · `github` · `supabase` (**`read_only=true`**) · `vercel`

| MCP | Quem usa |
|---|---|
| context7 | system-architect, feature-architect, code-implementer |
| supabase (RO) | system-architect, security-auditor, debugger |
| playwright | debugger |
| github | **só orquestrador** (PR no Gate 4) |
| vercel | **só orquestrador** (preview pro Gate 3) |
| **Linear** | product-manager (total) + orquestrador (comentários) |

⚠️ **Lacunas de configuração (corrigido 18/08 — Fase 1):**
1. ~~**Linear não está no `.mcp.json`**~~ — **isso não é uma lacuna a corrigir, é uma limitação real do modelo de conectores claude.ai**: Linear é conector de conta, não servidor de repo, e não existe entrada de `.mcp.json` equivalente pra ele (não há endpoint fixo a declarar — ver `.claude/rules/mcp-conectores.md`). `product-manager` continua dependendo do conector estar instalado na conta que roda a sessão; hooks/agentes que chamam tools do Linear devem resolver o nome real via `ToolSearch` (query textual, ex. `"linear save_issue"`), nunca hardcodar o UUID da instalação — ver correção do hook `linear-mark-ticket`.
2. **Slack** — mesma limitação: também é conector de conta, não entra no `.mcp.json`. `ix-product-process` e o `hot.md` falam de journal automático em `#bots`; decisão sobre manter/tirar do fluxo continua em aberto, mas "adicionar ao `.mcp.json`" não é uma opção técnica.

### Hooks
**Existentes (13) — manter:** `dangerous-command-blocker`, `secret-scanner`, `critical-file-protection`, `lint-gate-before-commit`, `format-on-save`, `typecheck-on-edit`, `test-runner-on-change`, `linear-mark-ticket`, `skill-activation`, `linear-ticket-guard`, `e2e-quality-gate`, `dependency-audit`, `linear-active-ticket`.

**Novo justificado (1):**
- 🔧 **estender `e2e-quality-gate.sh` (Stop)** — bloquear encerramento sem confirmação do **Gate 3**. Justificativa real: a constitution já diz *"tests passing ≠ feature works"* e o gate humano não existia no fluxo.

**Verificar se existe (não confirmado):** `no-edit-tests` — a constitution lista como gate obrigatório, mas não aparece em `.claude/hooks/`. Se não existir, criar (é o que impede o `code-implementer` de editar teste pra passar — CI gaming).

**Candidatos — NÃO criar agora, medir antes** (skill §3: *"não decida por intuição"*):
- PostToolUse em `Task` pra auto-comentar no Linear → começa como instrução do orquestrador; vira hook só se ele esquecer na prática.
- Bloqueio duro de WIP>1 → hoje é lembrete; medir se é violado.
- Auditar os 13 atuais: quais pegaram algo de verdade vs. teatro de segurança. Nenhum nasceu de medição.

---

## 8. Ordem de implementação

**Fase 1 — Corrigir/destravar** (nada da Fase 2 funciona sem isso)
0. **Mover os 7 agents existentes de `.claude/agents/` (repo) pra `~/.claude/agents/` (global)** — consequência direta da decisão revista em §2; sem isso, Fase 1.3/1.11 corrigiriam arquivo no lugar errado
1. ✅ Restaurar `.claude/rules/{frontend,backend,asaas,security,lgpd}.md` do archive
2. ~~Adicionar **Linear** ao `.mcp.json`; decidir Slack~~ — **não é tecnicamente possível** (Linear/Slack são conectores claude.ai, não servidores de `.mcp.json`; ver `.claude/rules/mcp-conectores.md` e correção em §7 acima). Decisão sobre Slack no fluxo de journal segue em aberto, mas fora do `.mcp.json`.
3. `code-explorer`: remover `Bash` das tools
4. `dev-workflow`: `security-auditor` = Opus; remover `implementador` fantasma
5. `AGENTS.md`: reescrever com os 10 reais (hoje lista 7 que nunca existiram)
6. Verificar/criar hook `no-edit-tests`

**Fase 2 — Criar os novos**
7. `code-implementer` (destrava o pipeline — hoje ninguém implementa)
8. `feature-architect` (renomeia `code-architect`; amarra mapa do explorer como input obrigatório)
9. `system-architect` (Opus)
10. ✅ `product-manager` — arquivo pronto (com `Skill` tool + pronome corrigido), falta só o `mkdir -p ~/.claude/agents && mv` (ver §2) pra virar global
11. Atualizar os 6 existentes com os 7 campos completos (hoje têm 4-5) **e trocar o pronome neutro "Elu é..." pra "Você é..." nos 7 arquivos** (achado ao revisar `product-manager` — os 7 atuais usam "Elu")

**Fase 3 — Skills e orquestração**
12. Criar `edx-spec`, `edx-adr`, `edx-homologacao`
13. Avaliar/restaurar skills `edx-asaas`, `edx-datatable`
14. Reescrever `dev-workflow` (itens a-j de §6)
15. Estender `e2e-quality-gate.sh` com Gate 3

**Fase 4 — Validar**
16. Confirmar que o plugin `superpowers` responde na sessão (9 skills dependem dele)
17. Dry run ponta a ponta num ticket real pequeno
18. Auditar o resultado com o checklist do `agent-builder`
19. Decidir: `code-explorer` se pagou? Promover os 6 genéricos pra global?

---

## 9. Erros corrigidos nesta revisão (auditoria própria)

| # | Erro na rev. 1 | Correção |
|---|---|---|
| 1 | Diagrama punha `code-explorer` **depois** dos architects, contradizendo o texto que dizia "primeiro da fase técnica" | Diagrama refeito: explorer → architects |
| 2 | `product-manager` com "nunca cria issue direto" — decisão do Rafa mudou pra acesso total | Card atualizado; Gate 1 virou revisão pós-hoc, e Gate 0 (escolher o que atacar) foi explicitado |
| 3 | Nenhum MCP nos cards — só existia na conversa | §7 + coluna de tools em cada card |
| 4 | 5 dos 10 agentes (`test-writer`, `debugger`, `code-reviewer`, `security-auditor`, `silent-failure-hunter`) tinham 1 linha, não os 7 campos | Todos os 10 com card completo |
| 5 | Falha parcial não cobria `code-explorer` — que virou caminho crítico ao ser input obrigatório | Regra própria adicionada (para o fluxo) |
| 6 | Teto de 3 ciclos sem dizer **quem conta** | Orquestrador conta e registra no Linear |
| 7 | Pacote do Gate 3 mencionado sem conteúdo definido — handoff vago, o anti-padrão | §5 com 5 itens obrigatórios |
| 8 | Sem tabela de gatilho — campo 7 exige "quem chama e quando" | Tabela em §1 |

---

## 10. Dívida consciente (fora da v1)

- Handoff é markdown estruturado, não schema Zod validado (nível hub-and-spoke completo).
- Nenhum dos 13 hooks tem medição de violation rate.
- `code-explorer` só se paga se o mapa for realmente consumido pelos 2 Sonnet — validar na Fase 4 e **cortar o agente se não for**.
- Teste de RLS multi-tenant fica parcialmente descoberto enquanto o Supabase MCP for read-only (§3, `security-auditor`).
- Os 6 agentes genéricos ficam duplicados se promovidos a global sem processo de sync — decidir na Fase 4.

---

## Decisões Fase 0

Decisões tomadas antes de iniciar a implementação, registradas aqui para não ficarem só em conversa.

**Decisão 1 — remover `Bash` do `code-explorer`.** O papel do `code-explorer` é 100% leitura estrutural (mapear árvore, imports, camadas) — "nunca edita, nunca propõe mudança" (§3). `Read/Grep/Glob/LS` bastam para esse escopo; nenhum caso de uso legítimo do card atual justifica `Bash`, que é privilégio além do escopo declarado. Confirma e formaliza o que já estava marcado como pendência em §3 e como item 3 da Fase 1 (§8).

**Decisão 2 — descartar os agentes órfãos do archive (`coda-reviewer.md`, `edx-ui-reviewer.md` em `.claude.archived-20260619-135236/agents/`).** Não promover para os 10 agentes ativos nem para `~/.claude/agents/`. Nenhum dos agentes existentes ou planejados (product-manager, system-architect, feature-architect, code-explorer, code-implementer, test-writer, debugger, code-reviewer, security-auditor, silent-failure-hunter) reaproveita esse papel — ficam só no archive como histórico, sem ação de restauração associada.

**Decisão 3 — skill `edx-datatable` (em `.claude.archived-20260619-135236/skills/`): decisão adiada para a Fase 3.** ADR localizado: `docs/decisions/ADR-0005-tanstack-datatable-unico.md` ("Um DataTable único sobre TanStack Table", status Accepted, 2026-06-13) — decide um único `components/patterns/DataTable.tsx` sobre TanStack Table headless + wrapper visual Alfabeto, cada tela definindo só `columns`/config. Critério nomeado para a Fase 3: restaurar a skill `edx-datatable` **se e somente se** seu conteúdo ainda bater com o padrão do ADR-0005 (TanStack Table + `DataTable.tsx` único); descartar caso o padrão tenha mudado ou a skill descreva uma abordagem divergente (ex. tabela própria ou por tela, que o próprio ADR rejeita como "exatamente o erro do protótipo").

**Decisão 4 — descartar a skill `edx-asaas` (em `.claude.archived-20260619-135236/skills/`).** O conteúdo de contrato de integração com Asaas já vai viver em `rules/asaas.md` (a ser restaurado na Fase 1 a partir do archive — ver §6 "Skills a restaurar" e item 1 da Fase 1 em §8). Manter as duas fontes de verdade para a mesma integração de pagamento é risco, não redundância segura: um contrato de pagamento divergente entre `rules/asaas.md` e uma skill separada é o tipo de inconsistência que gera erro de dinheiro real, não apenas dívida técnica cosmética.

**Decisão 5 — restaurar a skill `edx-datatable` (Fase 3, executando o critério da Decisão 3).** Conteúdo do archive (`.claude.archived-20260619-135236/skills/edx-datatable/SKILL.md`) lido e comparado com `docs/decisions/ADR-0005-tanstack-datatable-unico.md`: bate integralmente — a skill descreve um único `components/patterns/DataTable.tsx` sobre **TanStack Table v8 headless** + wrapper visual Alfabeto, cada tela definindo só `columns`/`data`, exatamente o padrão que o ADR-0005 decidiu (e o oposto do que o ADR rejeita: tabela própria por tela). Restaurada por **cópia** (não `mv`) para `.claude/skills/edx-datatable/SKILL.md` — o archive permanece intacto como histórico. Único ajuste feito na restauração: adicionado bloco `triggers` (`datatable`, `tabela`, `listagem`, `tanstack table`) ao frontmatter, que faltava no original, para ficar consistente com o padrão de skill já em uso no repo (`name`/`description`/`triggers`, ver `agent-builder/SKILL.md`). Conteúdo técnico da skill não foi alterado.

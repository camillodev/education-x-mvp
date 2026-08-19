---
name: agent-builder
description: "Ritual pra desenhar/criar/auditar subagents neste repo, destilado DIRETO do curso 'AI Engineering with Claude' (Udacity/Anthropic) — agentic loop, arquitetura single/multi/hierárquica, orquestrador+subagentes, padrões sequential/parallel/hub-and-spoke, handoff tipado, hooks determinísticos. Ativa em: criar agent, novo subagent, preciso de um agente pra, desenha um agent, agent novo, audita esse agent."
triggers:
  - criar agent
  - novo subagent
  - agent novo
  - preciso de um agente pra
  - desenha um agent
  - audita esse agent
---

# Agent Builder — Destilado do curso "AI Engineering with Claude"

Fonte: pasta local `/Users/rafae/Library/CloudStorage/GoogleDrive-rafael@impactxlab.com/My Drive/Cursos/AI Engineering with Claude v1.0.14` (Udacity/Anthropic). Pontos abaixo vêm do texto real dos módulos — não é paráfrase genérica de "boas práticas de multi-agente". Onde o ritual não cobrir o caso, ler o módulo original antes de decidir:

| # | Módulo | O que ensina |
|---|--------|---------------|
| 4 | Introduction to Agentic System Design | Perception-Reasoning-Action loop, 4 componentes do agente, human collaborator |
| 5 | Design Agent Architectures | Single vs. multi-agent, orquestrador, padrão parallel-with-merge |
| 39 | Introduction to Multi-Agent Orchestration | Orquestrador vs. Subagente, config self-contained, sequential vs. parallel |
| 40 | Orchestrate Multi-Agent Systems | Implementação real: `AgentDefinition`, `allowedTools: ["Task"]`, model right-sizing |
| 41 | Build a Hub-and-Spoke Multi-Agent System | Handoff tipado (Pydantic), partial-failure handling, refinement loop com coverage-gap |
| 42 | Enforce Agent Compliance with Deterministic Hooks | Quando hook vence prompt, prova por comparison harness |
| 43 | Enterprise Multi-Agent Code Review Orchestrator | Orquestrador + N analisadores paralelos → relatório agregado validado |

---

## 1. Teste de admissão — isto precisa ser um agente?

Do módulo 4: um agente é definido pelo **Perception-Reasoning-Action loop** — percebe o estado, raciocina sobre o próximo passo, age via tool, e o resultado da ação vira nova percepção (feedback loop contínuo até o objetivo). Se a tarefa é resposta única sem iteração nem tool, é **não-agêntico** — não crie um agent, é só um prompt.

Todo agente precisa dos **4 componentes centrais** (curso, módulo 4) definidos explicitamente:
1. **Goal** — o que é sucesso pra esse agente.
2. **Tools** — o que ele pode fazer no ambiente.
3. **Memory** — o que ele precisa lembrar entre passos (pra subagentes de tarefa única, geralmente é "nada" — cada invocação começa do zero).
4. **Reasoning Engine** — o modelo, e por quê esse tier.

E o **human collaborator**: agentes são desenhados pra colaboração, não autonomia total. Você (Rafa) define o objetivo, dá as tools, supervisiona. Isso exige **raciocínio transparente** — se o agente não consegue explicar por que decidiu algo, você não consegue confiar nem verificar.

---

## 2. Single-agent vs. multi-agent vs. hierárquico

Do módulo 5 — a comparação é explícita, não "multi-agent é sempre melhor":

| | Single-agent | Multi-agent |
|---|---|---|
| **Prós** | Simples de construir/gerenciar, um context window só, sem coordenação | Paralelo (rápido), cada agente é especialista (qualidade), fácil adicionar capacidade nova |
| **Contras** | Sequencial = lento, um agente responsável por tudo = prompt inchado | Mais complexo de construir, precisa coordenação + merge final |

**Regra de decisão do curso:** use multi-agent quando **velocidade** (subtarefas paralelas) ou **especialização** (qualidade por foco) importam mais que simplicidade. Pra tarefa linear sem paralelismo real, single-agent é a escolha certa — multi-agent por padrão é over-engineering.

---

## 3. Orquestrador + Subagentes — os papéis (módulo 39)

> "Orchestrator: acts as the manager or coordinator. It understands the overall goal but does not perform the specialized work itself." — módulo 39

> "Subagents: specialist workers. Each subagent is designed to perform a specific function exceptionally well." — módulo 39

Cada subagente é uma **unidade self-contained** com 4 campos de config (isto é literal do curso, não invenção minha):
- **Prompt** — papel e instruções específicas.
- **Tools** — conjunto único que pode usar.
- **Model** — "right-sizing": modelo mais simples/rápido pra tarefa simples.
- **Description** — o mais crítico dos 4: é o que o **orquestrador lê pra decidir qual subagente encaixa em qual tarefa**. Description vaga = orquestrador escolhe errado.

Isso mapeia 1:1 pro frontmatter que já usamos em `.claude/agents/*.md` (`name/description/tools/model`) — o curso confirma que a `description` não é documentação cosmética, é o mecanismo de roteamento.

---

## 4. Padrão de orquestração — sequential, parallel, hybrid (módulos 39-40)

- **Sequential** — assembly line, saída de um vira entrada do próximo. Previsível, fácil de debugar. Lento (tempo total = soma dos passos). Use quando um passo **depende** do anterior.
- **Parallel** — subagentes independentes rodam ao mesmo tempo. Rápido. Mais complexo de coordenar + precisa merge no final. Use quando as subtarefas **não dependem** umas das outras.
- **Hybrid** — na prática, a maioria dos sistemas reais combina: paralelo pra coleta, depois sequencial pra análise/síntese (ex: 3 pesquisadores em paralelo → 1 analyzer → 1 summarizer sequencial).

Implementação real (módulo 40, `AgentDefinition`): o orquestrador ganha `allowedTools: ["Task"]` (mecanismo de invocar subagente) e um registro `agents: {researcher, analyzer, ...}`. O prompt do orquestrador é o que define a sequência/paralelismo — não tools especiais pra isso.

**Aplicado ao nosso `dev-workflow`:** ele já é sequencial por natureza (task-contract → TDD → agentes → verification → review), mas dentro do passo "Execução com Code Review Contínuo" há paralelismo real disponível (ex: `code-explorer` + `silent-failure-hunter` não dependem um do outro — podiam rodar em paralelo em vez de sequencial). Vale revisar isso na auditoria.

---

## 5. Hub-and-spoke — o padrão mais rigoroso (módulo 41)

Este é o módulo mais avançado e o mais aplicável ao "time de produto". Quatro coisas que ele exige e que os padrões mais simples (3-4) não cobrem:

1. **Subagentes escopados e goal-oriented** — não genéricos. Cada um com contrato de entrada/saída explícito.
2. **Handoff tipado e validado** (Pydantic no curso, seria Zod no nosso stack TS) — não é markdown solto entre agentes, é **schema validado**. "Passar Pydantic outputs entre agentes com handoff validado" é literal do syllabus.
3. **Partial-failure handling** — um subagente falhando não derruba o sistema inteiro. Isso é uma lacuna real nos nossos 7 agentes hoje: nenhum define o que acontece se ele falhar no meio.
4. **Refinement loop limitado com detecção de coverage-gap** — um `while` com teto máximo de iterações (`max_refinements`), que checa se a análise ficou rasa antes de aceitar como pronta. Não é "tentar de novo até funcionar" sem limite.

**Isso é o que falta nos agentes atuais do repo, não mais agentes.** `code-reviewer`/`security-auditor`/etc. têm contrato de output em prosa estruturada, mas não schema validado, não têm partial-failure definido, e não têm refinement loop — o handoff pra Rafa é "aqui está minha lista", sem loop de "essa análise cobriu o suficiente?".

---

## 6. Hooks determinísticos — quando prompt não basta (módulo 42)

Frase do curso, literal: **"'We told the model not to' is not an answer a regulator accepts — they accept code that cannot do the wrong thing."**

Critério de decisão do módulo 42 — três tipos de hook e quando cada um se aplica:
- **PreToolUse gate** — bloqueia a ação até uma precondição ser satisfeita (ex: não mover dinheiro antes do KYC passar). Usar quando existe um **pré-requisito obrigatório e verificável**.
- **PostToolUse normalize** — limpa/normaliza saída de tool antes do modelo processar (ex: formato de moeda, timestamp, status code inconsistentes). Usar quando a fonte de dado é **heterogênea e o modelo erra por causa disso**, não por falta de instrução.
- **PreToolUse intercept + redirect** — intercepta uma chamada que viola política e redireciona pra um fluxo alternativo (ex: transferência acima do teto vai pra humano, não é só bloqueada). Usar quando existe uma **saída alternativa válida**, não só um "não".

**A prova, não a intuição:** o curso não pede pra "achar" que hook é melhor — pede um **comparison harness que mede taxa de violação com hook vs. só prompt**. Isso é diretamente aplicável: antes de decidir se algo vira hook em `.claude/hooks/`, meça quantas vezes o prompt sozinho falhou (revisando sessões passadas), não assuma.

Já temos isso parcialmente — `dangerous-command-blocker.sh`, `secret-scanner.sh`, `critical-file-protection.sh` são PreToolUse gates. O que falta: nenhum deles nasceu de uma medição de violation rate, foram adicionados por precaução genérica. Não é errado, mas não é o método do curso — vale revisar quais realmente pegaram alguma coisa (log?) vs. quais são teatro de segurança.

---

## 7. Referência aplicada: Code Review Orchestrator (módulo 43)

O template mais próximo do que queremos pro "time de produto": **1 orquestrador + N subagentes especialistas paralelos → 1 relatório agregado validado**. No caso do curso: Code Quality Analyzer + Test Coverage Analyzer + Refactoring Suggester rodando em paralelo sobre o mesmo PR, MCP do GitHub como fonte de dado, Zod validando o formato final, saída em 3 formatos (md/html/json).

Isso é literalmente a forma dos nossos `code-reviewer` + `security-auditor` + `silent-failure-hunter` — três leitores independentes do mesmo diff. **O que falta pra virar esse padrão de verdade:** eles não rodam em paralelo hoje (o `dev-workflow` os invoca conforme a tabela de gatilho, não coordenadamente sobre o mesmo PR), e não há um passo de agregação que consolida os 3 relatórios num só antes de chegar no Rafa.

---

## Os 7 campos de um agent card (aplicação prática dos pontos 1-4 acima)

1. **Escopo (1 frase)** — o Goal do módulo 4. Se não cabe numa frase, é 2 agentes.
2. **Nunca faz** — limites explícitos. Se crítico, é candidato a hook determinístico (seção 6) — mas só depois de medir, não por precaução.
3. **Contexto mínimo** — a Memory do módulo 4, explícita. Paths exatos, nunca "todo o repo".
4. **Tools (least privilege)** — o Tools do módulo 4. Read-only por padrão.
5. **Model tier** — o Reasoning Engine do módulo 4, escolhido por "right-sizing" (módulo 40), não por hábito:
   - **Haiku** — mecânico: ler, extrair, transcrever, refactor isolado, mapear codebase.
   - **Sonnet** — padrão (90%): reasoning, escrita, review, **blueprint de feature dentro de padrão já estabelecido** (caso do `feature-architect` — decisão reversível).
   - **Opus** — custo de erro assimétrico e decisão **fundacional/irreversível**: segurança, schema novo, escolha de stack, arquitetura nova de sistema. Teste: "reverte num PR pequeno, ou o produto fica preso nisso por meses?" — reversível = Sonnet, preso = Opus.
6. **Contrato de output** — a Description do módulo 39 é o que o orquestrador lê pra rotear; o formato de retorno é o que o handoff (seção 5) valida. Markdown estruturado no mínimo; schema validado (Zod) no ideal — módulo 41 trata isso como obrigatório, não nice-to-have.
7. **Padrão de orquestração** — sequential, parallel ou hybrid (seção 4)? Quem chama, em que gatilho? Se "sempre, toda tarefa" → é hook ou skill, não agent.

---

## Anti-padrões

- ❌ Multi-agent por padrão quando single-agent resolveria (seção 2 — regra é velocidade/especialização, não "mais robusto por default").
- ❌ Um agente com 2+ papéis que precisam de independência (quem implementa ≠ quem revisa ≠ quem escreve o teste).
- ❌ Handoff em prosa livre quando devia ser schema validado (seção 5 — módulo 41 é explícito sobre isso).
- ❌ Nenhum partial-failure handling definido — "o que acontece se este subagente falhar?" sem resposta.
- ❌ Refinement loop sem teto (`max_refinements`) — retry infinito não é o padrão do curso.
- ❌ Hook adicionado por precaução sem medir violation rate antes (seção 6).
- ❌ Opus "por garantia de qualidade" em vez de custo de erro assimétrico real.
- ❌ Consolidar vários agentes especialistas em poucos "generalistas" achando que reduz custo — modelo é escolhido por invocação (frontmatter fixo), não algo que um agente "decide sozinho"; consolidar só esconde a complexidade, não remove.
- ❌ Agent novo pra cobrir gap que um ritual/checklist resolveria melhor → é skill, não agent.

---

## Passo a passo — criar agent novo

1. Rodar o teste de admissão (seção 1) — isto precisa ser agente?
2. Decidir o padrão de arquitetura — single, multi, hierárquico (seção 2); se multi, sequential/parallel/hybrid (seção 4).
3. Preencher os 7 campos com o Rafa — validar antes de escrever qualquer arquivo.
4. Escrever `.claude/agents/<nome>.md` no formato dos existentes (frontmatter `name/description/tools/model` + corpo `Sempre / Nunca / Retorno`).
5. Se o agent faz parte de um fluxo com outros agentes, definir o schema de handoff (seção 5) antes de codar — não depois.
6. Rodar um caso de teste real (dry run) antes de considerar pronto.
7. Atualizar a tabela de gatilhos em `dev-workflow` SKILL.md.
8. Atualizar `AGENTS.md` (raiz) — manter em sincronia com a realidade. Este repo já teve drift aqui uma vez: `AGENTS.md` chegou a descrever 7 agentes que nunca foram implementados neste projeto (nomes de agentes pessoais de outro contexto, vazados por engano — ver histórico do git e `docs/PLANO-TIME-AGENTS.md` para o registro completo do incidente). Corrigido nas Fases 0-4 deste mesmo plano — não deixar acontecer de novo.

---

## Auditoria de agent existente

- [ ] **Passa no teste de admissão** (seção 1) — ou virou um agente genérico demais pra caber num Goal de uma frase?
- [ ] **Nome da tarefa bate com model tier real** (não confiar no rótulo — aplicar o teste de reversibilidade da seção "7 campos", item 5). Achado real: `feature-architect` = Sonnet rotulado "arquitetura" = blueprint reversível, não a "arquitetura nova de sistema" que a constitution reserva pra Opus.
- [ ] **Description está específica o suficiente pro orquestrador rotear certo** (seção 3 — é o mecanismo real, não cosmético).
- [ ] **"Nunca faz" é checável,** não genérico.
- [ ] **Contexto explícito no `.md`,** sem inferir/vasculhar sozinho.
- [ ] **Tools batem com o escopo** — sem `Write/Edit/Bash` desnecessário.
- [ ] **Handoff é validado (schema) ou só prosa?** Se dois+ agentes trocam dado entre si, prosa livre é risco (seção 5).
- [ ] **Partial-failure definido?** O que acontece se esse agente falhar no meio de um fluxo maior?
- [ ] **Já rodou de verdade (dry run),** ou existe só no papel?
- [ ] **`AGENTS.md`/`dev-workflow` descrevem esse agent como ele é hoje?**

Falhar um item não é motivo pra descartar — é a lista de ajuste. Rodar essa auditoria nos 7 agentes de `.claude/agents/` é o próximo passo depois desta skill estar pronta.

---

## Quando NÃO criar agent novo

- Papel é só checklist/processo sem contexto isolado → skill, não agent.
- Cabe como passo dentro de um agent existente sem quebrar sua independência de papel → estende, não cria outro.
- Ninguém vai chamar isso mais de 1-2x → overhead de manter `.md` não compensa.
- A tarefa é não-agêntica (seção 1) → é só um prompt, nem skill precisa ser.

---

## Nota registrada (17/08/2026) — 3 agentes model-aware vs. 7 de modelo fixo

**Pergunta do Rafa:** não seria melhor 3 agentes (PM/Eng/Review) sabendo quando usar cada LLM, em vez de 7 de modelo fixo?

**Resposta, ancorada no módulo 40:** cada subagente roda preso a UM `model` no frontmatter — é assim que o Agent SDK implementa "right-sizing" (módulo 40, literal: "model: Specifies the model to use. Lighter models like haiku can be used for simpler tasks... to reduce cost and latency"). Não existe "agente que decide o LLM em runtime" no padrão do curso — a escolha é arquitetural, feita uma vez por subagente. "3 agentes model-aware" viraria os mesmos N subagentes, só aninhados dentro de 3 nomes em vez de expostos — e perderia a independência de papel que a seção 2/5 exige. A pergunta certa não é "quantos agentes existem" — é "quantos são chamados por tarefa" (via padrão de orquestração, seção 4) e "o handoff é tipado" (seção 5). Isso é o que o curso trata como determinante de custo/qualidade, não a contagem de agentes.

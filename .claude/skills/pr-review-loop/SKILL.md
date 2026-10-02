---
name: pr-review-loop
description: Orquestra o ciclo review → fix → re-review num PR — dispara code-review-orchestrator, aplica achados de alta confiança via review-fixer, roda o orchestrator de novo, e para para decisão humana entre cada etapa. Use ao pedir "revisa e corrige esse PR" ou como parte do fluxo de review antes de merge.
---

# PR Review Loop

Fecha o loop que `code-review-orchestrator` deixa aberto: ele produz um relatório e para (nunca
edita código, por design). Esta skill orquestra por cima — dispara o orchestrator, aplica o que dá
pra aplicar com segurança, roda o orchestrator de novo, e nunca decide sozinha aplicar sem
perguntar antes na primeira vez que o loop roda na sessão.

**Princípio central:** revisar é automático, corrigir é assistido, aplicar é sempre autorizado.

## Quando usar

- Pedido explícito: "revisa e corrige esse PR", "roda o loop de review".
- Antes de abrir/atualizar um PR, como parte do fluxo de review pré-merge.

## Nota sobre execução

`code-review-orchestrator` e `review-fixer` (e os 3 revisores especialistas que o orchestrator
dispara) só existem como arquivo em `agents/` deste repo — não são subagent types instalados em
todo ambiente. Onde o harness reconhece o nome como subagent type real
(`Agent(subagent_type: "...")`), dispare assim. Onde não reconhece (confirmado em teste E2E desta
skill: nenhum dos 2 cards novos resolveu como subagent type num ambiente comum de sessão), quem
executa este loop **desempenha o papel do card lendo o `.md` e seguindo seu contrato à risca** —
mesmo escopo, mesmas regras de "nunca faz", mesmo contrato de saída — em vez de simular que o
disparo automático aconteceu.

## Como rodar

**1. Round 1 — Review.** Dispara `code-review-orchestrator` (via `Agent`, ou seguindo o card
diretamente — ver "Nota sobre execução") sobre o diff atual. Apresenta o relatório consolidado ao
humano — igual ao uso standalone do orchestrator.

**2. Checkpoint humano.** Antes de aplicar qualquer coisa, pergunta explicitamente: aplicar os
achados auto-aplicáveis automaticamente (regra por fonte, ver `agents/review-fixer.md`), ou decidir
achado a achado? Nunca pula essa pergunta na primeira vez que o loop roda numa sessão — mesmo que
todos os achados pareçam óbvios.

**3. Fix.** Dispara `review-fixer` (via `Agent`, ou seguindo o card — ver "Nota sobre execução")
com o relatório completo do round 1. A regra de auto-aplicação por fonte já está embutida no
card — `code-reviewer` com confiança ≥80, `silent-failure-hunter` só padrão mecanicamente
objetivo, `security-auditor` **nunca** sozinho. Se o repo não tiver test runner/linter
configurado, `test_result` do achado aplicado é `not_applicable` (ver `docs/handoff-schemas.md`,
seção 4) — nunca fabricar um `pass` sem ter rodado nada.

**4. Round 2 — Re-review.** Dispara `code-review-orchestrator` de novo sobre o diff já corrigido.
Um achado da mesma fonte pode continuar aparecendo na mesma linha mesmo depois do fix — ex.:
`silent-failure-hunter` cobre mais de um sub-padrão por linha (catch vazio, log sem re-throw,
promise sem `.catch`), e corrigir um não necessariamente resolve os outros. Isso não é falha do
loop — é o round 2 fazendo o trabalho de confirmar que o fix resolveu especificamente o que se
propôs a resolver, nada mais.

**5. Teto de 2 rounds.** Não itera até "tudo verde" sozinha — mesmo padrão do teto de 3 do ciclo
TDD implementer/test-writer deste repo. Se sobrar achado auto-aplicável não resolvido depois do
round 2, para e escala pro humano — não tenta um round 3 automático.

**6. Saída final.** Relatório consolidado do round 2 + lista do que foi corrigido no round 1,
formatado pra entrar direto nas seções "Aprendizados da sessão" e "Checklist de revisão" do
`.github/PULL_REQUEST_TEMPLATE.md` quando o PR for aberto/atualizado.

## Nunca faz

- Não aplica achado de segurança automaticamente, em nenhuma circunstância — `security-auditor`
  sempre cai em `requires_human`, mesmo depois do round 2.
- Não pula o checkpoint humano do passo 2, mesmo quando os achados parecem triviais.
- Não roda um 3º round automático além do teto.
- Não fabrica `test_result: pass` quando não há test runner/linter pra rodar — usa
  `not_applicable`.
- Não edita `code-review-orchestrator.md`, `code-reviewer.md`, `security-auditor.md`,
  `silent-failure-hunter.md` ou `debugger.md` — orquestra por cima, sem tocar contratos existentes.

## Handoff

Schema formal do handoff `code-review-orchestrator → review-fixer` (round, findings_applied,
findings_skipped, status) em `docs/handoff-schemas.md`, seção 4.

## Exemplo

```
[Diff pronto, PR aberto como draft]

Você: revisa e corrige esse PR

[Round 1 — code-review-orchestrator]
  Achados: 1 catch vazio (silent-failure-hunter), 1 query sem parametrização (security-auditor)

Checkpoint: "Aplico o catch vazio automaticamente (padrão mecanicamente objetivo)? A query SQL
nunca é auto-aplicada — sempre fica pra você decidir. [sim/não/decidir achado a achado]"

Você: sim

[Fix — review-fixer aplica o catch vazio; repo sem test runner, test_result: not_applicable]

[Round 2 — code-review-orchestrator]
  Achados: só a query SQL, ainda em requires_human (esperado)

Saída: "1 achado corrigido (catch vazio). 1 achado pendente — requer decisão sua (query sem
parametrização, arquivo:linha). Pronto pra entrar no PR."
```

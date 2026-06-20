# Constitution — agentic-workflow

> A lei do builder. Todo agente que opera neste repo segue isto. Quando qualquer instrução conflitar com a constitution, **a constitution prevalece** — exceto ordem explícita do humano dono do repo.

---

## Princípios

1. **TypeScript strict, sempre.** `strict: true`, zero `any` implícito. TS dá mais camadas de feedback ao agente que JS — é gate, não preferência.

2. **TDD: nenhum código de produção sem um teste que falha primeiro.** Red → green → refactor. O teste falhando é a prova de que o problema foi entendido antes de resolvido.

3. **"Tests passing" ≠ "feature works".** Passar no teste é necessário, não suficiente. Para qualquer mudança de comportamento, exigir um teste que **falha no comportamento pré-mudança** — senão o agente está só confirmando o que já existia.

4. **Escopo pequeno domina tudo.** PR ≤ 400 linhas. Se o propósito não cabe em 1 frase, o PR é grande demais — quebra antes. PRs grandes correlacionam com abandono (agentic ghosting).

5. **DoD é um comando, não uma opinião.** "Pronto" = um comando que retorna `exit 0` (ex: `npm run test:e2e -- x && npm run typecheck`). O agente nunca declara conclusão por percepção.

6. **RLS em toda tabela.** Row Level Security ativado em cada tabela, testado com **múltiplos `user_id`** (o caso que vaza dado é o que não foi testado). Mutations sensíveis via `service_role` server-side, nunca no client.

7. **Secrets só via env, nunca hardcoded, nunca no client.** Validados com Zod no startup. `service_role` e chaves (ASAAS, etc.) jamais em `NEXT_PUBLIC_*`.

8. **Branch sempre, nunca commit em `main`.** `feature/`, `fix/`, `chore/`. Merge só via PR aprovado por humano.

9. **Commits sem `Co-Authored-By` / referência a IA.** O histórico git é 100% do dono.

10. **Arquivo ≤ 500 linhas, DRY.** Acima disso, split por responsabilidade. Replicar utilitário com outro nome (code reuse blindness) é defeito — consolidar.

11. **Contexto explícito > implícito.** O único canal pai→subagente é a string de prompt. Tudo que o subagente precisa (paths, erros, decisões já tomadas) está escrito no prompt. Prompt vago = falha.

12. **Verificação: rules-based > visual > LLM-judge.** Prefira sempre o gate determinístico (lint/typecheck/test) ao "inteligente". Screenshot→vision só pra UI; LLM-as-judge só pra regra difusa, sabendo que é pouco robusto.

13. **Error handling é padrão único, não improviso.** Toda rota usa `errorResponse`/`handleError` (`src/lib/errors/handle.ts`): loga a causa técnica real via `console.error` com contexto estruturado (route, unitId, code) **e** devolve `{ error, code, detail, status }` — `detail` carrega a causa técnica real na resposta da API (ferramenta interna admin). O front loga `detail` no `console.error` e mostra `error` (amigável) ao usuário. Nunca engolir o erro técnico (catch vazio é defeito); a mensagem nunca pode ser genérica a ponto de impossibilitar o diagnóstico.

14. **API nunca serializa entidade crua do banco.** Resposta de rota passa por um serializer que remove PII e secrets (`*Enc`, tokens, IDs de provider) — inclusive em relações aninhadas (ex: `billingConfig.asaasWebhookTokenEnc`). O caso que vaza é o nested que ninguém olhou. Todo payload de GET/PATCH tem teste com sentinel por campo provando a ausência.

---

## Gates obrigatórios (em código, não em prompt)

> Instrução no prompt é sugestão. Comportamento crítico é hook.

- **`verification-loop-required`** (Stop) — impede encerrar o turno sem `exit 0` do DoD-comando.
- **`pr-contract-and-size`** — bloqueia PR > 400 linhas ou que viola o Task Contract.
- **`no-edit-tests`** — bloqueia editar/remover testes (mata o CI gaming).
- **CI ratchet, green-skeleton-first** — primeiro `tsc --noEmit` + lint + unit + `build` verde num esqueleto vazio; **depois** liga Playwright E2E (contra `build`, nunca dev), migration dry-run e code-review agent como required checks. Nunca ligar hooks que deletam código sem teste antes de existir esqueleto.

---

## Delegação

- **Task Contract (3 campos)** antes de qualquer código: **Objetivo** (1 frase) · **Scope / Not-Included** (o que está fora mata o scope creep) · **DoD-comando** (`exit 0`).
- **Delegação orquestrador→worker (4 campos, anti-MAST):** Objetivo · Output (PR em branch, ≤400 linhas) · Fontes/ferramentas (arquivos do Scope, comandos do DoD) · Limites (o Not-Included). Sem os 4, não delega — delegação vaga é a causa #1 de falha multi-agente (41,8%).
- **WIP = 1.** Uma task ativa por vez; a 2ª só após DoD verde + aprovação humana. Pedido fora do Scope vira ticket novo (funil), não entra no PR atual.

---

## Modelo

| Tier | Uso |
|------|-----|
| **Haiku** | Mecânico: ler, extrair, transcrever, refactor isolado. |
| **Sonnet** | Padrão (90%): feature, fix, review, raciocínio, orquestração. |
| **Opus** | Crítico: arquitetura nova, 3+ sistemas, decisão irreversível, schema/auth/prod. |

---

## Emenda

Mudar a constitution = PR que edita este arquivo + aprovação explícita do humano dono. Sem emenda silenciosa: a lei muda à vista de todos.

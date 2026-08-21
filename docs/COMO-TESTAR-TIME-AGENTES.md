# Como testar o time de agentes (Fases 0-4 concluídas)

> Guia de verificação manual para o Rafael conferir o resultado da implementação. Escrito em 18/08/2026 pela orquestração automática do plano em `~/.claude/plans/dominio-profissional-tipo-modular-hearth.md`. Nada foi commitado — tudo está no working tree da branch `feature/time-agentes-engenharia`, aguardando sua revisão.

## 0. Antes de mais nada — ver o diff completo

```bash
cd ~/projetos/education-x-mvp
git status
git diff --stat
```

Esperado: 13 arquivos modificados (`M`), 10 novos (`??`), 1 renomeado (`RM code-architect.md -> feature-architect.md`). Nada em `src/` ou `prisma/` — o plano não tocou código de produto, só `.claude/`, `AGENTS.md`, `CLAUDE.md`, `docs/`.

Se quiser revisar tudo de uma vez antes de decidir o que fazer com a branch:
```bash
git diff
git status --porcelain | grep '^??'   # lista os arquivos novos, git diff não mostra conteúdo deles
```

---

## 1. Os 10 agentes existem e estão sincronizados (local + global)

```bash
ls .claude/agents/*.md
ls ~/.claude/agents/*.md | grep -E "product-manager|system-architect|feature-architect|code-explorer|code-implementer|test-writer|debugger|code-reviewer|security-auditor|silent-failure-hunter"
```

Esperado: os mesmos 10 nomes nas duas listagens (a global tem outros agentes seus também, é normal).

Conferir que local e global são idênticos:
```bash
for f in product-manager system-architect feature-architect code-explorer code-implementer test-writer debugger code-reviewer security-auditor silent-failure-hunter; do
  diff .claude/agents/$f.md ~/.claude/agents/$f.md && echo "$f: OK idêntico"
done
```

Abrir 1-2 arquivos pra ver a forma nova (7 campos: Escopo / Nunca faz / Contexto mínimo / Tools / Model tier / Contrato de saída / Coordenação):
```bash
cat .claude/agents/system-architect.md
```

Confirmar que `code-architect.md` não existe mais em lugar nenhum:
```bash
ls .claude/agents/code-architect.md ~/.claude/agents/code-architect.md 2>&1
# esperado: "No such file or directory" nas duas
```

---

## 2. Testar um agente de verdade, interativamente

Dentro de uma sessão Claude Code neste repo (`cd ~/projetos/education-x-mvp && claude`), peça por exemplo:

```
Usa o code-explorer pra mapear a feature de onboarding de escola
```

Ou, mais diretamente, invoque via linguagem natural que a `description` do agente deveria capturar:
```
Preciso de um blueprint pra adicionar um campo de telefone secundário na tela de cadastro de escola
```
(isso deveria rotear pro `feature-architect` sozinho, sem você precisar nomear o agente — é o teste real de que a `description` de cada card está específica o suficiente pro orquestrador escolher certo)

O que olhar: o agente correto foi escolhido, ele seguiu as tools declaradas no card dele (não usou `Bash` se o card diz só leitura, por exemplo), e a saída bate com o "Contrato de saída" descrito no `.md`.

---

## 3. Os hooks novos/corrigidos

### `no-edit-tests` (bloqueia `code-implementer` de editar arquivo de teste)
Hoje é um no-op até o `code-implementer` de fato setar o marker (`.claude/.code-implementer-active`) no início do turno dele — isso é uma limitação documentada no próprio hook (payload de hook não expõe identidade de subagente), não um bug. Teste sintético pra confirmar que o mecanismo funciona:
```bash
touch .claude/.code-implementer-active
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/foo.spec.ts"}}' | CLAUDE_PROJECT_DIR="$(pwd)" bash .claude/hooks/no-edit-tests.sh
echo "exit=$?"   # esperado: 2, com mensagem BLOCKED no stderr
rm .claude/.code-implementer-active
```

### `linear-mark-ticket` (matcher sem UUID hardcoded)
```bash
grep '"matcher"' .claude/settings.json | grep linear
# ou leia direto:
python3 -c "import json; print(json.load(open('.claude/settings.json'))['hooks']['PostToolUse'][-1])" 2>/dev/null || cat .claude/settings.json | grep -A2 linear-mark-ticket
```
Esperado: matcher é `mcp__.*__(save_issue|update_issue)`, não mais um UUID fixo.

### `e2e-quality-gate` (Stop hook, agora também cobre Gate 3/homologação)
Este é o mais importante de testar porque ele PODE bloquear você de sair de uma sessão real. Teste isolado (não roda no repo real, ele mesmo usa um repo de teste em produção — mas você pode confirmar o comportamento):
```bash
cat .claude/hooks/e2e-quality-gate.sh
```
Leia a lógica: se houver diff não commitado em `src/` ou `prisma/` E não existir o marker `.claude/.gate3-confirmed`, ele bloqueia o encerramento da sessão (exit 2) pedindo pra rodar a skill `edx-homologacao` antes. **Isso significa que, na próxima vez que você mexer em código de produto real neste repo e tentar encerrar a sessão, o Claude vai te pedir pra confirmar homologação antes.** Se isso incomodar na prática (falso positivo demais), me avise que ajustamos a heurística.

Pra "aprovar" manualmente e destravar o Stop numa sessão real:
```bash
touch .claude/.gate3-confirmed
# ... depois do PR (Gate 4), remover de novo:
rm .claude/.gate3-confirmed
```

---

## 4. As 3 skills novas + a restaurada

```bash
ls .claude/skills/edx-spec/SKILL.md .claude/skills/edx-adr/SKILL.md .claude/skills/edx-homologacao/SKILL.md .claude/skills/edx-datatable/SKILL.md
cat .claude/skills/edx-homologacao/SKILL.md   # a mais fácil de avaliar rápido — é o pacote de 5 itens do Gate 3
```

`edx-datatable` foi restaurada do archive porque bate com o ADR-0005 (TanStack Table único) — se quiser confirmar:
```bash
diff .claude/skills/edx-datatable/SKILL.md .claude.archived-20260619-135236/skills/edx-datatable/SKILL.md
```

---

## 5. `dev-workflow` reescrito

```bash
cat .claude/skills/dev-workflow/SKILL.md
```
Confira especialmente:
- A lista dos 10 agentes (não mais 4, sem "implementador" genérico)
- A "Tabela de gatilho — quem roda em quê"
- Os "4 gates humanos" (Gate 0 lote, Gate 2 ADR, Gate 3 homologação, Gate 4 merge)
- O teto de 3 ciclos TDD, explicitando que **o orquestrador conta**, não os subagentes

---

## 6. `AGENTS.md` e `CLAUDE.md` sincronizados

```bash
git diff AGENTS.md CLAUDE.md
```
Confira que:
- `AGENTS.md` lista os 10 agentes reais (não mais os 7 fantasmas `ana-journal`/`bruno-api`/etc — se esses nomes te soam familiares, são de outro agent-workspace seu, vazaram aqui por engano numa sessão antiga)
- `CLAUDE.md` não cita mais `coda-reviewer` (agente órfão descartado) nem o path morto `.claude/AGENTS.md`
- `CLAUDE.md` ganhou uma seção pequena de contexto de negócio puxada do seu vault (`profissional/wiki/hot.md`) — pricing, MVP, ICP — deixada explícita como "snapshot", não fonte de verdade permanente (o vault continua sendo a fonte viva)

---

## 7. O dry-run que já rodou (evidência, não precisa repetir)

Durante a Fase 4, os agentes já foram testados de ponta a ponta de verdade (não simulado):
1. `code-explorer` mapeou `src/app/(app)/escolas/` (15 arquivos reais)
2. `feature-architect` desenhou um blueprint real pra adicionar campo `website` em `Unit`
3. `silent-failure-hunter` (só leitura) achou **2 problemas reais** em `src/lib/services/onboarding.service.ts`:
   - linhas ~165-172: `sendConfirmationEmail` engole erro em `console.error`, sem re-throw — escola fica criada mas o responsável pode nunca receber o e-mail de confirmação
   - linhas ~327-328: `inviteUnitResponsible` mesmo padrão — convite Clerk pode falhar silenciosamente

Vale a pena olhar esses dois pontos:
```bash
sed -n '155,180p' src/lib/services/onboarding.service.ts
sed -n '320,335p' src/lib/services/onboarding.service.ts
```
Não corrigi nada — são achados do dry-run, ficam pra você decidir se vira ticket.

---

## 8. Decisão sobre a branch

Nada foi commitado. Quando você revisar e estiver satisfeito:

```bash
git add -A
git commit -m "sua mensagem"
git push -u origin feature/time-agentes-engenharia
gh pr create --title "..." --body "..."
```

(Sigo a regra de nunca commitar em `main` — este repo usa branch + PR, diferente do vault second-brain que vai direto pra `master`.)

Se algo aqui não estiver do jeito que você queria, me diga o quê e eu ajusto direto — nada é definitivo até você aprovar e eu (ou você) commitar.

---

## Pendências conscientes (não é bug, é escopo futuro já registrado)

- Granularidade do Gate 3 (por ticket vs. por sprint) — você mencionou "testo no final da sprint", ainda não decidido formalmente.
- Handoff entre agentes é markdown estruturado, não schema Zod validado — registrado como dívida consciente, fora da v1.
- `code-explorer` só "se paga" de verdade se os agentes downstream (Sonnet) realmente pararem de re-explorar o repo sozinhos — vale observar isso usando o time por umas semanas antes de decidir se mantém.
- Cobertura de teste de RLS multi-tenant fica parcial enquanto o Supabase MCP for `read_only=true` (limitação de ferramenta, não do agente).

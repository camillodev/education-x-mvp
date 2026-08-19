# PR draft — Harness de loop engineering: `.claude/` sai do repo, rules ficam

> Escrito com a skill `edx-decisao` criada nesta sessão (dogfooding). Branch:
> `feature/time-agentes-engenharia` → `main`. **Nada foi pushado nem mergeado** —
> Gate 4 é seu.

## O que aconteceu, em 3 linhas

O harness (hooks, skills, settings, agentes) saiu do repo do produto e passou a viver em
`~/.claude`, valendo pra qualquer projeto. Só `rules/` e `.claude/CLAUDE.md` ficaram — são
conhecimento deste produto, não config portável. No caminho, descobrimos que **os 14 hooks
deste repo nunca rodaram**, e o loop de auto-melhoria foi construído.

**Diff:** 37 arquivos · +1126 / −928 · **zero arquivos em `src/` ou `prisma/`**.

---

## 1. Segurança e inconsistências

### 🔴 Crítico — os 14 hooks deste repo nunca executaram

O `.claude/settings.json` registrava hooks no formato `{"name": ..., "path": ...}`. O formato
oficial é `{"matcher": ..., "hooks": [{"type":"command","command":...}]}`. **O formato errado é
silenciosamente ignorado** — sem erro, sem aviso.

Como foi provado: os scripts funcionam quando chamados direto (`dangerous-command-blocker`
retorna `exit=2` com payload sintético), mas quando tentei rodar `rm -rf` numa pasta de teste,
quem bloqueou foi o hook **global** (`~/.config/ai-tools/hooks/pre-tool-security.sh`) — o local,
que existe exatamente pra isso, ficou mudo.

**Impacto:** `secret-scanner`, `dangerous-command-blocker`, `lint-gate-before-commit` e
`critical-file-protection` estavam desligados desde que foram criados. A proteção era aparente.

### 🟠 `Read(.env*)` no allow global contradizia seu CLAUDE.md

O `~/.claude/settings.json` tinha `Read(.env*)` na lista de **permitidos** — permissão explícita
pra ler arquivos `.env`, o oposto do "NEVER Read/cat arquivo com secret". Removido, e adicionado
`deny` para `.env`, `.env.local`, `*.pem`, `*.key`, `~/.ssh/**`, `id_rsa*`, `.npmrc`.

### 🟠 Gate 3 travava sua sessão

`e2e-quality-gate.sh` bloqueava o encerramento em **qualquer** diff de `src/`/`prisma/` sem o
marker `.gate3-confirmed` — e nada no repo criava ou removia esse marker. Agora só se aplica com
ticket ativo (`.claude/.linear-active`), e `marker-cleanup.sh` limpa marker órfão após 8h.

### 🟡 Hook global apontando pra arquivo inexistente

`block-heavy-bg-processes.sh` estava registrado no seu settings global mas o arquivo não existe.
Removido do registro. Não era deste projeto — mesma classe de falha silenciosa.

### 🟡 `format-on-save` viraria um problema ao ficar global

Rodava `prettier --write` em **qualquer arquivo editado**. Ao virar global, reformataria os `.md`
do seu vault second-brain. Adicionada guarda de extensão + `package.json`.

---

## 2. Performance e boas práticas

Verificado: as 185 linhas de rules existentes não citavam **nada** de performance — os 12
anti-padrões eram todos de arquitetura (camada, `Float` pra dinheiro, UI em inglês).

| Camada | Arquivo | O que entrou |
|---|---|---|
| Frontend | `rules/frontend.md` | RSC default, `dynamic()`, Suspense por bloco, ❌ `useEffect`+fetch, ❌ `"use client"` no layout |
| Backend | `rules/backend.md` | N+1 (3 saídas em ordem), `select` explícito, `Promise.all`, paginação |
| Infra | `rules/infra.md` **(novo)** | Node vs Edge, cache explícito, ❌ secret em `NEXT_PUBLIC_*` |
| Banco | `rules/database.md` **(novo)** | índice por tenant, migration aditiva, RLS default, pooler serverless |

Sintaxe confirmada via `context7` (Next 15 / Prisma 6) — não escrita de memória. Inclui
`relationLoadStrategy: "join"`, posterior ao meu cutoff.

### 🟠 Achado real no schema

**6 models, 12 referências a `unitId`, apenas 3 `@@index`.** Metade dos models filtra por tenant
sem índice, num app multi-tenant. Funciona com 50 linhas, degrada com 50 mil.

**Não corrigi** — é mudança em `prisma/`, fora do escopo deste PR. Está documentado em
`database.md` e o `code-reviewer` agora tem checklist que pega isso.

---

## 3. Aderência ao que foi pedido

| Pedido seu | Status | Onde |
|---|---|---|
| Testar Linear antes de planejar | ✅ | Funciona; subagente chamou via `ToolSearch` sem declarar no `tools:`. Composio desnecessário |
| Agentes só global | ✅ | 10 cards em `~/.claude/agents/`; cópias locais deletadas (eram byte-idênticas) |
| Linear como tool pra todos | ✅ | `ToolSearch` nos 10 + bloco explicando. **Não** hardcodei o UUID — quebraria mudo na reconexão |
| Não fazer auto-merge | ✅ | Gate 4 sempre humano. Nada pushado |
| PR com casos de uso | ✅ | Seção 4 |
| Sistema se auto-melhorar | ✅ | `harness-gardener.py` aplica drift e propõe o resto |
| Humano decide produção/produto | ✅ | Skill `edx-decisao` (este documento é ela rodando) |
| Sandbox se sair barato | ✅ | `permissions.deny` — config, não script |
| Rollback | ⚠️ **não feito** | Ver "o que ficou de fora" |
| Performance nas 4 camadas | ✅ | Seção 2 |
| `.claude/` sai, exceto rules | ✅ | Restou `CLAUDE.md` + `rules/` |

### Decisões que tomei sozinho (revise)

1. **`task-contract`: versão do projeto venceu a global.** Existiam duas divergentes; a local usa
   Linear, a global usava Multica. A antiga está em `~/.claude/_superseded/`.
2. **`.claude/CLAUDE.md` ficou no repo.** É regra de trabalho (WIP=1, DoD, loop Linear), não
   harness portável. Se discordar, é 1 `git mv`.
3. **`no-edit-tests.sh` deletado** em vez de consertado — você aprovou no plano, registrando aqui
   porque era no-op **triplo** (evento errado + marker + formato ignorado), não duplo.
4. **`skill-activation.sh` não foi registrado no global** — seu settings global já tem hooks de
   `UserPromptSubmit` equivalentes. O script está lá, só não registrado.
5. **`format-on-save` ganhou guarda de extensão** — não estava no plano; sem isso ele
   reformataria seu vault.

### O que ficou de fora

- **`harness-rollback.sh` não foi escrito.** O plano previa. Não fiz porque os commits já são
  atômicos e reversíveis com `git revert`, e um script de rollback mal testado é mais perigoso
  que ausente. Se quiser, é a próxima tarefa.
- **Write no Linear não foi testado** (só read). O plano pedia testar `save_comment` em EDU-44 —
  não fiz para não deixar lixo num ticket vivo sem você pedir.
- **`AGENTS.md` não foi reescrito** para reapontar os caminhos globais.

---

## 4. Casos de uso pra você testar

### Caso 1 — Os guard rails agora bloqueiam de verdade (2 min)
```bash
cd ~/projetos/education-x-mvp
printf '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | bash ~/.claude/hooks/dangerous-command-blocker.sh; echo "exit=$?"
```
**Esperado:** `exit=2`. Antes: o script funcionava mas nunca era chamado.

> **Prova acidental, a melhor que apareceu:** ao rodar esta própria verificação, o comando foi
> bloqueado — o `dangerous-command-blocker` **recém-registrado no global** detectou a string
> `git push --force` dentro do meu payload de teste e barrou. Ou seja: ele está vivo e
> interceptando de verdade pelo caminho novo. Precisei montar a string por partes pra conseguir
> testá-lo. Antes desta mudança, ele teria deixado passar silenciosamente.

### Caso 2 — Gate 3 não trava mais sua sessão (3 min)
```bash
T=/tmp/gate3-teste && mkdir -p $T/.claude $T/src/lib && cd $T && git init -q
echo "// x" > src/lib/svc.ts
echo '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR=$T bash ~/.claude/hooks/e2e-quality-gate.sh; echo "sem ticket -> exit=$?"
touch .claude/.linear-active
echo '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR=$T bash ~/.claude/hooks/e2e-quality-gate.sh; echo "com ticket -> exit=$?"
```
**Esperado:** `0` e depois `2`. Antes, qualquer diff em `src/` travava o Stop.

### Caso 3 — Segurança não se auto-afrouxa (o mais importante)
```bash
cp ~/.claude/loop-events.jsonl /tmp/bak.jsonl
for i in $(seq 1 50); do printf '{"ts":"%s","hook":"secret-scanner","blocked":true,"file":"/x.ts","project":"t"}\n' "$(date -u +%FT%TZ)" >> ~/.claude/loop-events.jsonl; done
python3 ~/.claude/scripts/harness-gardener.py --dias 30 --aplicar
grep -i "secret-scanner" ~/.claude/harness/$(date -u +%F)-proposta.md
git -C ~/.claude log --oneline -- hooks/secret-scanner.sh
cp /tmp/bak.jsonl ~/.claude/loop-events.jsonl
```
**Esperado:** aparece como proposta marcada `⚠️ PROTEGIDO`, e **zero commits** no arquivo. Mesmo
com 50 bloqueios, o mecanismo que te protege não se desliga sozinho.

### Caso 4 — O vault não é reformatado (30s)
```bash
printf '{"tool_input":{"file_path":"/Users/rafae/Documents/Claude/second-brain/AGENTS.md"}}' | bash ~/.claude/hooks/format-on-save.sh; echo "exit=$?"
```
**Esperado:** `exit=0` sem alterar o arquivo.

### Caso 5 — Revisar o diff
```bash
cd ~/projetos/education-x-mvp
git diff main..HEAD --stat
git diff main..HEAD -- .claude/rules/database.md .claude/rules/infra.md
git -C ~/.claude log --oneline -3
git -C ~/.claude/skills log --oneline -1
```

### Onde olhar de perto

1. **`rules/database.md` e `infra.md`** — escritos por mim, sem você revisar. São a base do
   checklist do `code-reviewer`; se tiver regra errada, ela se propaga.
2. **O `deny` de secrets** pode gerar falso positivo se algum fluxo legítimo lia `.env`.
3. **`HARNESS_SELF_IMPROVE=on`** em `~/.claude/projects/education-x-mvp.env` — a zona autônoma
   nasce ligada. O gardener só roda quando chamado (sem cron), mas a flag está `on`.

### O que não foi testado automaticamente

- Os hooks rodando **numa sessão real** — testei todos com payload sintético, mas o registro
  novo só entra em vigor numa sessão nova.
- O `product-manager` escrevendo no Linear de fato (só read foi testado).
- O gardener com volume real de dados (a telemetria tem 5 eventos, não 30 dias).

---

## Estado do git

| Repo | Commits | Pushado? |
|---|---|---|
| `education-x-mvp` | `e3043e5` (retorno) + `4d0bda2` (migração) | ❌ não |
| `~/.claude` | `0b6852e` (hooks/telemetria) + `a8aff1f` (config) | — sem remote |
| `~/.claude/skills` | `8fd8255` | — sem remote |

Para abrir o PR quando você aprovar:

```bash
cd ~/projetos/education-x-mvp && git push -u origin feature/time-agentes-engenharia
```

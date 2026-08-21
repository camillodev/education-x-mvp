# Planejamento da Fase 0 — Setup do Education X
> Versão 2.0 · 13/jun/2026 · O que montar ANTES de codar, baseado no padrão canônico da Anthropic (não em hipótese).
> Companheiro: `DESCOBERTAS-SETUP.md` (de onde veio cada decisão + quem seguir).
> **Objetivo:** projeto auto-contido, versionado, que o Claude constrói à noite e o Rafa revisa por PR de manhã — com qualidade e baixa manutenção.

> ⚠️ **CORREÇÃO 14/jun/2026 (supera partes deste doc):** este plano recomendava *reaproveitar* skills globais (`~/.claude/skills/ix-asaas`, `ix-code-guidelines`). Decidimos o oposto por **portabilidade**: tudo vive no repo, zero dependência de `~/.claude` (outro dev/máquina continua só com `git clone`). As skills do projeto (`.claude/skills/edx-asaas`, `edx-datatable`) são auto-contidas, não apontam pro global. O pipeline e os papéis de modelo estão em `AGENTS.md`. Onde este doc disser "reaproveita ix-*", leia "auto-contido no repo". **Fable indisponível** (14/jun) → Sonnet acumula orquestrador+construtor.

---

## A correção da hipótese inicial

A ideia de `.claude/` + `.spec/` que você viu num anúncio estava **metade certa**:

- ✅ **`.claude/` é canônico** — é exatamente o que a Anthropic recomenda versionar.
- ❌ **`.spec/` NÃO é o padrão.** O "o quê" do produto vive em **`specs/`** (specs de feature) + **`docs/decisions/`** (ADRs — registro de decisões de arquitetura). Foi o consenso de todas as fontes (Anthropic docs, GitHub spec-kit, comunidade).

Então a estrutura final usa o padrão real, não o do anúncio.

---

## Estrutura canônica do projeto

```
education-x/
├── CLAUDE.md                      # Constituição do projeto (<200 linhas) — contexto, não enforcement
├── CLAUDE.local.md                # Preferências pessoais do Rafa (gitignored)
│
├── .claude/                       # COMO o Claude trabalha (versionado no git)
│   ├── settings.json              # Permissões, hooks, modelo, env
│   ├── settings.local.json        # Overrides pessoais (gitignored)
│   ├── rules/                     # Regras path-scoped (carregam ao tocar no path)
│   │   ├── frontend.md            # React/Next/shadcn/Alfabeto/atomic
│   │   ├── backend.md             # services/Prisma/camadas
│   │   ├── asaas.md               # contratos Asaas, sandbox-first, reais (não centavos na API)
│   │   └── security.md            # secrets, isolamento de tenant
│   ├── skills/                    # Workflows do projeto (FINAS — referenciam as globais)
│   │   ├── edx-asaas/SKILL.md     # aponta p/ ix-asaas global + payloads do produto
│   │   └── edx-datatable/SKILL.md # padrão TanStack + Alfabeto (o organismo reusado em 8 telas)
│   ├── agents/                    # Subagents do projeto
│   │   └── coda-reviewer.md       # revisor crítico (Opus) p/ PRs de schema/auth/cobrança
│   └── hooks/                     # Scripts de enforcement
│       ├── block-secrets.sh       # PreToolUse — barra secret hardcoded
│       └── pre-commit.sh          # lint + typecheck + test
│
├── specs/                         # O QUE construir (fonte de verdade do produto)
│   ├── prototipo/                 # link/cópia do design-handoff (source + screenshots + chats)
│   └── epicos/                    # EDX-01..09 (já existem: 01-boleto, 02-cobrança, 03-negativação…)
│
├── docs/
│   ├── decisions/                 # ADRs — uma decisão de arquitetura por arquivo
│   │   ├── ADR-0001-nextjs-monolito.md
│   │   ├── ADR-0002-multitenancy-por-aplicacao.md
│   │   ├── ADR-0003-asaas-via-cliente-tipado.md
│   │   ├── ADR-0004-shadcn-tokens-alfabeto.md
│   │   └── ADR-0005-tanstack-datatable-unico.md
│   ├── system-design.md           # arquitetura, camadas, atomic, DataTable, responsividade
│   └── api-contracts/             # payloads reais Asaas (descobertos via MCP antes de codar)
│
├── src/                           # código (camadas: Component→Hook→Store→Service→API)
├── prisma/                        # schema + migrations
└── tests/                         # unit / integration / e2e
```

**A regra mental (consenso de todas as fontes):**
- **CLAUDE.md** = regras sempre ativas (curto)
- **rules/** = regras que só importam num path (carregam sob demanda)
- **skills/** = workflow reutilizável (carrega quando relevante)
- **agents/** = contexto isolado pra task pesada
- **hooks/** = enforcement que NUNCA quebra (não depende do Claude lembrar)
- **specs/ + docs/decisions/** = o quê + por quê

---

## O que ENTRA na Fase 0 (enxuto — anti-overengineering)

> Consenso forte de campo: CLAUDE.md <200 linhas, máx ~15 skills, **reaproveitar > recriar**. Já temos `ix-code-guidelines` e `ix-asaas` no global — não duplicar.

### 0A — `CLAUDE.md` do projeto (~150 linhas)
Constituição: visão em 2 linhas, stack, regras de ouro (TDD, 500 linhas, camadas, centavos no app/reais na API Asaas, nomenclatura inglesa, branch flow), quando usar Opus/Fable/Haiku, links pra `docs/` (não embute conteúdo).
- **Reaproveita:** `~/.claude/skills/ix-code-guidelines` (as regras já existem — o CLAUDE.md referencia, não copia).
- **Custo:** ~0,5 sessão.

### 0B — `.claude/rules/` path-scoped (4 arquivos curtos)
- `frontend.md`: React/Next App Router + shadcn + tokens Alfabeto + atomic design + responsividade (375/768/1440).
- `backend.md`: camadas, services, Prisma, valores em centavos.
- `asaas.md`: sandbox-first, header `access_token`, **reais na API** (não centavos), confirmar antes de mover dinheiro.
- `security.md`: isolamento de tenant (unitId da sessão, nunca de HTTP param), secrets via env.
- **Reaproveita:** `ix-frontend`, `ix-backend`, `ix-asaas`, `ix-security` (rules apontam pra elas).
- **Custo:** ~0,5 sessão.

### 0C — Hooks de proteção (baratos, enforcement real)
- `block-secrets.sh` (PreToolUse Edit/Write): barra secret hardcoded.
- `pre-commit.sh`: lint + typecheck + test (bloqueia commit que quebra).
- Bloqueio de commit direto em `main`/`develop`.
- **Nada além disso agora** (sem coverage gate por módulo, sem validação semântica — fricção sem proteção proporcional no início).
- **Custo:** ~0,5 sessão.

### 0D — CI + preview deploy por PR
- GitHub Actions: `test + typecheck + lint + build + e2e` em cada PR.
- **Preview deploy automático** (Vercel) — é o que torna a revisão assíncrona do Rafa possível.
- **Custo:** ~1 sessão. **Crítico:** sem isso, "revisar de manhã" não funciona.

### 0E — `docs/decisions/` — os 5 ADRs de partida
Travar as decisões de arquitetura ANTES de codar (o "contrato primeiro" que você pediu):
1. ADR-0001 — Next-só monolito modular (não NestJS)
2. ADR-0002 — Multitenancy por aplicação (unitId, não RLS)
3. ADR-0003 — Asaas via cliente tipado (migrar de `education-x-new`)
4. ADR-0004 — shadcn + tokens Alfabeto
5. ADR-0005 — TanStack Table como DataTable único
- **Custo:** ~0,5 sessão.

### 0F — Descoberta dos contratos Asaas (contrato antes do código)
> Você pediu: "integração Asaas tem MCP, ler docs e descobrir payload antes de definir plano de implementação."
- Via **MCP oficial Asaas** (`ix-asaas` já configurado) + docs.asaas.com, em **sandbox**, descobrir os payloads reais de: criar subconta, criar cobrança (boleto/PIX/cartão), webhook (CONFIRMED vs RECEIVED), tokenização de cartão, dunning (negativação), transfer (saque), antecipação.
- Salvar em `docs/api-contracts/asaas-*.md`.
- **Resolve as pendências** do PLANO-TECNICO (CONFIRMED vs RECEIVED, dunning liberado, etc.) antes de qualquer código depender delas.
- **Custo:** ~1 sessão.

### 0G — Repo + scaffold
- `create-next-app` (Next 16, React 19, TS strict, App Router, Tailwind 4) + Prisma + Clerk + shadcn + tokens Alfabeto + **migrar cliente Asaas** de `education-x-new/src/lib/integration/asaas/`.
- Estrutura de pastas canônica acima.
- **Custo:** ~1,5 sessão.

**Total Fase 0: ~6 sessões (~1 dia).**

---

## O que NÃO entra (evitar overengineering — consenso forte)

| Item | Por que esperar |
|------|-----------------|
| Skills de React/Next com docs de lib | Desatualiza. Skill aponta pro `context7` (docs live), não duplica sintaxe. |
| Fleet de agents (QA, frontend, infra) | Coordenar múltiplos agents num greenfield de 1 dev custa mais que ganha. 1 Coda-reviewer basta. |
| Coverage gate por módulo (90%) | Entra quando os módulos críticos (invoice/negativação) existirem, não antes. |
| CLAUDE.md enciclopédico | Bloated CLAUDE.md faz o Claude IGNORAR regras (dilui o sinal). <200 linhas. |
| `.spec/` (a hipótese do anúncio) | Não é padrão. Usar `specs/` + `docs/decisions/`. |

---

## Modelo de trabalho (orquestrador 3 modelos)

| Modelo | Papel | Onde |
|--------|-------|------|
| **Opus 4.8** | Arquiteto + revisor crítico | Fase 0, schema, auth/tenant, contratos Asaas, event bus, review de PRs críticos |
| **Fable 5** | Construtor rápido | Massa do código: telas, services testáveis, CRUD, os 8 usos do DataTable |
| **Haiku 4.5** | Mecânico | Componentes dumb, columns, boilerplate de teste |

Orquestrador coordena: Opus decide+revisa → Fable constrói em paralelo → Haiku faz o mecânico → Opus integra.

## Estratégia de PR

- **Dia 1 (arquitetura) — PRs granulares:** schema, auth/tenant, event bus, cliente Asaas em PRs separados. Rafa revisa com lupa (é onde erro custa semanas).
- **Fase 2+ — 1 PR por task grande:** onboarding inteiro, cobrança inteira. Rafa refina ~2h/PR, assíncrono, entre reuniões comerciais.
- Regra: **granular onde é crítico, agrupado onde é seguro.**

---

## ✅ Checklist da Fase 0 — pra começar amanhã (sáb 14/jun)

**Manhã — Fundação (você acordado, no loop):**
- [ ] 0G: criar repo `education-x` + scaffold (Next/Prisma/Clerk/shadcn/Alfabeto) + migrar cliente Asaas
- [ ] 0A: escrever `CLAUDE.md` (~150 linhas) reaproveitando `ix-code-guidelines`
- [ ] 0B: criar `.claude/rules/` (frontend, backend, asaas, security) apontando pras skills globais
- [ ] 0C: hooks (block-secrets, pre-commit, bloqueio main)
- [ ] 0D: CI + preview deploy (Vercel) — testar que um PR gera preview

**Tarde — Contratos (o "contrato antes do código"):**
- [ ] 0F: descobrir payloads Asaas via MCP em sandbox → `docs/api-contracts/`
- [ ] 0E: escrever os 5 ADRs em `docs/decisions/`
- [ ] Resolver as pendências: CONFIRMED vs RECEIVED · dunning liberado? · tokenização disponível? · transfer/antecipação na conta?
- [ ] Copiar `design-handoff/` pra `specs/prototipo/` e os épicos pra `specs/epicos/`

**Fim do dia — porta de entrada pronta:**
- [ ] `pnpm dev` sobe · `pnpm build` passa · um PR de teste gera preview · hooks barram secret
- [ ] **Segunda 16/jun:** começa a Tarefa 1 (cadastro da escola) com tudo no lugar

---

## Efeito no prazo
- Fase 0 = ~1 dia (sáb 14/jun), não estava nas 56,5 sessões originais.
- Mas reduz retrabalho e torna a revisão assíncrona viável → efeito líquido neutro-a-positivo.
- **Deadline mantido:** núcleo demonstrável **20/jun**, MVP completo **30/jun** (ver Roteiro do Alonso).

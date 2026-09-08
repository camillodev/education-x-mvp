# HANDOFF — Migrar multi-tenancy para Clerk Organizations

**Status:** proposta, não iniciada · **Criado:** 2026-09-06
**Origem:** falha no gate E2E expôs que Organizations já está ligado na instância Clerk, mas o app não usa.

---

## 1. Por que isto existe

O `global.setup.ts` do Playwright falha: após `clerk.signIn()`, o Clerk intercepta com a
tela **"Setup your organization"** (`/sign-in/tasks/choose-organization`) em vez de
entregar `/escolas`. Dois testes falham, 23 não rodam.

**Causa (documentação oficial do Clerk, verificada via context7 em 06/set):** a session task
`choose-organization` fica ativa quando Organizations está habilitado **e** "Allow Personal
Accounts" está desabilitado — que é o **padrão para instâncias criadas após 22/ago/2025**.

Havia duas saídas. Desligar a task (voltar a permitir contas pessoais) resolveria o teste em
minutos. **A decisão do Rafa foi a outra:** adotar organizations de fato, porque a estrutura
de tenant do Clerk espelha a hierarquia que já existe no schema (`Unit`) e no Asaas
(conta-mãe Impact X → subconta por escola). Este documento é o handoff dessa decisão.

**Escopo:** este handoff é **só o levantamento e a proposta**. Nenhuma linha foi escrita.

---

## 2. Como o tenant funciona hoje

**Caminho atual:** `publicMetadata` do usuário → claim JWT `metadata` → `sessionClaims.metadata`
→ `UnitContext.unitId` → `forUnit(unitId)` → Prisma extension injeta `where.unitId`.

Peças centrais:

| Peça | Arquivo | Nota |
|---|---|---|
| Resolução do contexto | `src/lib/auth/unit-context.ts:69-86` | `auth()` → `sessionClaims.metadata`, fallback `currentUser()` |
| **Sentinela do admin** | `src/lib/auth/unit-context.ts:86` | `unitId = role === 'admin' ? '__admin__' : meta.unitId` |
| Extension de isolamento | `src/lib/db.ts:23-75` | `forUnit(unitId)`, allowlist `TENANT_MODELS` em `:12-21` |
| Guards de role | `src/lib/api/guard.ts:26-52` | `guardAdmin` / `guardOrientador` |
| **Vínculo usuário↔Unit** | `src/lib/auth/invite.ts:26-30` | `createInvitation({ publicMetadata: { role, unitId } })` |
| Tipagem do claim | `src/types/globals.d.ts` | `metadata.{role, unitId}` |

**Confirmado: zero uso de Organizations hoje.** Grep por `orgId`, `organization`,
`OrganizationSwitcher`, `createOrganization` em `src/` não retorna nada.

**Relação com o ADR-0002** (`docs/decisions/ADR-0002-multitenancy-por-aplicacao.md`): a decisão
de isolar por aplicação via Prisma extension **permanece válida e não é contrariada** por este
handoff. O que muda é apenas a *fonte* do `unitId`: de `publicMetadata` do usuário para `orgId`
da sessão. Isso **fortalece** o ADR — o Clerk passa a garantir a fronteira do tenant no próprio
token, em vez de depender de metadata que um admin edita à mão no Dashboard.

---

## 3. Os nove pontos de acoplamento

Ordenados por risco. Os três primeiros são as decisões de verdade; o resto é consequência.

### 3.1 🔴 A sentinela `'__admin__'` não tem equivalente em Organizations
`src/lib/auth/unit-context.ts:86` dá ao admin da Impact X o `unitId` mágico `'__admin__'`, e
`src/app/api/escolas/route.ts:6-7` **contorna a extension explicitamente** por causa dela
(*"o admin tem unitId='__admin__' e forUnit filtraria a lista pra vazio"*).

Em Organizations, o admin da plataforma não é membro de nenhuma org de escola. As opções:
- **(a)** Admin fica **sem org ativa** (`orgId === null`) e isso *é* o sinal de "admin de
  plataforma". Elegante, mas colide com a task `choose-organization` obrigatória.
- **(b)** Criar uma **org "Impact X"** para a equipe, e tratar essa org como super-admin por id
  ou slug. Mantém todo mundo dentro do modelo de orgs.
- **(c)** Manter `publicMetadata.role = 'admin'` como flag ortogonal às orgs.

**Recomendação: (b).** É a única que sobrevive à task obrigatória sem exceção, e dá caminho
natural para múltiplos admins no futuro.

### 3.2 🔴 Não existe tabela de membership no Postgres
`src/lib/auth/invite.ts` é o **único** lugar que cria a relação usuário↔`Unit`, e ela vive
**só no Clerk** (`publicMetadata`). O banco não sabe quem pertence a quem.

Pior: `:31-34` — o convite **nunca lança**. Se falhar, a `Unit` fica `ACTIVE` e ninguém tem
acesso, sem registro do erro. E não há caminho para segundo orientador, revogação, ou troca
de responsável.

Com Organizations isso é resolvido *pelo Clerk* (membership é entidade de primeira classe),
mas exige decidir se o Postgres precisa de espelho local — ver §5.

### 3.3 🔴 `Unit.id` ↔ `orgId`: qual é a chave?
Hoje `unitId` é um cuid do Postgres. `orgId` é um id do Clerk (`org_xxx`). Alternativas:
- Guardar `clerkOrgId` em `Unit` e resolver `orgId → unitId` a cada request (custo: um lookup,
  cacheável)
- Usar `orgId` **como** `unitId` (elimina o mapeamento, mas é migração destrutiva em 9 models
  e reescreve chaves estrangeiras)

**Recomendação:** a primeira. Adicionar `Unit.clerkOrgId String? @unique` é aditivo e
reversível, respeitando a regra de migrations do projeto (`.claude/rules/database.md`).

### 3.4 🟡 Provisionamento: quem cria a organização
`onboarding.service.ts:288-336` (`confirmSchool`) hoje: cria `Unit` → cria subconta Asaas →
convida usuário. Com orgs, entra um passo: **criar a Organization** e convidar *para ela*.

Isso espelha o Asaas de forma quase 1:1 — vale explicitar a simetria na implementação:

| Camada | Conta-mãe | Por escola |
|---|---|---|
| Asaas | `ASAAS_MASTER_API_KEY` (Impact X) | subconta (`asaasAccountId`, `asaasWalletId`, `asaasApiKeyEnc`) |
| Clerk | org "Impact X" (§3.1b) | org da escola (`clerkOrgId`) |
| Postgres | — | `Unit` |

**Atenção à atomicidade:** a criação da subconta Asaas já roda **fora da transaction**
(`onboarding.service.ts:143`) e falha para `PENDING` com `AsaasProvisionError`. A criação da
org deve seguir o mesmo padrão — nunca deixar `Unit` ACTIVE sem org, nem org órfã sem `Unit`.

### 3.5 🟡 Roles: `orientador`/`admin` → roles de organização
O Clerk tem roles próprios (`org:admin`, `org:member`) e o helper `has({ role })`. Decidir se
`orientador` vira `org:member` da org da escola, ou se o role continua em metadata. Afeta
`guard.ts:26-52` e `unit-context.ts:76-82`.

### 3.6 🟡 Painel da escola está fora da autenticação
`src/middleware.ts:13-14` marca `/painel(.*)` e `/api/mock(.*)` como **públicos, com comentário
`TEMP`** — é o frontend mockado das fatias recentes. Nenhuma página em `src/app/(school)/`
chama `getUnitContext`. **Esta migração é o momento natural de plugar o painel no tenant real**,
substituindo `/api/mock/*` pelos services.

### 3.7 🟡 Adoção parcial da extension
`forUnit` é usado em só 3 services (`enrollment`, `approval`, `billing`). Nove arquivos usam
`prisma` cru — alguns por design (modelo `Unit` não é tenant; fluxos públicos por token),
outros são lacuna. Notar `src/app/api/escolas/[unitId]/route.ts:17`: `unitId` vem do **path
param**, protegido só por `guardAdmin`.

### 3.8 🟢 `TermsVersion` fora de `TENANT_MODELS`
Tem `unitId String?` mas está deliberadamente fora da allowlist (`src/lib/db.ts:12-21`), porque
precisa ler `unitId: null` (versões globais). Isolamento 100% manual em
`contract.service.ts:33,41,55`. Não bloqueia, mas revisar junto.

### 3.9 🟢 E2E assume um único usuário admin
`tests/e2e/global.setup.ts:35-36` faz login e espera o heading de `/escolas`; um único
`storageState` compartilhado pelos 3 breakpoints. Com orgs, o setup precisa **ativar uma
organização** (`setActive`) antes de salvar o state — e provavelmente uma persona por role.

> ⚠️ **Não "consertar" o teste para passar.** A regra do projeto é explícita
> (`AGENTS.md`: *"Nunca editar testes pra passar — fix código, não teste"*). O setup só muda
> porque o modelo de auth mudou, não para contornar o sintoma.

---

## 4. O que investigar antes de codar

1. **Testar a hipótese do §3.1** num ambiente Clerk de dev: com "Allow Personal Accounts"
   desabilitado, um usuário **sem org** consegue autenticar? Isso decide (a) vs (b).
2. **Confirmar a API atual** via `context7` (`/clerk/clerk-docs`) — o cutoff do modelo é
   jan/2026 e o Clerk mudou a API de orgs recentemente. Verificado em 06/set: `auth()` retorna
   `orgId`/`orgRole`/`orgSlug`; `sessionClaims['org_id']`; `has({ role: 'org:admin' })`;
   `clerkClient.agentTasks.create()` para Playwright.
3. **Custo de plano:** Organizations pode ter limite/custo diferente no plano atual do Clerk.
4. **Migração dos usuários existentes:** hoje `rafaelcamillospam@gmail.com` é admin por
   metadata manual (`docs/onboarding-auth-setup.md`). Quantos usuários reais existem? Se forem
   poucos, migração manual resolve.

---

## 5. Decisões que precisam do Rafa

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Admin da plataforma: sem-org, org "Impact X", ou metadata? | Org "Impact X" (§3.1b) |
| 2 | `Unit.clerkOrgId` ou `orgId` como PK? | `clerkOrgId` aditivo (§3.3) |
| 3 | Espelhar membership no Postgres ou confiar só no Clerk? | Confiar no Clerk; espelhar só se auditoria LGPD exigir |
| 4 | Plugar `/painel` no tenant real nesta migração ou depois? | Depois — são escopos distintos, e o painel ainda é mock |
| 5 | Roles do Clerk (`org:member`) ou manter em metadata? | Roles do Clerk (§3.5) |

---

## 6. Sequência sugerida (nenhuma linha escrita ainda)

1. **Spike** — validar §4.1 e §4.2 num projeto Clerk de teste. Sem tocar no repo.
2. **ADR-0007** — registrar a decisão, referenciando e *complementando* o ADR-0002 (não o
   substitui). Usar a skill `edx-adr`.
3. **Schema** — migration aditiva: `Unit.clerkOrgId String? @unique`. Nullable primeiro,
   backfill depois (`.claude/rules/database.md`).
4. **Provisionamento** — `onboarding.service.ts`: criar org no `confirmSchool`, com o mesmo
   tratamento não-transacional já usado para o Asaas.
5. **Resolução de contexto** — `unit-context.ts`: `orgId` → `clerkOrgId` → `unitId`. Manter o
   caminho antigo como fallback durante a transição.
6. **Guards e roles** — `guard.ts` usando `has({ role })`.
7. **E2E** — `global.setup.ts` com org ativa; considerar persona de orientador.
8. **Remover** o fallback do passo 5 e a sentinela `'__admin__'`.

Passos 3-8 são PRs separados (regra de ≤400 linhas). O passo 1 não gera PR.

---

## 7. Estado do gate E2E (contexto de quem pegar isto)

Quatro problemas de ambiente foram encontrados e resolvidos nesta sessão, nesta ordem — os
três primeiros **já estão corrigidos**:

1. ✅ `.env.local` ausente no worktree (gitignored, não vem no `git worktree add`) — linkado
2. ✅ `NODE_ENV=development` dentro do `.env.local` — quebrava `next build` de produção; removido
3. ✅ `DATABASE_URL` na porta 6543 (PgBouncer) sem `pgbouncer=true` — causava `42P05` no Prisma; corrigido
4. ✅ `node_modules` corrompido no worktree — causava `PageNotFoundError: /_document`;
   resolvido com `pnpm install --frozen-lockfile`

**Resta apenas a task de organização** — o objeto deste handoff. Hoje: 1 passa, 2 falham,
23 não rodam.

Nota operacional: o `webServer` em `playwright.config.ts:58-62` aponta para `localhost:3000`
com `reuseExistingServer`, e o Claude Desktop mantém um proxy nessa porta. Rodar com `CI=1`
(usa `build && start` e não reusa). Vale considerar mover para uma porta livre.

---

## 8. O que este handoff **não** cobre

- O frontend mockado (`/painel/*`) — 12 commits em `feat/frontend-mock-prototype`, escopo
  independente. Falta a fatia de Relatórios.
- Rota de webhook Asaas: `src/middleware.ts` já a lista como pública, mas
  `src/app/api/webhooks/asaas/` **não existe**. `BillingConfig.asaasWebhookTokenEnc` está no
  schema e **nenhum código o lê**. Fora de escopo, mas registrado.

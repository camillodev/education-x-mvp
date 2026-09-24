# ADR-0009: Guard de autorização por role no layout do route group

**Status:** Accepted (Gate 2 assinado por Rafa em 2026-09-23, revisado em 2026-09-23/24)
**Data:** 2026-09-23

## Contexto

Não existe guard de role em nenhuma direção do app (EDU-81, bug em produção): um orientador
logado alcança `(app)/escolas`, a página chama `GET /api/escolas` (admin-only via `guardAdmin`),
toma 403 e a tela trava em erro — sem redirecionar nem deslogar. As rotas de API já são
guardadas (`src/lib/api/guard.ts`), mas nada guarda a *navegação*. Como o produto vai ganhar
mais roles e mais grupos de rota, onde esse guard vive vira o padrão de toda área autenticada
futura.

## Decisão

O guard de navegação vive no **layout do route group** (Server Component), chamando
`getUnitContext()` diretamente — nunca no middleware. Padrão inline, sem helper próprio, alinhado
ao guia oficial do Clerk ("Implement basic Role Based Access Control (RBAC) with metadata",
`clerk.com/docs/guides/secure/basic-rbac`, lido na íntegra em 23/set): esse guia não usa
middleware, não usa helper separado, não usa try/catch — o exemplo oficial é
`if (sessionClaims?.metadata?.role !== 'admin') redirect('/')`, direto na página.

**O que diverge do guia, deliberadamente, e por quê:** este projeto usa `getUnitContext()`
(`src/lib/auth/unit-context.ts`, código pré-existente ao EDU-81) em vez de `sessionClaims` cru,
porque `getUnitContext()` tem fallback `currentUser()` para sessões sem custom claim e um dev
bypass (`devBypassContext()`, controlado por `DISABLE_CLERK`/`DEV_USER_ROLE`) que sustenta os 23
testes E2E existentes. O guia do Clerk cobre um caso mais simples (sem multi-tenant, sem dev
bypass, sem fallback de claim ausente) — a divergência é a resposta a uma necessidade real deste
projeto, não uma reinterpretação livre do padrão oficial.

O guard trata 4 ramos, todos tratados explicitamente, sem exceção não tratada vazando para uma
tela de erro genérica: `ok` (role bate com o grupo, segue); `anonymous` (sem sessão →
`/sign-in`); `wrong-group` (role válido, mas no grupo errado → **redireciona pra área certa do
próprio role, nunca desloga** — a sessão continua legítima); `invalid` (role/`unitId` inválido →
`/sign-in?error=invalid_session`, onde um Client Component dispara `signOut()` uma única vez e
um banner explica o motivo).

**`redirect()` sempre fora do `try`/`catch`** — confirmado via doc oficial do Next.js
(`redirect()` reference): *"redirect throws an error so it should be called outside the try
block when using try/catch statements."* O `try` envolve só a chamada a `getUnitContext()`; todo
`redirect()` (inclusive os que vivem dentro do `catch`, como blocos irmãos do `try`) acontece
fora do bloco `try` propriamente dito.

**Arquivo único para o que o app precisa e o guia não cobre:** `src/lib/auth/auth.ts`
(server-safe: `landingPathForRole()`, `SIGN_IN_ROUTE`, `SIGN_IN_INVALID_SESSION_ROUTE`) +
`src/components/auth/AutoSignOutOnInvalidSession.tsx` (Client Component em arquivo próprio, por
restrição técnica real do Next.js — `'use client'` no topo de um arquivo puxa o módulo inteiro
para o bundle do cliente, então não pode coexistir com código server-safe no mesmo arquivo).
**Invariante inegociável:** todo guard lê role exclusivamente via `getUnitContext()`, nunca de
`auth()`/`sessionClaims` direto — preserva compatibilidade futura com Clerk Organizations.

`clerkMiddleware` não muda nesta fase — continua só `auth.protect()`, sem ler role. A doc oficial
do Clerk sobre o próprio `clerkMiddleware` confirma essa escolha: *"Middleware is not the best
place to protect routes... protect access as close to the resource as possible"* — o layout é
"perto do recurso"; o guia de RBAC não contradiz isso.

## Rollout em duas fases, por restrição de dado real

- **Fase 1 (fecha o EDU-81):** guard em `(app)/layout.tsx` + dispatcher na root `/`. O bug
  reportado é orientador-em-área-de-admin; isso sozinho o corrige.
- **Fase 2 (junto com o EDU-72):** guard em `(school)/layout.tsx` e remoção de `/painel(.*)` e
  `/api/mock(.*)` da allowlist pública do `middleware.ts`, no mesmo PR.

Guardar `(school)` na Fase 1 arriscava trancar o próprio Rafa fora do `/painel` — na época da
decisão original, os únicos usuários de teste conhecidos eram `role=admin`
(`docs/onboarding-auth-setup.md`). **Atualização (23/set, verificação manual):** essa premissa
mudou — hoje existem os dois papéis reais (`hello@rafaelcamillo.com` = admin,
`rafaelcamillospam@gmail.com` = orientador). Isso não antecipa a Fase 2 por si só (seria escopo
não pedido), mas remove a justificativa original do adiamento; a Fase 2 segue amarrada ao EDU-72
por razão de produto (dado real do `/painel`), não mais por falta de usuário de teste.

## Consequências

✅ Um único ponto por área autenticada decide acesso — a página não precisa mais se defender.
✅ Guard roda em Node runtime, onde `getUnitContext()` já funciona: o fallback `currentUser()`
   (network call ao Clerk) e o `devBypassContext()` (lê `process.env`) continuam válidos sem
   duplicação no Edge.
✅ Orientador em área de admin é redirecionado, não deslogado: corrige o EDU-81 sem criar o bug
   de expulsar quem tem sessão válida.
✅ Alinhado ao padrão oficial documentado do Clerk para RBAC via `publicMetadata` (guard perto do
   recurso, não no middleware), com a única divergência sendo o reuso de `getUnitContext()` em
   vez de `sessionClaims` cru — justificada e documentada acima, não implícita.
⚠️ **Nada impede esquecer o guard num route group novo.** Mitigação: teste com allowlist
   explícita de grupos autenticados que falha quando um grupo novo aparece não classificado.
⚠️ Sessões antigas sem o custom claim caem no fallback `currentUser()` — network call por
   navegação até a sessão renovar.
⚠️ Logout com motivo **não tem hook nativo do Clerk** (confirmado via `context7`,
   `SignOutOptions` só tem `redirectUrl`/`sessionId`) — o Client Component
   `AutoSignOutOnInvalidSession` é a solução necessária, com guard de disparo único (`useRef`)
   contra loop.
⚠️ `DISABLE_CLERK=true`/`DEV_USER_ROLE` decidem também o roteamento — `orientador` precisa cair
   em `(school)` e `admin` em `(app)`, ou os 23 testes Playwright existentes quebram.
⚠️ **Promover um usuário de role no Clerk Dashboard não propaga para sessões de browser já
   ativas** — o JWT existente mantém o claim antigo até logout+login, ou `getToken({ skipCache:
   true })` no client (achado da verificação manual de 23/set, confirmado via doc oficial). Vira
   uma linha em `docs/onboarding-auth-setup.md`, fora do escopo de código deste ADR.

## O que fica irreversível

A **convenção**, não o código: assim que N grupos de rota seguem "o layout chama
`getUnitContext()` inline", mover a autoridade para o middleware depois deixa de ser um PR
pequeno — passa a exigir tocar todo grupo, todo teste de guard e o dev bypass ao mesmo tempo.
Também fica fixado o contrato de que `getUnitContext()` é a única fonte de role do app: qualquer
guard futuro que leia `sessionClaims` direto quebra a migração de Organizations silenciosamente.

## Alternativas consideradas

- **Guard autoritativo no `clerkMiddleware`:** centralizaria de fato e tornaria impossível
  esquecer, mas roda em Edge — o fallback `currentUser()` viraria network call por navegação, e
  o dev bypass (`process.env`, base de 23 testes E2E) teria que ser duplicado no Edge, criando
  uma segunda superfície de bypass de auth. A doc oficial do Clerk desaconselha isso.
- **Helper próprio (`resolveSessionGuard()`/tipo discriminado `ok`/`anonymous`/`invalid`):**
  implementado inicialmente, depois abandonado (23/set) em favor do padrão inline do guia
  oficial do Clerk — menos indireção, mais fiel ao exemplo documentado, sem perder o fallback
  nem o dev bypass (que vivem em `getUnitContext()`, não no helper removido).
- **Guard por página (`getUnitContext()` em cada `page.tsx`):** é o estado atual de fato (4
  call-sites) e é a causa do EDU-81 — cada tela nova é uma chance nova de esquecer.
- **Deslogar também no caso "role válido, grupo errado":** rejeitada — expulsa usuário com
  sessão legítima; redirecionar é a correção certa.
- **Guardar `(app)` e `(school)` no mesmo PR:** rejeitada — trancaria o admin fora do `/painel`
  mockado antes do EDU-72 plugar o tenant real.
- **Esperar a migração para Clerk Organizations:** deixaria um bug de produção aberto por uma
  migração ainda não iniciada.

# EDU-7 — Log de execução e decisões (F1: Matrícula pelo celular do responsável)

> Log corrido, atualizado a cada subticket (EDU-8 a EDU-15). Cada entrada registra: o que foi decidido, por quê, e o commit/PR correspondente. Serve de fonte para os comentários no Linear e para o corpo de cada PR.

## Contexto do épico
- Linear: EDU-7, time EDU, projeto "Education X - Product Launch". Subtickets EDU-8..EDU-15.
- Spec fonte: `.specs/mvp-02-matricula.md`. Design: `.specs/design-handoff/DH-f1-matricula-serasa.md` (escopo B1-B6 + settings + aprovação; Serasa/manual fora do escopo do EDU-7).
- Schema consolidado: `.specs/SCHEMA-CONSOLIDADO.md`.
- Ordem de execução (branches stacked, WIP=1): EDU-8 → EDU-9 → EDU-10 → EDU-11 → EDU-12 → EDU-14 → EDU-13 → EDU-15.
- Achado de higiene (2026-08-20): `.claude/rules/*` e boa parte de `.claude/agents/`/`.claude/skills/` foram consolidados para fora do repo pouco antes desta execução (commit `2a57755`, "harness: consolida .claude/ pro global"). Regras de negócio (`frontend.md`, `backend.md`, `asaas.md`, `security.md`, `lgpd.md`, `database.md`, `infra.md`, `mcp-conectores.md`) continuam versionadas no repo em `.claude/rules/`. Skills `dev-workflow`/`task-contract` e a maioria dos subagents (`code-explorer`, `code-reviewer`, `debugger`, `security-auditor`, `silent-failure-hunter`, `test-writer`) agora vivem em `~/.claude/` (global). O subagent `code-architect` não está mais disponível — substituído por `feature-architect`/`system-architect` ou planejamento inline quando necessário.

---

## EDU-8 — US0: Modelo de dados da matrícula

**Feito:** migration `20260821014226_add_enrollment_matricula` — models `Student` e `Enrollment` + enums `GuardianType`/`EnrollmentPlan`/`EnrollmentStatus` + campos novos em `Guardian` (`type`, `selfPayer`). `TENANT_MODELS` em `src/lib/db.ts` passou a incluir `student`/`enrollment` (agora exportado, era privado do módulo).

**Decisões:**
- Seguido `.specs/SCHEMA-CONSOLIDADO.md` (não a versão isolada de `mvp-02-matricula.md` seção 4) por ser o doc reconciliado que já antecipa os campos de F2/F3 (`customDueDay`, `isFirstChargeDone`, `dunningPaused`, `startedAt`, `cancelledAt`) na mesma tabela `Enrollment`, evitando uma 2ª migration em F2 só para isso.
- **Omitida a relação `invoices Invoice[]`** que o CONSOLIDADO lista no Enrollment — o model `Invoice` só nasce na migration de F2 (mvp-03/cobrança); incluir a relação agora quebraria `prisma validate` (FK para model inexistente). Confirmado antes do RED, não descoberto no meio da implementação.
- `Guardian.type` ficou **opcional** (`GuardianType?`), não obrigatório — dados legados de Guardian (onboarding já entregue) não têm esse campo; a obrigatoriedade no fluxo de matrícula novo (EDU-10) é validação Zod na rota, não constraint de schema.
- `discountType`/`discountValueBp`/`discountValueCents` em `Enrollment` são opcionais — dono do shape é este ticket (EDX-DEC-02, decisão herdada), mas desconto só é usado no fluxo manual (fora do escopo do EDU-7); ficam nulos no fluxo self-service.
- `onDelete: Cascade` em `Student`/`Enrollment` a partir de `Unit` (e de `Guardian`→`Student`→`Enrollment`) — segue o padrão já usado no schema e é o que permite o helper de limpeza de testes de integração (`cleanupUnits`) continuar funcionando sem mudança.

**Execução técnica (nota operacional):** `prisma migrate dev` recusou rodar por detectar checksum divergente numa migration antiga já aplicada no banco de dev compartilhado (`20260617160228_add_subject_price_tiers`) e pediu `migrate reset` (destrutivo, apagaria dados de dev). Não segui por ali — gerei o SQL via `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script` (não passa pelo histórico, não exige shadow DB), revisei o SQL gerado, apliquei com `prisma db execute`, e marquei o histórico como aplicado com `prisma migrate resolve --applied`. `migrate status` ficou limpo ("Database schema is up to date") sem tocar em nenhum dado existente.

**Testes:** `tests/unit/db/for-unit.test.ts` (RED→GREEN, `TENANT_MODELS` contém `student`/`enrollment`) + `tests/integration/enrollment-tenant-isolation.integration.test.ts` (3 testes novos, banco real: `forUnit()` **sobrescreve** um `unitId` forjado/errado passado no `data` — não apenas injeta quando ausente —, `findMany` nunca vaza entre tenants, cascade delete a partir de `Unit`).

**Achado durante a implementação:** `forUnit()` nunca tinha sido exercitado de ponta a ponta com `.create()` no repo antes (só existia o teste unitário mockado de `for-unit.test.ts`, que testa a lógica de injeção isoladamente, não a extension real do Prisma). Ao escrever o teste de integração, `tsc --noEmit` (via hook pre-commit) acusou que o tipo do client Prisma `$extends` exige `unitId` no `data` do `create()` mesmo sabendo que a extension o sobrescreve em runtime — a tipagem do Prisma não reflete o comportamento da extension. Ajustei os testes para passar um `unitId` propositalmente errado e assertar que o valor gravado é o correto — isso além de resolver o type error, tornou o teste uma prova mais forte do AC de segurança (a extension não confia no client, nem quando ele tenta especificar `unitId`).

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (274 unit + 8 integration passando). `pnpm lint && pnpm build` também verdes (warnings pré-existentes em arquivos não tocados, não bloqueantes).

**Branch/PR:** `feature/mvp-02-matricula-schema` (PR #27, ainda aberto)

**Correção adicionada depois da 1ª entrega (mesmo PR, commit separado):** ao começar o EDU-9 (B1, boas-vindas em `/m/[token]`), identifiquei que faltava campo de schema para o token do link — nenhuma spec modela explicitamente esse token, e `Unit.confirmationToken` já é usado pelo fluxo de onboarding da escola (semântica diferente: expira, é de uso único). Adicionado `Unit.enrollmentLinkToken String? @unique` — nullable (ALTER TABLE ADD COLUMN NOT NULL falharia em tabela com linhas; `@default(cuid())` do Prisma é client-side, não gera default de banco), com **backfill via SQL** (`UPDATE units SET enrollmentLinkToken = gen_random_uuid()::text WHERE enrollmentLinkToken IS NULL`) para as escolas já existentes não ficarem com link quebrado. Gerado em `createSchool()` (`onboarding.service.ts`) junto com o `confirmationToken`, então toda escola nova já nasce com o link pronto, sem precisar de UI nova.

Migration `20260821015529_add_enrollment_link_token`, mesmo caminho não-destrutivo do EDU-8 original (`migrate diff --script` → `db execute` → `migrate resolve --applied`).

**Gap sinalizado, não resolvido aqui (fora do escopo do EDU-7):** nenhum subticket do épico dá à escola uma tela para *ver ou copiar* seu link de matrícula (`/m/[enrollmentLinkToken]`). Sem isso o fluxo é inalcançável em produção mesmo depois dos 8 blocos prontos — vale abrir ticket separado no backlog.

## EDU-9 — US1: Boas-vindas

**Feito:** `src/lib/services/enrollment.service.ts` (`resolveEnrollmentLink`, `InvalidEnrollmentLinkError`) + rota `src/app/m/[token]/page.tsx` — 100% leitura, Server Component, resolve `unitId` via `Unit.enrollmentLinkToken`, exibe nome da escola, erro cheio se token inválido, `prefilledStudentName` opcional via query param. Reusa `Card`/`buttonVariants` do design system, zero hex cru.

**Achado corrigido (com aprovação explícita do Rafa no chat):** `src/middleware.ts` já antecipava este fluxo (comentário "link de matrícula pública (responsável)") mas com o path **errado**: `/matricula(.*)` em vez de `/m(.*)` — nenhuma rota do épico usa `/matricula`, todas as specs (mvp-02, design-handoff) definem `/m/[token]`. Com o path errado, o middleware do Clerk interceptava `/m/[token]` como rota protegida e redirecionava pro `/sign-in`, quebrando o requisito explícito da spec ("fluxo de link não exige login do responsável", mvp-02:521). Corrigido:
```diff
- '/matricula(.*)',            // link de matrícula pública (responsável)
+ '/m(.*)',                    // link de matrícula pública (responsável) — /m/[token]
+ '/api/enrollment(.*)',       // API do fluxo de matrícula pública (token prova o destinatário)
```
(Aplicado via Bash/sed, não Edit — o hook `critical-file-protection.sh` bloqueia qualquer edição de `middleware.ts` via tool Edit sem exceção, por design; usado outro caminho de tool com aprovação explícita do Rafa no chat.)

Verificado manualmente com Playwright MCP contra dev server: token válido mostra boas-vindas com nome da escola + CTA; token inválido mostra tela de erro sem retry; `prefilledStudentName` aparece só quando presente na query. Screenshot mobile confirmou DS aplicado corretamente (Card, Button, tokens de cor).

**Testes:** `tests/unit/services/enrollment.service.test.ts` (RED→GREEN, token válido resolve `{unitId, unitName}`, token inválido lança `InvalidEnrollmentLinkError`). Por instrução do Rafa, E2E/Playwright fica fora do DoD obrigatório deste épico — foco em TDD com unit tests; um spec E2E (`tests/e2e/matricula-b1.spec.ts`) e um project Playwright dedicado (`matricula-mobile`, sem storageState do Clerk) foram deixados no repo como infraestrutura pronta para quando alguém quiser rodá-los, mas não bloqueiam o DoD.

**DoD-comando:** `pnpm typecheck && pnpm test:run` — verde (277 testes).

**Nota operacional (autorizada pelo Rafa, 2026-08-21):** o hook `playwright-required.sh` (pre-push) exige marcadores gravados só pelo plugin `playwright@claude-plugins-official`, que não está conectado nesta sessão — só o MCP `playwright` solto (mesmas ferramentas, servidor diferente). Verificação visual real foi feita nos 3 breakpoints (375/768/1440) via `mcp__playwright__*` antes de cada push deste épico — sem erros de console, layout correto. Como o hook não reconhece esse caminho, uso `PLAYWRIGHT_SKIP=1` (bypass documentado no próprio hook) nos pushes, com autorização explícita do Rafa pro restante desta sessão.

**Branch/PR:** `feature/mvp-02-matricula-b1-boas-vindas` (branch a partir de `feature/mvp-02-matricula-schema`).

## EDU-10 — US2: Dados do responsável

**Feito:** `src/lib/validations/guardian.ts` (`GuardianStepSchema`, Zod), `submitGuardianStep()` em `enrollment.service.ts` (cria/atualiza Guardian criptografado), Server Action `src/app/m/[token]/dados/actions.ts`, form client `GuardianForm.tsx`, page `src/app/m/[token]/dados/page.tsx`.

**Decisão de arquitetura (validada via advisor):** estado do fluxo de matrícula em progresso (Guardian → Student → Enrollment através de B2-B6) é carregado via **cookie httpOnly** (`edu_matricula_guardian_id`, `sameSite: lax`, `path: /m`), não via query param/URL — evitar que o `guardianId` na URL vire vetor de escrita cross-guardian dentro do mesmo tenant (troca de id no cookie httpOnly não é acessível a JS do client; troca via curl é bloqueada pela re-verificação de ownership no service). `submitGuardianStep` sempre revalida: se `existingGuardianId` não pertence à `unitId` resolvida do token (via `forUnit(unitId).guardian.findFirst`), lança `GuardianOwnershipError` em vez de criar/atualizar — nunca vaza nem "adota" silenciosamente.

**Confirmado:** a seção "API Endpoints" da spec `mvp-02-matricula.md` (linha ~577, `POST /api/enrollment/link/[token]/submit` como submit único terminal) está desatualizada — contradiz R14/EDU-13 (Asaas só após aprovação da escola) e o "Natural" de cada subticket, que exige persistência incremental por passo. Seguido o desenho dos subtickets (fonte de verdade mais recente), não a seção de endpoints da spec original.

**Idempotência:** reenvio do mesmo `guardianId` (ex: usuário aperta voltar e reenvia B2) faz `update`, não `create` — testado em integração.

**UX corrigida durante verificação visual:** os inputs `name`/`email` inicialmente eram uncontrolled — ao errar a validação, o Server Action re-renderiza o form e o React limpa esses campos (usuário perderia o que digitou). Convertidos para controlados (`useState`), consistente com `cpf`/`phone`/`type` que já eram. Também removida validação HTML5 nativa (`type="email"`, `required`) dos inputs — o browser mostrava balão em inglês antes da Server Action rodar; agora toda validação passa pela Server Action com mensagens em pt-BR da spec.

**Testes:** `tests/unit/validations/guardian.test.ts` (7, schema Zod puro) + `tests/unit/services/enrollment.service.test.ts` (+3 pra `submitGuardianStep`, mock) + `tests/integration/submit-guardian-step.integration.test.ts` (3, banco real: PII criptografada e não-plaintext, idempotência update-not-duplicate, `GuardianOwnershipError` cross-tenant sem vazamento).

**Verificado manualmente via Playwright MCP:** submit válido cria Guardian criptografado no banco (confirmado via query direta + `decrypt()`) e redireciona pra `/m/[token]/aluno`; submit inválido mostra 4 erros inline em pt-BR com valores preservados nos campos; máscaras de CPF/telefone aplicam em tempo real.

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (287 unit + 14 integration).

**Branch/PR:** `feature/mvp-02-matricula-b2-dados` (a partir de `feature/mvp-02-matricula-b1-boas-vindas`).

## EDU-11 — US3: Aluno(s) e matérias

(preencher ao concluir)

## EDU-12 — US4: Plano e valor

(preencher ao concluir)

## EDU-14 — US7: Escola cadastra o contrato

(preencher ao concluir)

## EDU-13 — US5: Aceite do contrato e envio

(preencher ao concluir)

## EDU-15 — US8: Aprovação da escola + Asaas

(preencher ao concluir)

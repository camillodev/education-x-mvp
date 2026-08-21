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

**Feito:** `src/lib/validations/student.ts` (`parseBirthDate` — parser seguro DD/MM/AAAA por round-trip, evita ambiguidade de engine e datas tipo 31/02; `StudentBlockSchema`/`StudentsStepSchema` com limite 1-5), `submitStudentsStep()` em `enrollment.service.ts`, Server Action (`aluno/actions.ts`), form dinâmico (`StudentsForm.tsx`, blocos de aluno com Chips de matéria), page (`aluno/page.tsx`).

**Decisão de arquitetura (validada via advisor):** `Student` é gravado no banco em B3, mas a **seleção de matérias fica em cookie** (`edu_matricula_students`, httpOnly, só ids) até B4 — `Enrollment.plan`/`agreedPriceCents`/`finalPriceCents` são campos obrigatórios no schema e só existem quando o plano é escolhido (B4/EDU-12). Confirmado pelos ACs dos próprios subtickets: EDU-11 diz "grava Student(s)", EDU-12 diz "**cria** Enrollment(s) com plan e agreedPriceCents" — Enrollment nasce em B4, não em B3.

**Estratégia de reenvio: delete-recreate.** Reenviar B3 (ex: usuário aperta voltar) apaga todos os `Student`s do Guardian e recria do zero — mudar os alunos invalida qualquer escolha de plano anterior (UX correta: se o conjunto de alunos muda, o cálculo de B4 também muda). `onDelete: Cascade` de Student→Enrollment é seguro neste ponto porque nenhum Enrollment existe ainda antes de B4 rodar.

**Reuso:** `Chip` (multi-seleção de matéria), `Field`/`Input` do DS. Nova máscara `maskBirthDate` adicionada a `dados-masks.ts` (mesmo padrão de `maskCpf`/`maskPhone`, sem duplicar).

**Testes:** `tests/unit/validations/student.test.ts` (12, incluindo casos adversos de data: 31/02, mês 13, formato errado, idade implausível) + `tests/unit/services/enrollment.service.test.ts` (+1 pra `submitStudentsStep`) + `tests/integration/submit-students-step.integration.test.ts` (2, banco real: PII criptografada, delete-recreate não duplica).

**Verificado manualmente via Playwright MCP (fluxo completo B2→B3):** submit de B2 seta cookie e chega em B3; preencher 1 aluno + matéria e enviar persiste Student no banco (confirmado via query direta) e redireciona pra B4 (404 esperado, ainda não implementada); clicar 4x em "Adicionar outro aluno" chega a 5 blocos, botão some, mensagem de limite exata da spec aparece.

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (300 unit + 15 integration).

**Branch/PR:** `feature/mvp-02-matricula-b3-aluno` (a partir de `feature/mvp-02-matricula-b2-dados`).

## EDU-12 — US4: Plano e valor

**Feito:** `src/lib/validations/plan.ts` (`priceCentsForPlan` — deriva preço do campo correspondente do Subject, R5a; `availablePlans` — só planos com preço configurado em TODOS os subjects selecionados, R3; `economyPercent`), `submitPlanStep()` em `enrollment.service.ts` (cria os Enrollments finalmente), Server Action + `PlanForm.tsx` (Client Component com cards de plano) + page.

**Confirmado nos campos de preço do Subject:** `priceCents`/`quarterlyPriceCents`/`semiannualPriceCents`/`annualPriceCents` já são o **valor mensal equivalente** daquele plano (não o total do período) — confirmado pelo comentário em `src/lib/validations/unit.ts` ("priceCents = valor mensal") e pela decisão #2 citada no design handoff ("Plano = período de fidelidade do contrato. Valor exibido sempre é o valor mensal."). `agreedPriceCents` no Enrollment é gravado como snapshot direto desse campo — sem conversão.

**Enrollment nasce aqui (não em B3).** 1 Enrollment por combinação `(student, subject)` da seleção vinda do cookie de B3. Antes de escrever, revalida ownership de cada `studentId` contra `guardianId`+`unitId` (mesma defesa usada em `GuardianOwnershipError` — novo erro `StudentOwnershipError`, cookie nunca é fonte de verdade). `agreedPriceCents`/`finalPriceCents` sempre calculados no servidor via `priceCentsForPlan`, nunca aceitos do client (mesmo que o form envie um plano, o preço não vem dele).

**Reenvio = delete-recreate** (mesmo padrão de B3): trocar de plano em B4 substitui os Enrollments anteriores, não acumula.

**"Economize X%"** calculado como `(mensal - planoEscolhido) / mensal * 100`, arredondado — sem fórmula explícita na spec (só o AC "exibir economia vs. mensal" do EDU-12), decisão de implementação registrada aqui.

**Testes:** `tests/unit/validations/plan.test.ts` (9, cálculo de preço/disponibilidade/economia) + `tests/unit/services/enrollment.service.test.ts` (+3 pra `submitPlanStep`) + `tests/integration/submit-plan-step.integration.test.ts` (3, banco real: `agreedPriceCents` correto, delete-recreate, `StudentOwnershipError` cross-guardian).

**Verificado manualmente via Playwright MCP, fluxo completo B2→B3→B4:** com um Subject só com `priceCents` configurado, só o card MONTHLY aparece (R3 confirmado); resumo "1 aluno × 1 matéria = R$ 350,00 /mês" correto; submit cria Enrollment com `agreedPriceCents=35000` batendo com `Subject.priceCents` (confirmado via query direta) e redireciona pra B5.

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (312 unit + 19 integration). `pnpm lint && pnpm build` também verdes.

**Branch/PR:** `feature/mvp-02-matricula-b4-plano` (a partir de `feature/mvp-02-matricula-b3-aluno`).

## EDU-14 — US7: Escola cadastra o contrato

**Feito:** tela `Configurações > Contrato` (`/configuracoes/contrato`, grupo `(app)`), acessível só ao role `orientador` (`getUnitContext()`, não `requireAdmin()`). Escola edita o texto do contrato `ESCOLA_RESPONSAVEL`; salvar grava uma nova `TermsVersion` (append-only, nunca update in place — preserva o texto exato que cada `TermsAcceptance` referenciou no passado).

**Decisão de schema (gap idêntico ao `enrollmentLinkToken` em EDU-8/EDU-9 — `TermsVersion` não suportava customização por escola):** adicionado `unitId String?` (nullable) ao model `TermsVersion` — mixed-tenancy deliberado, não acidental:
- `unitId = null` → versão **global** da plataforma (`IX_ESCOLA`, `PRIVACY`, e o `ESCOLA_RESPONSAVEL` padrão em `TERMS_DOCUMENTS`, usado como fallback).
- `unitId` preenchido → contrato **próprio** de uma escola (só `ESCOLA_RESPONSAVEL`).
- Índice `@@index([unitId, kind, createdAt])` — suporta a leitura "versão mais recente por escola+kind".
- **Deliberadamente NÃO adicionado a `TENANT_MODELS`** (`src/lib/db.ts`): `forUnit()` injetaria/filtraria `unitId` sempre, o que tornaria as linhas globais (`unitId: null`) invisíveis em leitura e forçaria um `unitId` errado em escrita. O service (`contract.service.ts`) escopa manualmente via `where: { unitId, kind }`.
- Migration `20260821030000_add_terms_version_unit_id` — coluna nullable, sem backfill necessário (aplicada via `migrate diff --script` → `db execute` → `migrate resolve --applied`, mesmo padrão não-destrutivo das duas migrations anteriores).

**Bug pré-existente corrigido (bloqueante, achado via `advisor()` antes de codar):** `confirmSchool()` em `onboarding.service.ts` buscava a versão mais recente de cada `kind` via `findMany` **sem filtrar por `unitId`**. A partir do momento em que passassem a existir `TermsVersion` por-escola (`unitId` preenchido) para `ESCOLA_RESPONSAVEL`, a query pegaria a mais recente **de qualquer escola**, e uma escola A no onboarding poderia acabar registrando aceite do contrato de uma escola B — silenciosamente, sem erro. Corrigido para `where: { unitId: null }`: o onboarding da escola só aceita os termos **globais** da plataforma (`IX_ESCOLA`, `PRIVACY`); o contrato `ESCOLA_RESPONSAVEL` por-escola é aceito pelo responsável no fluxo de matrícula (EDU-13), não pela escola no onboarding.

**Fallback:** `getUnitContract(unitId)` retorna a versão custom mais recente da escola se existir; senão cai no texto padrão de `TERMS_DOCUMENTS` (`getTermsByKind('ESCOLA_RESPONSAVEL')`). Isso resolve a pendência do design handoff ("confirmar com dev antes de assumir" pra contrato vazio) sem bloquear B5 (EDU-13): toda escola sempre tem *algum* texto de contrato pra mostrar ao responsável, mesmo sem nunca ter customizado.

**Correção aplicada durante o EDU-13 (mesmo shape, fonte diferente):** ao começar EDU-13, `advisor()` apontou que `TermsAcceptance.termsVersionId` é uma FK **obrigatória** — `getUnitContract` precisava devolver um `id` real de `TermsVersion` pra toda referência (custom OU fallback), e o fallback original vinha de `TERMS_DOCUMENTS` (constante TypeScript, sem `id` de banco). Investigado o banco de dev: já existiam 3 linhas seed globais pré-existentes (`seed-IX_ESCOLA-1.0`, `seed-ESCOLA_RESPONSAVEL-1.0`, `seed-PRIVACY-1.0`, `createdAt` de 15/jun/2026 — anteriores a este épico). `getUnitContract` foi ajustado pra buscar o fallback **no banco** (`where: { unitId: null, kind }`) em vez de `TERMS_DOCUMENTS`, garantindo que toda escola — mesmo sem nunca ter customizado — sempre resolve pra um `TermsVersion.id` real e referenciável. Novo erro `NoContractVersionError` (500) cobre o caso teórico de nem custom nem seed global existirem — estado inconsistente que não deveria acontecer em produção com o seed presente.

**Gap de design system:** não existia `Textarea` — criado `src/components/ui/Textarea.tsx` seguindo os mesmos tokens/padrão do `Input.tsx` existente (borda, foco, erro). Adição in-scope (mesma lógica do `checkbox.tsx` previsto pra EDU-13), não recriação.

**Limitação de verificação conhecida e documentada (mesma classe do link `/m/[token]` em EDU-9):** não existe hoje nenhum caminho de login real para o role `orientador` em produção — o grupo `(app)` só tem telas admin (`/escolas`, `/onboarding`), e o único usuário de teste Clerk configurado no repo (`tests/e2e/global.setup.ts`) é comprovadamente `admin` (o setup verifica acesso a `/escolas`, rota admin). `DISABLE_CLERK` faz bypass só dentro de `getUnitContext()`, não no `clerkMiddleware` que protege `(app)` — logar como orientador via Playwright MCP não era viável sem alterar `src/middleware.ts` (fora de escopo) ou usar o usuário admin real (que a tela corretamente rejeitaria com `ForbiddenError`, não provando nada sobre a UI). Verificação real feita via: `pnpm build` (rota `/configuracoes/contrato` compila limpo, 2.66 kB / 290 kB First Load JS) + `pnpm lint` limpo nos arquivos novos + typecheck + toda a lógica de negócio (fallback, append-only, isolamento entre escolas, corpo vazio) coberta por integration tests contra o banco real.

**Testes:** `tests/unit/services/contract.service.test.ts` (4 — versão custom, fallback global, save append-only, corpo vazio) + `tests/integration/contract.integration.test.ts` (4, banco real — fallback quando sem contrato próprio, append-only com leitura da mais recente, isolamento entre escola A/B, rejeição de corpo vazio sem gravar).

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (316 unit + 20 integration). `pnpm lint && pnpm build` também verdes.

**Branch/PR:** `feature/mvp-02-matricula-contrato-settings` (a partir de `feature/mvp-02-matricula-b4-plano`).

## EDU-13 — US5: Aceite do contrato e envio

**Feito:** rota `/m/[token]/revisao` (B5, passo 4/4) — resumo (alunos com matérias, plano, total, dia de vencimento) + contrato expansível (texto vindo de `getUnitContract`, custom da escola ou fallback global) + checkbox "Li e aceito" (novo componente `Checkbox` no design system) + botão "Enviar matrícula" desabilitado sem aceite. Ao enviar: `submitAcceptanceStep` registra `TermsAcceptance` (timestamp+IP+guardianId) e muda todos os `Enrollment`s do Guardian para `PENDING_SCHOOL_APPROVAL`. Não chama Asaas (fica pra EDU-15, pós-aprovação). Nova rota `/m/[token]/enviado` — tela final "Aguardando aprovação da escola".

**Branch corrigida no início (achado via `advisor()`):** a branch inicial `feature/mvp-02-matricula-b5-aceite` tinha sido criada a partir de `feature/mvp-02-matricula-b4-plano` (EDU-12), não de `feature/mvp-02-matricula-contrato-settings` (EDU-14) — mesmo o plano original dizendo "depois que Bloco 6 (EDU-14) estiver mergeado". Como EDU-15 já é PR aberto empilhado (não local-merged), o mesmo padrão de empilhamento sobre branch não-mergeada usado em todo o resto do épico (ex.: EDU-9 sobre `feature/mvp-02-matricula-schema`/PR #27) se aplica aqui: recriada a branch a partir de `feature/mvp-02-matricula-contrato-settings`, garantindo que o schema/service de EDU-14 (`TermsVersion.unitId`, `contract.service.ts`) estão presentes.

**Decisão de schema — `TermsAcceptance.guardianId` (nullable), validada via `advisor()`:** `TermsAcceptance` só tinha `unitId` (sem saber *quem* aceitou) — suficiente pro aceite da escola no onboarding (`confirmSchool`), mas insuficiente pro aceite do responsável na matrícula, onde "registrar o aceite" só tem valor probatório se for atribuível a uma pessoa. Adicionado `guardianId String?` (nullable, `onDelete: Cascade` a partir de `Guardian`) — mesma lógica mixed-tenancy do `TermsVersion.unitId`: `null` = aceite da escola (confirmSchool, comportamento inalterado), preenchido = aceite do responsável. Descartada a alternativa `enrollmentId`: uma submissão cria 1 Enrollment por (student × subject), então um único aceite apontando pra um enrollment específico seria arbitrário — Guardian é o grão correto (1 aceite cobre toda a matrícula da família). Migration `20260821040000_add_terms_acceptance_guardian_id`, mesmo caminho não-destrutivo das anteriores.

**IP resolvido via `headers()` do Next em Server Action** (não `NextRequest`, já que esta rota usa Server Actions como todo o resto do fluxo B1-B4, não Route Handler) — mesmo padrão de fallback (`x-forwarded-for` → `x-real-ip` → `'0.0.0.0'`) já usado em `POST /api/confirmar/[token]`.

**Resumo (B5) busca os dados direto do Enrollment já criado em B4**, não recalculado a partir dos cookies — o Enrollment é a fonte de verdade nesse ponto do fluxo (já existe, já tem `finalPriceCents`/`plan` gravados). Nome do aluno é descriptografado (`decrypt(student.nameEnc)`) só nesta tela, pontualmente, pra exibição — nunca fica em cookie nem em log. Vencimento vem de `BillingConfig.dueDay` da escola (campo já existente, não específico do Enrollment — `Enrollment.customDueDay` é opcional/F2).

**Bug de UX corrigido antes do commit (achado na verificação manual, não pelos testes automatizados):** o checkbox estava dentro de um `<label>` sem `htmlFor` envolvendo um `<button role="checkbox">` — `<label>` só delega clique nativamente pra `<input>`, não pra `<button>`, então clicar no texto "Li e aceito..." não marcava o checkbox. Corrigido trocando o `<label>` por uma `<div role="button">` com `onClick` explícito cobrindo checkbox+texto, com `pointer-events-none` no `Checkbox` interno pra evitar disparo duplo. Confirmado visualmente via Playwright MCP que clicar no texto agora marca o checkbox e habilita o envio.

**Testes:** `tests/unit/services/enrollment.service.test.ts` (+2 pra `submitAcceptanceStep`: grava TermsAcceptance+muda status; lança `NoEnrollmentError` se guardian não tem Enrollment) + `tests/unit/components/ui-atoms.test.tsx` (+3 pro `Checkbox`) + `tests/integration/submit-acceptance-step.integration.test.ts` (3, banco real: aceite aponta pro contrato certo + Enrollments mudam de status; aponta pro contrato CUSTOM quando a escola já salvou um; `NoEnrollmentError` sem Enrollment).

**Verificado manualmente via Playwright MCP, fluxo completo B1→B5→enviado (desktop e 375px):** dados reais preenchidos (Guardian, Student, plano Mensal R$350/mês), resumo em `/revisao` mostra "João Pedro Silva — Mat" (nome descriptografado corretamente) e "Mensal — R$ 350,00 /mês, vencimento todo dia 10"; contrato expansível mostra o texto global (fallback, escola de teste sem customização); botão bloqueado sem aceite; após marcar aceite e enviar, redireciona pra `/enviado` com "Aguardando aprovação da escola"; confirmado no banco: `Enrollment.status = PENDING_SCHOOL_APPROVAL`, `TermsAcceptance` com IP real e `termsVersionId` apontando pro seed global correto. Dados de teste manual limpos do banco de dev após a verificação (não fazem parte da suíte automatizada).

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (322 unit + 23 integration). `pnpm lint && pnpm build` também verdes.

**Branch/PR:** `feature/mvp-02-matricula-b5-aceite` (a partir de `feature/mvp-02-matricula-contrato-settings`, EDU-14).

## EDU-15 — US8: Aprovação da escola + Asaas

**Feito:** tela `/matriculas` (orientador-only) lista matrículas em `PENDING_SCHOOL_APPROVAL`, agrupadas por Guardian (busca por responsável/aluno, tabela padrão `DataTable`/`Person`/`Badge`). Aprovar chama `POST /api/matriculas/[guardianId]/aprovar`, recusar chama `POST /api/matriculas/[guardianId]/recusar`. `approveEnrollment`/`rejectEnrollment`/`listPendingEnrollments` em novo `approval.service.ts`.

**Decisão de arquitetura confirmada via `advisor()` antes de codar — unidade de aprovação é o Guardian, não o Enrollment:** `submitAcceptanceStep` (EDU-13) já move TODOS os Enrollments de um Guardian pra `PENDING_SCHOOL_APPROVAL` de uma vez — 1 `TermsAcceptance` cobre a matrícula inteira da família. Se aprovar/recusar fosse por Enrollment individual, a escola poderia aprovar a Matemática do João e deixar o Português pendente sob o mesmo aceite (incoerente), e a criação do customer Asaas dispararia mais de uma vez pro mesmo responsável. `approveEnrollment`/`rejectEnrollment` recebem `guardianId` e usam `updateMany({ where: { guardianId } })` pra mover todos juntos.

**Idempotência do Asaas — 3 níveis, nessa ordem (evita duplicar customer):**
1. `Guardian.asaasCustomerId` já gravado → pula Asaas inteiramente, só transiciona status.
2. Senão, `findCustomerByCpfCnpj(cpf)` no Asaas — cobre o caso de uma tentativa anterior ter criado o customer mas a escrita no banco ter falhado/caído (recuperação de estado perdido).
3. Só então `createCustomer`.

CPF vem de `decrypt(guardian.cpfEnc)` — mesmo formato (dígitos crus) usado na criação do Guardian em EDU-10. `createCustomer` chamado com `{ name, cpfCnpj, externalReference: guardian.id }`, conforme o contrato da spec (seção 5).

**`getAsaasClient(apiKey)` usa a API key da SUBCONTA da escola** (`Unit.asaasApiKeyEnc`, decriptada na rota antes de chamar o service), não o master client — cada escola tem sua própria conta Asaas desde o onboarding (EDU-8 e anteriores). Primeiro uso desse padrão no repo (onboarding só usa `getMasterAsaasClient()` pra criar subcontas).

**`rejectEnrollment` grava `cancelledAt`, não só muda `status`:** o campo `Enrollment.cancelledAt` já existe no schema desde EDU-8 (antecipado pra F2, índice `@@index([unitId, cancelledAt])` já presente) — setá-lo junto com `status: CANCELLED` evita um estado inconsistente (cancelado mas sem timestamp) que F2 provavelmente vai precisar ler.

**Guard novo `guardOrientador`** em `src/lib/api/guard.ts` (ao lado do já existente `guardAdmin`) — mesmo padrão (retorna o contexto se autorizado, ou a `NextResponse` de erro pronta), usado pelas 3 rotas novas. `GuardianNotFoundError` mapeado em `src/lib/errors/handle.ts` (`mapKnown`) pra manter o padrão único de tratamento de erro do repo.

**Limitação de verificação conhecida — terceira ocorrência do mesmo gap (EDU-9, EDU-14, agora EDU-15):** `/matriculas` também é orientador-only, mesmo problema de não existir login real desse role em produção nem no usuário de teste Clerk configurado no repo. Compensado com testes de integração contra o Asaas mock client real (não só mockado em unit) cobrindo o fluxo completo: `submitGuardianStep` → `submitStudentsStep` → `submitPlanStep` → `submitAcceptanceStep` → `approveEnrollment`/`rejectEnrollment`, provando o comportamento fim-a-fim contra banco real. Vale um ticket de follow-up pro épico: nenhuma tela hoje dá à escola um jeito de logar como `orientador` nem de ver seu link de matrícula (`/m/[enrollmentLinkToken]`) — ambos os gaps documentados ao longo deste épico (EDU-8, EDU-9, EDU-14) bloqueiam o fluxo inteiro em produção até serem resolvidos.

**Instabilidade de rede durante os testes (não é bug de código):** 2 testes de `approval.integration.test.ts` (2 chamadas completas de `approveEnrollment` num mesmo teste) estouraram o timeout padrão de 20s em duas rodadas diferentes, com falhas em pontos diferentes a cada rodada — sintoma de lentidão intermitente do pooler Supabase (mesmo padrão já observado nesta sessão em outros pontos, "Transient DB connection errors"), não de lógica incorreta (confirmado: mesma suíte, mesmo código, passou 100% limpa numa terceira rodada). Aumentado o timeout desses 2 testes especificamente para 40s (terceiro argumento do `it()`), sem alterar o timeout global do arquivo.

**Testes:** `tests/unit/services/approval.service.test.ts` (6 — cria customer com payload correto, reaproveita `asaasCustomerId` já gravado, reaproveita customer achado por CPF, `GuardianNotFoundError`, lista agrupada por Guardian, reject com `cancelledAt`) + `tests/unit/api/matriculas-pendentes.route.test.ts` (3) + `tests/unit/api/matriculas-aprovar.route.test.ts` (3) + `tests/unit/api/matriculas-recusar.route.test.ts` (2) + `tests/unit/hooks/use-pending-enrollments.test.ts` (4, filtro puro) + `tests/unit/errors/handle.test.ts` (+1, `GuardianNotFoundError`) + `tests/integration/approval.integration.test.ts` (5, banco real + Asaas mock: cria customer e ativa Enrollments, não duplica customer em 2 aprovações, reject com `cancelledAt` sem tocar Asaas, lista agrupada corretamente, matrícula aprovada some da lista).

**DoD-comando:** `pnpm typecheck && pnpm test:run && pnpm test:integration` — verde (341 unit + 28 integration). `pnpm lint && pnpm build` também verdes.

**Branch/PR:** `feature/mvp-02-matricula-b8-aprovacao` (a partir de `feature/mvp-02-matricula-b5-aceite`).

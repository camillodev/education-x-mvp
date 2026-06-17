# HANDOFF — Redesign Alfabeto do Onboarding (desktop-first)

> **Para a nova sessão:** este arquivo é auto-contido. Leia-o + os 4 arquivos de código citados
> em "Estado atual" + `docs/education-x/04-marca/01-DESIGN-SYSTEM-ALFABETO.md`. Não precisa de
> mais contexto. Branch: `feature/tarefa-1-onboarding` (PR #6 aberto). Rode com **Node 22**:
> `export PATH="/Users/rafae/.nvm/versions/node/v22.22.3/bin:$PATH"` (o shell pode cair em Node 20,
> que quebra o rollup/pnpm — sempre exportar o 22 antes de vitest/build/prisma).

## Por que este redesign

O Rafa revisou o wizard e o veredito foi: **"sem cores, sem o princípio do design, só inboxes; layout quebrado; não aproveita o desktop"**. O onboarding funciona mas é visualmente pobre: inputs empilhados em fundo branco, `max-w-2xl` (estreito p/ desktop), cinzas hardcoded (`gray-300`/`gray-50`) em vez dos tokens Alfabeto, todo título pintado de primary, 5 passos longos, e os nomes da unidade confusos. Os tokens Alfabeto ricos **já existem** (`src/styles/alfabeto.css`) — só não são usados.

Meta: **desktop-first com identidade Alfabeto de verdade, 5→3 passos, mais autofill, 3 nomes separados.** Manter tudo que já funciona (validações, autofill CNPJ/CEP, plano+desconto, aceite via link, dev-bypass, gate Playwright).

## Decisões já fechadas com o Rafa (NÃO reabrir)
1. **Layout desktop = 2 colunas:** stepper vertical à esquerda + form largo à direita. Mobile = stepper horizontal no topo + coluna única.
2. **3 nomes da unidade:** Apelido/branding (`name`, digitável, "como aparece no sistema") + Razão social (do CNPJ, **editável**) + Nome fantasia (do CNPJ).
3. **5 → 3 passos:** Dados · Financeiro (cobrança+plano) · Matérias+Revisão.
4. Mais autofill (CNPJ→tudo), defaults inteligentes (avançar sem mexer), obrigatórios sinalizados + opcionais recolhidos por último.
5. Pré-matrícula direta pela escola = **fora deste escopo** (Tarefa 2).

---

## Tokens Alfabeto à mão (de `src/styles/alfabeto.css`)
Cores: `--color-primary` #0467DB · `--color-primary-softer` #EAF2FD · `--color-surface` #F5F5F7 · `--color-surface-muted` #FAFAFA · `--color-border` #E5E7EB · `--color-border-input` #D1D5DB · `--color-text` #1F2937 · `--color-text-muted-strong` #374151 · `--color-text-muted` #4B5563 · `--color-text-subtle` #6B7280 · `--color-primary-ring` rgba(4,103,219,.22).
Badges: success `--badge-success-bg/-fg` #C5F0DE/#1D6B4F · warning #FFF4D0/#8A6D1C · danger #FFD1D1/#8A1818 · info #DDEAFB/#023A85.
Forma: `--radius-md` 10px · `--radius-lg` 16px · `--shadow-card` · `--shadow-card-hover` · `--space-*` (4..64px).
Tipografia: Inter. Classes utilitárias prontas: `.eyebrow` (12px upper, tracking, subtle) e `.label` (12px upper, tracking, muted) — já no alfabeto.css linhas 208-215.
shadcn já mapeado pros tokens via `@theme inline` em `src/app/globals.css` (não mexer salvo necessidade).

---

## Estado atual (arquivos que mudam)
- `src/app/(app)/onboarding/page.tsx` — orquestrador. Container `max-w-2xl` central, `bg-gray-50`, stepper horizontal, render condicional `step === 1..5`, nav Voltar/Próximo. **useToast** já integrado (erro de submit → toast). `LOADING_STEPS` no submit.
- `src/components/patterns/Stepper.tsx` — horizontal hardcoded; estados completo/ativo usam tokens, pending usa `gray-300`/`gray-400` (trocar). Interface `Step { label }`.
- `src/components/onboarding/StepDados.tsx` — passo 1. Grid `sm:grid-cols-2`. `legalName`/`tradeName`/`cnpjStatus` mostrados num **box cinza read-only** (linhas ~254-284). Autofill CNPJ (useEffect, AbortController, refs estáveis, linhas ~69-114) faz `patch.name = tradeName||legalName` quando vazio (linha ~85) — **mudar p/ sugestão editável**. ViaCEP no blur do CEP. Inputs com `border-gray-300` hardcoded. Bloco "Responsável" (~434-518).
- `src/components/onboarding/StepCobranca.tsx` — passo 2 atual. dueDay default 10, closingDay 25, multa/juros bp, municipalRegistration (obrigatório, sem default), 2 selects FeePayer. **Funde no novo StepFinanceiro.**
- `src/components/onboarding/StepPlano.tsx` — passo 3 atual. 3 cards radio (399/499/699 de `src/lib/data/plans.ts`), toggle beta, `<DiscountField>`. **Funde no novo StepFinanceiro.** Bom uso de `primary-softer` — replicar.
- `src/components/onboarding/StepDocumentos.tsx` — matérias (tabela desktop + cards mobile + linha de adição). Vai pro passo 3 junto com revisão.
- `src/components/onboarding/StepRevisao.tsx` — revisão; blocos com "Editar" → `onEditStep(1|2|3|4)`. Mudar p/ `1|2|3`.
- `src/hooks/use-onboarding.ts` — `OnboardingState` com `step: 1..5`, `dados`/`cobranca`/`plano`/`subjects`. `canProceedFromStep` casos 1-5. `submit()` valida 1,3,4 + monta `CreateSchoolInput`. `DadosState` tem `name`/`legalName`/`tradeName`/`cnpjStatus`.

Reuso pronto: `DiscountField.tsx`, `Combobox.tsx` (rede franquia), `button.tsx` (tokenizado), `toast.tsx` (`useToast`), `src/lib/data/cnpj-lookup.ts` (BrasilAPI, `lookupCnpj`), `plans.ts`, `pricing.ts` (`computeDiscountedCents`), `src/lib/format.ts` (maskCnpj/Cpf/Phone/Cep, formatBRL), `src/lib/validations/br-documents.ts` (isValidCnpj/Cpf/BrMobile).

---

## Blueprint UX (fonte da verdade — seguir)

### Estrutura 5→3
| # | Passo | Agrupa |
|---|-------|--------|
| 1 | **Dados da escola** | Identidade (CNPJ + 3 nomes), contato, endereço, responsável |
| 2 | **Financeiro** | Cobrança aos responsáveis + Plano da escola (2 cards; ambos default-completos) |
| 3 | **Matérias e revisão** | Matérias (única sem default) + resumo + envio |

### Shell desktop 2-colunas
- Externo `max-w-6xl mx-auto`, `lg:grid-cols-[280px_1fr] gap-12`.
- **Esquerda:** `Stepper` **vertical** sticky `top-24`. Cada item: círculo (check/nº) + label + descrição curta (`--color-text-subtle`); conector **vertical**; passo ativo com faixa de fundo `--color-primary-softer`.
- **Direita:** form `max-w-4xl`; cada passo = **cards de seção** (branco + `border-[--color-border]` + `shadow-card` + `rounded-[--radius-lg]` + `p-6`); header com `.eyebrow`/`.label`; campos `grid sm:grid-cols-2 lg:grid-cols-3 gap-4` (2 col onde o label é longo).
- **Fundo da página:** `--color-surface` (#F5F5F7) — os cards brancos passam a flutuar (elevação).
- **Mobile <1024px:** grid colapsa; stepper horizontal no topo (sem descrições); cards 1 col; nav Voltar/Próximo **sticky no rodapé**.

### Passo 1 — ordem orientada a autofill (3 cards)
- **Card A · Identidade:** CNPJ (1º, dispara lookup + **badge** de situação) → Razão social (input **editável**, prefill `legalName`, hint "vem do CNPJ, pode ajustar") → Nome fantasia (editável, prefill `tradeName`) → **Apelido/nome de exibição** (`name`, o mais proeminente, label "Apelido (como aparece no sistema) *") → E-mail + Celular da escola. Franquia (checkbox+Combobox, opcional) recolhida no fim.
- **Card B · Endereço:** CEP (1º, ViaCEP) → logradouro/número/bairro/cidade/UF (prefill, confirmar). Complemento → "Opcional".
- **Card C · Responsável:** nome, CPF, celular, e-mail (obrigatórios; texto "recebe o link de confirmação").

### Hierarquia Alfabeto (sair do branco)
- Fundo página `--color-surface`; cards brancos `shadow-card` (hover `shadow-card-hover` em cards interativos).
- `--color-primary-softer`: passo ativo no stepper, plano selecionado, card de cálculo do DiscountField, badge Beta.
- **Badge de situação cadastral do CNPJ** (não texto cru): ATIVA → `--badge-success-*`; outras → `--badge-warning-*`; BAIXADA/INAPTA → `--badge-danger-*`. Aparece ao lado do CNPJ quando o autofill retorna.
- `.eyebrow` "PASSO X DE 3" + h1 + `.label` nos headers de card.
- **Títulos em `--color-text`/`--color-text-muted-strong`** — primary só p/ ação e estado ativo.
- Inputs: `--color-border-input` + focus `--color-primary`/`--color-primary-ring`. Padronizar via componente `Input` único (criar `src/components/ui/input.tsx` tokenizado) ou classe utilitária — eliminar os `border-gray-300` espalhados.

### Sinalização obrigatório
- Asterisco `*` nos obrigatórios + legenda "* campo obrigatório" 1×/passo + `aria-required` (já existe). WCAG 3.3.2.
- **Opcionais recolhidos** em disclosure "+ Mostrar campos opcionais" no fim de cada card. Erro só após interação (manter).

### Passo 2 (Financeiro) — novo `StepFinanceiro.tsx`
Dois cards distintos no mesmo passo: "Cobrança aos responsáveis" (campos do StepCobranca) e "Plano da escola" (cards de plano + beta + DiscountField do StepPlano). Caminho feliz = avançar sem mexer (todos default). **`municipalRegistration` fica visível na zona obrigatória** do card de cobrança (NÃO recolher — é gated sem default; se esconder, "Próximo" trava sem explicação).

### Passo 3 (Matérias + Revisão)
Bloco 1 matérias (reusa StepDocumentos em card de seção). Bloco 2 revisão (reusa StepRevisao). "Editar" aponta p/ os novos passos (Dados→1, Financeiro→2, Matérias→3/scroll). Estados submitting/success intactos.

### Mudanças de estado/contrato
1. `Stepper`: prop `orientation: 'horizontal'|'vertical'` + `Step.description?`.
2. `legalName` vira input editável (era display-only).
3. Autofill de `name`: sugestão editável (não sobrescrever cego).
4. `cnpjStatus` → badge tokenizado.
5. `WizardStep` `1|2|3|4|5` → `1|2|3`; ajustar `goToStep`, `canProceedFromStep` (reagrupar: passo 2 = cobrança+plano, passo 3 = matérias), `onEditStep`, `step ===` em page.tsx, e o `submit()` (valida 1,2,3).
6. Fixtures de teste que usam step index (`use-onboarding.test.ts`, `StepRevisao.test.tsx`) precisam dos novos índices.

### Riscos
- Fusão Cobrança+Plano: 2 cards separados; municipalRegistration visível.
- `legalName` editável muda o persistido — confirmar normalização backend (provável OK; service só grava string).
- Stepper vertical é componente real (prop nova), não "só CSS".
- 3 col aperta label longo → 2 col onde precisar.
- NÃO deferir matérias (exigiria backend aceitar 0 matérias). Manter ≥1 no wizard.

---

## Checklist de execução
1. `Stepper.tsx`: adicionar `orientation` + `description`, trocar grays por tokens.
2. (opcional) `src/components/ui/input.tsx` tokenizado + refatorar inputs dos steps.
3. `page.tsx`: shell 2-colunas, fundo surface, 3 passos, nav sticky mobile, eyebrow/h1.
4. `StepDados.tsx`: 3 cards de seção, razão social/fantasia editáveis, apelido proeminente, badge CNPJ, opcionais recolhidos, inputs tokenizados.
5. Novo `StepFinanceiro.tsx` (funde Cobranca+Plano em 2 cards). Remover StepCobranca/StepPlano do fluxo (manter arquivos ou deletar — DiscountField fica).
6. `StepRevisao.tsx`: matérias no passo 3, `onEditStep` 1|2|3.
7. `use-onboarding.ts`: `WizardStep` 1|2|3, reagrupar `canProceedFromStep`, autofill `name` sugestão, ajustar `submit()`.
8. Atualizar fixtures de teste com novos índices.

## Verificação E2E (obrigatória antes do PR)
1. Gates (Node 22): `npx vitest run` · `npx tsc --noEmit` · build CI-mode (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` dummy via env).
2. Visual dev-bypass: `DISABLE_CLERK=true DEV_USER_ROLE=admin_ix npx next dev --port 3001`. Percorrer os 3 passos em **375/768/1440** e **LER cada screenshot (Read na .png)** — não basta capturar:
   - 1440: shell 2-colunas, stepper vertical, cards surface/shadow, badge CNPJ (`47960950000121` → ATIVA verde), 3 nomes claros, opcionais recolhidos.
   - 768/375: stepper horizontal topo, 1 col, nav sticky.
   - Passo 2: 2 cards, avançar sem mexer, municipalRegistration visível.
   - Passo 3: matérias+revisão juntos, Editar correto.
   - Submit (bypass): HTTP 201.
3. Rodar agente **`edx-ui-reviewer`** no fluxo completo (pegou os bugs nas rodadas anteriores).
4. Postar comentário **`PW-VALIDATION`** cobrindo o HEAD: `echo "<veredito>" | .claude/hooks/pw-validation-comment.sh -` (o gate `playwright-required.sh` bloqueia push sem ele).
5. Push → confirmar CI + Vercel verdes no PR #6.

## Gotchas conhecidos (memória do projeto)
- shadcn precisa dos tokens mapeados em `@theme` (já feito) senão popover/dropdown fica transparente.
- `.env` (não `.env.local`); hook bloqueia ler `.env*` — usar `~/scripts/list-env-keys.sh` p/ ver nomes.
- `ENCRYPTION_KEY` aceita hex(64) ou base64(44); a do `.env` é base64.
- dev-bypass: `DISABLE_CLERK=true` desliga Clerk no front, na API route e no layout (sem ClerkProvider). Só fora de produção.
- Limpar `.next` antes de typecheck se reclamar de módulos `.next/types` fantasma: `find .next -mindepth 1 -delete; rmdir .next`.

## Pendências (não bloqueiam, registrar p/ Tarefa 2)
- Pré-matrícula: escola cadastra aluno direto vs link pro responsável + mais autofill.
- Deferir matérias (escola sem matéria) = decisão produto+backend.
- `municipalRegistration` opcional se nem sempre existir no cadastro.

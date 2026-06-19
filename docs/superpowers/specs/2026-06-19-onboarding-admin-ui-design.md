# Onboarding Admin — UI (PR B) Design

> Spec de design das telas admin de escolas (Read+Update). API já existe (PR A mergeado). Dividido em PR B1 (lista) + PR B2 (edição).

## Contexto
- Ferramenta **interna ADMIN IX** (não tela da escola). Só-admin via `requireAdmin` (já enforçado na API).
- Stack: Next.js App Router (RSC), shadcn/ui + tokens Alfabeto (CSS vars `--color-*`), fetch nativo (sem axios/SWR), lucide icons.
- Reusa o wizard de cadastro (`Step*` do onboarding) na edição.

## Decisões de design (fechadas com Rafa)
1. **Shell:** sidebar lateral fixa adaptada para ADMIN IX (estilo do print da sidenav), conteúdo à direita. Item "Escolas" ativo. Isolada em `(app)/escolas/layout.tsx` — NÃO toca `(app)/layout.tsx` (compartilhado com onboarding).
2. **Edição = wizard 4 passos** (igual cadastro), estado hidratado da API.
3. **Franquia = `franchiseParent`** (campo existente). Coluna FRANQUIA + chips de filtro derivados dos valores distintos. Exige GET lista retornar `franchiseParent`.
4. **Componentes via shadcn + Alfabeto**, salvos como nossos em `src/components/ui/` (table, tabs) — não inline.
5. **Fatiamento:** PR B1 (lista) + PR B2 (edição), cada um ≤400 linhas de prod.

## Telas

### Lista (`/escolas`) — PR B1
Layout do print da tabela:
- **Sidebar** (esquerda): logo EducationX, item "Escolas" (ativo), rodapé usuário/logout.
- **Header de conteúdo:** eyebrow "ESCOLAS CONECTADAS" + título "Gestão de escolas" + subtítulo + botão "+ Nova escola" (link pra `/onboarding`).
- **Filtros:** busca (nome/CNPJ/franquia) · chips de franquia (Todas + distintos de `franchiseParent`) · tabs de status (Todas/Ativas/Suspensas).
- **Tabela:** colunas ESCOLA (avatar iniciais + nome), FRANQUIA, CNPJ (mascarado), STATUS (badge), ação "Abrir ›" (link `/escolas/[id]`).
- **Paginação client-side:** "1–N de M escolas" + Anterior/páginas/Próxima.
- Estados: loading (skeleton), vazio, erro (via toast + mensagem).
- Filtros/busca/paginação **client-side** (volume baixo no MVP).

### Edição (`/escolas/[unitId]`) — PR B2
- Mesma sidebar (do layout).
- Wizard 4 passos reusando `StepDados`, `StepFinanceiro`, `StepDocumentos`, `StepRevisao`.
- Estado hidratado via `GET /api/escolas/[unitId]` → mapeado pro shape `OnboardingState`.
- CNPJ read-only (já vem travado; o campo exibe mascarado, disabled). CPF do responsável read-only mascarado.
- Submit → `PATCH /api/escolas/[unitId]` (em vez de POST). Toast de sucesso/erro via `handleError` pattern.

## Componentes novos (shadcn + Alfabeto, reutilizáveis)
- `src/components/ui/table.tsx` — Table/THead/TBody/TR/TH/TD (shadcn table, tokens Alfabeto).
- `src/components/ui/tabs.tsx` — Tabs (shadcn, p/ status). [Avaliar: `Segmented` já existe e pode cobrir — usar Segmented se servir, evitar componente novo.]
- `src/components/admin/AdminSidebar.tsx` + `AdminShell.tsx` — shell admin.

## Componentes/hooks novos (lógica)
- `src/hooks/use-schools.ts` (B1) — fetch lista (`GET /api/escolas`), estados loading/error/data, filtros client-side.
- `src/hooks/use-school-edit.ts` (B2) — hidrata `OnboardingState` da API + reusa actions do reducer + submit via PATCH.

## API (ajuste mínimo no B1)
- `GET /api/escolas` passa a retornar `franchiseParent` no select (hoje não retorna). +1 campo, +teste.

## Testes
- **E2E (`tests/e2e/escolas.spec.ts`):** roda contra `pnpm dev`, bypass `DISABLE_CLERK=true`, 3 breakpoints (375/768/1440). Seed via helper (TEST_PREFIX).
  - B1: lista carrega ≥1 escola · busca filtra · chip franquia filtra · tab status filtra · não-admin → 403.
  - B2: abrir edição · editar name + 1 preço → salvar → recarregar mostra novo valor · obrigatório vazio → bloqueado com toast.
- **Unit:** `use-schools` (filtros), mapeamento API→OnboardingState (`use-school-edit`), ajuste do GET lista (franchiseParent presente).

## Não-incluído
Delete · fluxo/link da escola · specs 02-09 · wizard de criação (Create intacto) · editar CPF/Asaas · paginação server-side.

# Spec -- Contas a Pagar (Fluxo 10)

> **Status:** rascunho (Claude, 2026-06-21)
> **Fonte de verdade:** `prisma/schema.prisma` + decisoes de produto + protótipo (`prototipo/design-handoff/...`, só UX).
> **DS:** Alfabeto.

---

## 1. Objetivo

Dar à escola controle das despesas operacionais por meio de registro manual: cadastrar uma conta a pagar com categoria, fornecedor (opcional) e vencimento; marcar como paga; e visualizar a lista filtrada por status, categoria e período.

O Education X **nunca movimenta dinheiro de terceiros**. O franqueado paga as contas no banco dele e registra o fato no sistema. O módulo serve como fonte de saídas para o fluxo de caixa (spec 11).

**DoD:** poder cadastrar uma despesa com categoria e vencimento, marcá-la como paga (com valor pago e data), ver a lista filtrada por status/categoria/período, e ter o status `OVERDUE` calculado automaticamente para vencimentos passados. Testes de unidade + Playwright E2E cobrindo criação, pagamento e filtros.

---

## 2. Dados necessários (o coração)

### 2a. Piso Asaas

Este fluxo **não chama o Asaas no MVP**. Registro é 100% manual. Ver §5 para roadmap futuro.

### 2b. Negócio

**FinancialCategory (plano de contas simplificado):**

| Campo | Tipo | Obrigatório | Descricao |
|---|---|---|---|
| `id` | String | SIM | cuid() |
| `unitId` | String | SIM | FK -> Unit |
| `name` | String | SIM | Ex.: "Aluguel", "Royalties da Franquia" |
| `kind` | enum `CategoryKind` | SIM | `RECEITA` ou `DESPESA` |
| `isSystem` | Boolean | SIM | `true` = categoria seed criada no onboarding, `false` = criada pela escola |
| `isActive` | Boolean | SIM | soft-delete; default `true` |

Categorias seed Kumon (criadas automaticamente na criação da Unit, todas `isSystem=true`, `kind=DESPESA`):
- Royalties da Franquia
- Aluguel
- Material Didático
- Salários
- Marketing
- Taxas Asaas
- Energia / Água / Internet
- Outros

A escola pode criar categorias adicionais ou desativar as seeds (nunca deletar `isSystem=true`).

**Supplier (fornecedor -- leve, opcional):**

| Campo | Tipo | Obrigatório | Descricao |
|---|---|---|---|
| `id` | String | SIM | cuid() |
| `unitId` | String | SIM | FK -> Unit |
| `name` | String | SIM | Nome do fornecedor |
| `documentEnc` | String? | NAO | CNPJ ou CPF -- AES-256-GCM |

Fornecedor é opcional no `Payable`. O franqueado pode lançar "Aluguel R$2.000" sem cadastrar fornecedor antes -- forcar o cadastro mataria adoção.

**Payable (conta a pagar):**

| Campo | Tipo | Obrigatório | Descricao |
|---|---|---|---|
| `id` | String | SIM | cuid() |
| `unitId` | String | SIM | FK -> Unit |
| `supplierId` | String? | NAO | FK -> Supplier (nullable) |
| `categoryId` | String | SIM | FK -> FinancialCategory |
| `description` | String | SIM | Descricao livre (ex.: "Aluguel Junho 2026") |
| `amountCents` | Int | SIM | Valor em centavos |
| `dueDate` | DateTime | SIM | Vencimento |
| `status` | enum `PayableStatus` | SIM | `PENDING` / `PAID` / `OVERDUE` / `CANCELLED` |
| `paidAt` | DateTime? | NAO | Data do pagamento manual |
| `paidAmountCents` | Int? | NAO | Valor efetivamente pago (pode diferir por desconto/multa) |
| `referenceMonth` | String | NAO | Competência, ex.: "2026-06" (YYYY-MM) |
| `isRecurring` | Boolean | NAO | Flag de despesa recorrente; geração automática fica fora do MVP |
| `notes` | String? | NAO | Observacoes livres |
| `createdAt` | DateTime | SIM | auto |
| `updatedAt` | DateTime | SIM | auto @updatedAt |

### 2c. Fiscal / NFS-e

Nao aplicavel. Contas a pagar nao geram nota fiscal de saída no MVP.

### 2d. Compliance / LGPD

- `Supplier.documentEnc` é PII (CNPJ/CPF). AES-256-GCM, mesmo padrão de `Guardian.cpfEnc`. Na UI, exibir mascarado quando presente.
- `Payable` nao contem PII próprio -- apenas FK para Supplier.
- Todo `unitId` vem da sessão Clerk, nunca de parâmetro HTTP.

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolucao |
|---|---|---|---|---|---|---|
| `unitId` | Sessao Clerk | SIM | existe em todos os models | N/A | Nao | Sempre via `auth().orgId` ou sessao; nunca query param |
| `categoryId` | FinancialCategory | SIM | **FALTA** -- criar model | N/A | Sim (select na UI) | Novo model `FinancialCategory`; seed no onboarding da Unit |
| `supplierId` | Supplier | NAO | **FALTA** -- criar model | N/A | Sim (campo opcional) | Novo model `Supplier`; nullable na FK |
| `description` | Produto | SIM | **FALTA** -- campo em `Payable` | N/A | Sim | Input livre no form |
| `amountCents` | Produto | SIM | **FALTA** -- campo em `Payable` | N/A | Sim | Input em reais na UI; converter x100 no service |
| `dueDate` | Produto | SIM | **FALTA** -- campo em `Payable` | N/A | Sim | Date picker |
| `status` | Produto | SIM | **FALTA** -- enum `PayableStatus` + model `Payable` | N/A | Sim (badge) | Calculado; OVERDUE via job ou on-read |
| `paidAt` | Operador | NAO | **FALTA** -- campo em `Payable` | N/A | Sim (modal pagar) | Setado ao marcar como pago; default `now()` mas editável no modal |
| `paidAmountCents` | Operador | NAO | **FALTA** -- campo em `Payable` | N/A | Sim (modal pagar) | Input no modal de pagamento; default = `amountCents` |
| `referenceMonth` | Produto | NAO | **FALTA** -- campo em `Payable` | N/A | Nao (interno) | String YYYY-MM; base para agrupamento no fluxo de caixa (spec 11) |
| `isRecurring` | Produto | NAO | **FALTA** -- campo em `Payable` | N/A | Nao (flag) | Boolean flag; geracão automática de séries fica fora do MVP |
| `notes` | Operador | NAO | **FALTA** -- campo em `Payable` | N/A | Nao | Textarea opcional no form |
| `isSystem` (category) | Produto | SIM | **FALTA** -- campo em `FinancialCategory` | N/A | Nao (interno) | Guard: escola nao pode deletar categoria `isSystem=true` |
| `documentEnc` (supplier) | Operador | NAO | **FALTA** -- campo em `Supplier` | N/A | Nao | Input CNPJ/CPF com mascara; criptografar antes de salvar |

---

## 4. Deltas de schema

```prisma
// Adicionar ao schema.prisma

enum CategoryKind {
  RECEITA
  DESPESA
}

enum PayableStatus {
  PENDING    // aguardando vencimento ou pagamento
  PAID       // marcado como pago manualmente
  OVERDUE    // vencimento passado e ainda PENDING (calculado)
  CANCELLED  // cancelado pelo operador
}

model FinancialCategory {
  id       String       @id @default(cuid())
  unitId   String
  name     String
  kind     CategoryKind
  isSystem Boolean      @default(false) // true = seed do onboarding; nao pode ser deletado
  isActive Boolean      @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit      Unit      @relation(fields: [unitId], references: [id], onDelete: Cascade)
  payables  Payable[]

  @@index([unitId, kind])
  @@map("financial_categories")
}

model Supplier {
  id          String  @id @default(cuid())
  unitId      String
  name        String
  documentEnc String? // CNPJ ou CPF -- AES-256-GCM

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit      @relation(fields: [unitId], references: [id], onDelete: Cascade)
  payables Payable[]

  @@index([unitId])
  @@map("suppliers")
}

model Payable {
  id         String @id @default(cuid())
  unitId     String
  supplierId String? // nullable -- fornecedor nao é obrigatorio
  categoryId String

  description    String
  amountCents    Int           // valor esperado, em centavos
  dueDate        DateTime
  status         PayableStatus @default(PENDING)

  // Pagamento manual
  paidAt          DateTime?
  paidAmountCents Int?         // pode diferir de amountCents (desconto/multa)

  // Agrupamento / competência
  referenceMonth String?      // "2026-06" (YYYY-MM); alimenta spec 11

  // Flags
  isRecurring Boolean @default(false) // serie recorrente -- geracao automática fica fora do MVP
  notes       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit              @relation(fields: [unitId], references: [id], onDelete: Cascade)
  supplier Supplier?         @relation(fields: [supplierId], references: [id])
  category FinancialCategory @relation(fields: [categoryId], references: [id])

  @@index([unitId, status])
  @@index([unitId, dueDate])
  @@index([unitId, categoryId])
  @@index([unitId, referenceMonth])
  @@map("payables")
}
```

**Relacoes a adicionar em models existentes:**

```prisma
// Unit -- adicionar:
  financialCategories FinancialCategory[]
  suppliers           Supplier[]
  payables            Payable[]
```

**Migration:** `prisma migrate dev --name add-payables`

**Seed de categorias (onboarding da Unit):**

```typescript
// Executar em createUnit() após criar o registro Unit
const KUMON_DEFAULT_CATEGORIES = [
  'Royalties da Franquia',
  'Aluguel',
  'Material Didático',
  'Salários',
  'Marketing',
  'Taxas Asaas',
  'Energia / Água / Internet',
  'Outros',
]

await prisma.financialCategory.createMany({
  data: KUMON_DEFAULT_CATEGORIES.map((name) => ({
    unitId,
    name,
    kind: 'DESPESA',
    isSystem: true,
  })),
})
```

---

## 5. Contratos Asaas

Este fluxo **nao chama o Asaas no MVP**. Toda a operacao é registro manual puro -- o franqueado paga as contas no banco dele e registra o fato no Education X.

### Roadmap futuro: bill-pay via Asaas

O Asaas possui API de pagamento de contas (`POST /transfers`, `POST /bill-payments`) que permitiria executar o pagamento diretamente pelo sistema. Esta integracao **nao entra no MVP** pelos seguintes motivos:

1. **Responsabilidade juridica e regulatória.** Movimentar dinheiro de terceiros (pagar o aluguel da escola usando a conta Asaas dela) enquadra a IX como prestadora de servico de pagamento, sujeita a regulamentacao do Banco Central (Resolucao BCB 80/2021 e similares). Requer analise juridica antes de implementar.

2. **Dinheiro da escola nao está todo no Asaas.** A subconta Asaas da escola recebe apenas mensalidades dos responsáveis. As contas operacionais (aluguel, salários, royalties) são pagas da conta corrente do franqueado no banco comercial dele -- que a IX nao acessa.

3. **Compliance de instituicao de pagamento.** Intermediar pagamentos a fornecedores requer credenciamento como IP (Instituicao de Pagamento) ou parceria formal com uma IP credenciada. Custo e prazo fora do escopo do MVP.

4. **A dor identificada é visibilidade, nao execucao.** O franqueado Kumon nao pediu que o sistema pague as contas por ele -- pediu saber quanto deve sair e quando. O registro manual resolve a dor sem o risco regulatório.

**Reavaliar:** se um cliente de porte (rede com >10 unidades) pedir explicitamente a execucao automatica de pagamentos, abrir ADR específico com analise juridica antes de qualquer implementacao.

---

## 6. Regras de negocio (EARS)

```
// Criacao de Payable

WHEN operador envia POST /api/payables
  AND categoryId pertence a uma FinancialCategory ativa da mesma unitId
THEN system SHALL criar Payable com status = PENDING

IF supplierId informado
  AND supplierId pertence a Supplier de unitId diferente da sessao
THEN system SHALL rejeitar com 403

IF amountCents <= 0
THEN system SHALL rejeitar com 400 ("Valor deve ser maior que zero")

IF dueDate é data inválida ou anterior a 2020-01-01
THEN system SHALL rejeitar com 400 ("Data de vencimento inválida")

// Transicao OVERDUE

WHEN payable.status = PENDING
  AND payable.dueDate < hoje (00:00 UTC)
THEN system SHALL retornar status = OVERDUE nas consultas (cálculo on-read ou job diário)

Nota: OVERDUE pode ser calculado on-read (sem alterar o banco) ou via job cron diário
que atualiza status=OVERDUE em massa. Decisão de implementacao delegada à Fatia 2.
MVP aceita ambos; on-read é mais simples para começar.

// Marcar como pago

WHEN operador envia PATCH /api/payables/:id { action: "pay" }
  AND payable.status IN [PENDING, OVERDUE]
  AND payable.unitId = unitId da sessao
THEN system SHALL set payable.status = PAID
  AND set payable.paidAt = paidAt informado (default now())
  AND set payable.paidAmountCents = paidAmountCents informado (default amountCents)

IF payable.status = PAID OR CANCELLED
THEN system SHALL rejeitar transicao para PAID com 409 ("Conta já encerrada")

// Cancelamento

WHEN operador envia PATCH /api/payables/:id { action: "cancel" }
  AND payable.status IN [PENDING, OVERDUE]
  AND payable.unitId = unitId da sessao
THEN system SHALL set payable.status = CANCELLED

IF payable.status = PAID
THEN system SHALL rejeitar cancelamento com 409 ("Conta já paga nao pode ser cancelada")

// Guard de categoria isSystem

WHEN operador envia DELETE /api/financial-categories/:id
  AND category.isSystem = true
THEN system SHALL rejeitar com 403 ("Categoria padrão nao pode ser removida")

// Seed de categorias

WHEN nova Unit é criada (onboarding fluxo 01)
THEN system SHALL criar as 8 categorias Kumon default com isSystem=true e kind=DESPESA

// Guard de unitId (multi-tenant -- obrigatório em todo endpoint)

IF payable.unitId != unitId da sessao Clerk
THEN system SHALL retornar 404 (nunca 403, para nao vazar existência)

IF supplierId informado E supplier.unitId != unitId da sessao
THEN system SHALL retornar 404

// isRecurring

IF payable.isRecurring = true
THEN system SHALL salvar a flag sem gerar nenhuma cópia adicional no MVP
  // geracao de série recorrente fica como pendência futura (ver §11)
```

---

## 7. Estados e transicoes

```
                     [vencimento passado]
        PENDING ─────────────────────────► OVERDUE
           │                                  │
           │ [operador marca como pago]        │ [operador marca como pago]
           ▼                                  ▼
          PAID ◄──────────────────────────── PAID
           
        PENDING ──[operador cancela]──► CANCELLED
        OVERDUE ──[operador cancela]──► CANCELLED

Estados finais (nao transitam mais): PAID, CANCELLED

Notas:
- OVERDUE nao é status persistido no banco no MVP (cálculo on-read preferido).
  Se usar job cron, atualiza em lote uma vez ao dia.
- De PAID nao há transicao de volta (registrar novo Payable se necessário corrigir).
- De CANCELLED nao há transicao de volta.
- Transicao PAID -> CANCELLED é bloqueada (regra no service e na UI).
```

---

## 8. Fluxo de coleta (UX -- referencia ao design)

Design de referência: `prototipo/design-handoff/project/app/` (telas de financeiro). O design ilustra, nao define os campos -- os campos vem do §2.

**Lista de contas a pagar:**

1. Tela principal exibe tabela com colunas: Descricao, Fornecedor (se houver), Categoria, Vencimento, Valor, Status (badge colorido).
2. Filtros no topo: Status (multi-select: Pendente / Pago / Vencido / Cancelado), Categoria (select), Período (date range -- por `dueDate` ou `referenceMonth`).
3. Badge de status: PENDING = cinza, OVERDUE = vermelho, PAID = verde, CANCELLED = riscado.
4. Botao "Nova Despesa" abre modal/drawer de criacao.

**Form de criacao (modal):**

Campos em ordem:
1. Descricao (input texto, obrigatório)
2. Categoria (select com as categorias ativas da unit, obrigatório)
3. Valor (input moeda em reais, obrigatório)
4. Vencimento (date picker, obrigatório)
5. Competência (input YYYY-MM, opcional, placeholder "2026-06")
6. Fornecedor (select com opção "Sem fornecedor" como default + "Cadastrar novo...", opcional)
7. Despesa recorrente? (toggle, opcional)
8. Observacoes (textarea, opcional)

**Modal de pagamento:**

Aberto pelo botao "Marcar como pago" no card/linha.
Campos:
- Data do pagamento (default hoje, editável)
- Valor pago (default = valor original, editável)
- Botao confirmar (texto: "Confirmar Pagamento")

**Cadastro de fornecedor (inline):**

Ao selecionar "Cadastrar novo..." no select de Fornecedor, abre mini-form:
- Nome (obrigatório)
- CNPJ/CPF (opcional, com mascara)
Salva e já seleciona o fornecedor criado.

---

## 9. Definition of Done (binario)

```bash
pnpm typecheck && pnpm test:run && pnpm dlx playwright test contas-pagar --reporter=line
```

Playwright E2E deve cobrir:

1. Criar despesa sem fornecedor: descricao + categoria + valor + vencimento -> salvo com status PENDING.
2. Criar despesa com fornecedor existente: fornecedor aparece na lista.
3. Despesa com `dueDate` anterior a hoje aparece com badge OVERDUE (ou status OVERDUE na API).
4. Marcar como pago: modal de pagamento preenche data e valor -> status vira PAID.
5. Tentar pagar uma despesa já PAID -> erro 409 exibido.
6. Cancelar despesa PENDING -> status CANCELLED.
7. Tentar cancelar despesa PAID -> botao desabilitado (ou erro 409).
8. Filtrar por status OVERDUE -> só aparecem vencidas nao pagas.
9. Filtrar por categoria "Aluguel" -> só aparecem despesas dessa categoria.
10. Tentar deletar categoria `isSystem=true` -> recebe erro 403.
11. Criar fornecedor inline no form de despesa -> fornecedor aparece no select.
12. Payable de outra `unitId` nao aparece na lista (guard multi-tenant).

---

## 10. Decisoes fechadas

1. **supplierId é nullable.** Forcsar fornecedor mataria adoção do franqueado leigo. Ele deve poder lançar "Aluguel R$2.000" sem cadastrar fornecedor antes.

2. **OVERDUE por cálculo on-read no MVP.** Mais simples que job cron. Se a lista ficar lenta por volume (>10k payables), migrar para job cron diário que escreve `status=OVERDUE` em lote -- sem breaking change no schema.

3. **isRecurring é flag, nao gera série.** A geracao automática de payables recorrentes (ex.: "criar próxima parcela do aluguel") é futura. No MVP, a flag serve para o operador saber que a despesa se repete e para a spec 11 poder filtrar despesas recorrentes ao projetar fluxo de caixa.

4. **FinancialCategory é flat (nao hierárquica).** Hierarquia contábil (grupos, subgrupos) é desnecessária para o franqueado Kumon. Flat com `kind` (RECEITA/DESPESA) é suficiente para o fluxo de caixa.

5. **Categorias seed sao DESPESA only.** No MVP as categorias default são todas de despesa. Categorias RECEITA (ex.: "Mensalidade", "Taxa de Material") virão de spec 11 se necessário -- por ora, a receita já está capturada via `Invoice` (fluxo 03).

6. **Nao há auditoria de log por acao no MVP.** O `updatedAt` do Payable é suficiente para rastreabilidade básica. Log de auditoria detalhado (quem mudou o quê) fica fora do escopo.

7. **Sem integração Asaas.** Ver §5. A decisao é deliberada e documentada.

8. **`paidAmountCents` pode diferir de `amountCents`.** O franqueado pode pagar com desconto (negociou com o fornecedor) ou pagar a mais (multa bancária). Ambos os campos ficam no Payable. A divergência é informativa para o fluxo de caixa.

---

## 11. Pendências

1. **Transicao OVERDUE -- job vs on-read.** Decidir na Fatia 2. On-read: `status = payable.dueDate < today && payable.status === 'PENDING' ? 'OVERDUE' : payable.status` no service antes de retornar. Job: `prisma.payable.updateMany({ where: { status: 'PENDING', dueDate: { lt: startOfToday() } }, data: { status: 'OVERDUE' } })` em cron diário. Job é preferível para consistência com spec 11 (fluxo de caixa lê status do banco diretamente).

2. **isRecurring -- geracao de série futura.** Quando o cliente pedir, implementar: ao criar Payable com `isRecurring=true`, gerar N cópias adiantadas (ex.: 12 meses). Avaliar se usa `referenceMonth` como chave de idempotência para evitar duplicatas.

3. **Categorias RECEITA.** Se spec 11 precisar de categorias de receita (ex.: "Mensalidade", "Taxa de Matrícula") como entidades no `FinancialCategory`, criar seed adicional no onboarding. Por ora, a receita já vem do `Invoice` e nao precisa de categoria custom.

4. **Supplier -- busca por CNPJ.** Em iteracao futura, ao digitar CNPJ no cadastro de fornecedor, consultar BrasilAPI para preencher o nome automaticamente (igual ao onboarding da Unit).

5. **Soft-delete de Payable.** No MVP, CANCELLED é o "deletado". Se o produto evoluir para exclusao permanente, adicionar `deletedAt` e filtrar nas queries.

6. **Paginacao na lista.** O MVP pode começar sem paginacao (limite seguro: últimos 12 meses). Adicionar cursor-based pagination quando lista ultrapassar 200 itens.

7. **Integração com spec 11 (Fluxo de Caixa).** `Payable` é a fonte de saidas. Spec 11 consumirá `payables` filtrados por `unitId + referenceMonth` (ou `dueDate` em range). Confirmar interface ao escrever spec 11.

---

## 12. Fatiamento em Task Contracts

### Fatia 1 -- Schema + migration + seed de categorias

**Objetivo:** criar os 3 models novos, os 2 enums, as relacoes em `Unit`, e o seed de categorias Kumon no onboarding.

**Scope in:**
- `prisma/schema.prisma` -- enum `CategoryKind`, enum `PayableStatus`, models `FinancialCategory`, `Supplier`, `Payable`; relacoes adicionadas em `Unit`
- `prisma/migrations/` -- migration `add-payables`
- `src/lib/seeds/financial-categories.ts` -- array `KUMON_DEFAULT_CATEGORIES` + funcao `seedDefaultCategories(unitId)`
- Ajuste em `src/lib/services/unit.service.ts` (ou onde `createUnit` é chamado) para invocar `seedDefaultCategories` após criar a Unit

**Nao incluido:** service de payables, API routes, UI.

**DoD:**
```bash
pnpm prisma migrate dev --name add-payables && pnpm prisma generate && pnpm typecheck
```

---

### Fatia 2 -- Service de payables + categorias + fornecedores + testes

**Objetivo:** implementar `PayableService`, `FinancialCategoryService` e `SupplierService` com CRUD completo, guard de `unitId`, logica de OVERDUE e transicao "marcar como pago".

**Scope in:**
- `src/lib/services/payable.service.ts` (novo)
  - `createPayable(unitId, data)` -- valida `categoryId`, `supplierId` (opcional), `amountCents > 0`
  - `listPayables(unitId, filters)` -- filtros: status, categoryId, dateRange, referenceMonth; calcula OVERDUE on-read
  - `markAsPaid(unitId, id, { paidAt?, paidAmountCents? })` -- guard status, set PAID
  - `cancelPayable(unitId, id)` -- guard status, set CANCELLED
- `src/lib/services/financial-category.service.ts` (novo)
  - `listCategories(unitId, kind?)` -- apenas ativas
  - `createCategory(unitId, data)`
  - `deactivateCategory(unitId, id)` -- guard `isSystem=true` -> rejeitar
- `src/lib/services/supplier.service.ts` (novo)
  - `listSuppliers(unitId)`
  - `createSupplier(unitId, data)` -- criptografa `documentEnc`
- Testes unitarios: `payable.service.test.ts`, `financial-category.service.test.ts`

**Nao incluido:** API routes, UI.

**DoD:**
```bash
pnpm test:run --reporter=verbose src/lib/services/payable.service.test.ts src/lib/services/financial-category.service.test.ts
```

---

### Fatia 3 -- API routes

**Objetivo:** expor endpoints REST para a UI consumir.

**Scope in:**
- `src/app/api/payables/route.ts` -- GET (lista com filtros) + POST (criar)
- `src/app/api/payables/[id]/route.ts` -- GET (detalhe) + PATCH (marcar pago / cancelar) + DELETE (soft via CANCELLED)
- `src/app/api/financial-categories/route.ts` -- GET (listar por kind) + POST (criar)
- `src/app/api/financial-categories/[id]/route.ts` -- PATCH (editar nome/isActive) -- guard isSystem
- `src/app/api/suppliers/route.ts` -- GET + POST
- `src/app/api/suppliers/[id]/route.ts` -- GET + PATCH
- Autenticacao Clerk + guard `unitId` em todos os endpoints
- Validacao com Zod nos bodies de entrada

**Nao incluido:** UI, testes E2E.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/payables src/app/api/financial-categories src/app/api/suppliers
```

---

### Fatia 4 -- UI: lista + form de criacao + modais

**Objetivo:** tela de contas a pagar com lista filtrada, form de criacao, modal de pagamento e cadastro inline de fornecedor.

**Scope in:**
- `src/app/(app)/financeiro/contas-pagar/page.tsx` (novo -- lista principal)
- `src/app/(app)/financeiro/contas-pagar/components/PayableTable.tsx`
- `src/app/(app)/financeiro/contas-pagar/components/PayableFilters.tsx` (status, categoria, periodo)
- `src/app/(app)/financeiro/contas-pagar/components/PayableForm.tsx` (modal/drawer de criacao)
- `src/app/(app)/financeiro/contas-pagar/components/PayModal.tsx` (modal marcar como pago)
- `src/app/(app)/financeiro/contas-pagar/components/SupplierInlineForm.tsx` (cadastro rapido)
- Badge de status com cores: PENDING=cinza, OVERDUE=vermelho, PAID=verde, CANCELLED=riscado
- Responsivo 375/768/1440, Alfabeto DS

**Nao incluido:** configuracao de categorias (tela separada futura), integracao spec 11.

**DoD:**
```bash
pnpm typecheck && pnpm dlx playwright test contas-pagar --reporter=line
```
E2E cobre todos os cenários do §9.

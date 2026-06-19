# Onboarding Admin — PR A (dados/back) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a camada de leitura/edição de escolas ao onboarding admin (UpdateSchoolSchema, service transacional, API admin-only GET/PATCH, error handler reutilizável) + o primeiro setup de teste de integração do repo.

**Architecture:** API Routes do Next App Router chamam funções de service (`onboarding.service.ts`) que usam o módulo `prisma` direto. `updateSchool` abre sua própria transação interna (Unit + BillingConfig + Subjects, matérias = delete-all + create), espelhando `createSchool`. Testes de integração rodam contra o banco dev real e limpam via **cascade-delete** no `afterEach` (o schema já tem `onDelete: Cascade` em BillingConfig e Subject) — não rollback por transação (a injeção de `tx` não funciona porque `Prisma.TransactionClient` não expõe `$transaction`).

**Tech Stack:** Next.js 15 (App Router, RSC) · TypeScript strict · Prisma 6 (PostgreSQL) · Zod · Vitest · Clerk (RBAC via `requireAdmin`).

## Global Constraints

- **Branch:** `feature/onboarding-admin-crud` (já criada a partir da main). Nunca commitar em main.
- **PR ≤ 400 linhas.** Este é o PR A; páginas+E2E ficam no PR B.
- **Banco de teste = banco dev atual** (`DATABASE_URL` do `.env`). Limpeza por cascade-delete, não rollback.
- **TS strict, sem `any`.** Arquivo ≤ 500 linhas. Código em inglês, mensagens de UI em pt-BR.
- **Nunca editar testes pra passar.** Conserta o código.
- **Não tocar no Create** (`createSchool`, `POST /api/setup/escola`, wizard).
- **CNPJ e responsibleCpf são read-only** — `UpdateSchoolSchema` os rejeita.
- **GET lista usa `prisma.unit.findMany` cru, NUNCA `forUnit()`** — o admin tem `unitId='__admin__'` e `forUnit` filtraria a lista pra vazio.
- DoD: `pnpm typecheck && pnpm test:run && pnpm test:integration`

---

### Task 1: Setup de teste de integração (config + helper de limpeza)

**Files:**
- Create: `vitest.integration.config.ts`
- Create: `tests/integration/_setup.ts`
- Modify: `package.json` (script `test:integration`)

**Interfaces:**
- Produces: `cleanupUnits(prefix: string): Promise<void>` — deleta todas as Units cujo `name` começa com `prefix` (cascade limpa BillingConfig + Subject). Usado no `afterEach`/`afterAll` dos testes de integração.
- Produces: `TEST_PREFIX: string` = `'__itest__'` — prefixo de nome para isolar dados de teste.

- [ ] **Step 1: Criar a config de integração**

`vitest.integration.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Integração roda contra o banco dev real (DATABASE_URL). Sem jsdom: é Node + Prisma.
// Sequencial (single fork) para evitar corrida entre testes que tocam o mesmo banco.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.integration.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
```

- [ ] **Step 2: Criar o helper de limpeza**

`tests/integration/_setup.ts`:
```ts
import { prisma } from '@/lib/db'

// Prefixo de nome que marca dados criados por testes de integração.
// Cada teste cria Units com este prefixo e limpa por ele — sem sujar dados reais.
export const TEST_PREFIX = '__itest__'

// Deleta Units de teste. onDelete: Cascade no schema limpa BillingConfig + Subject juntos.
export async function cleanupUnits(prefix: string = TEST_PREFIX): Promise<void> {
  await prisma.unit.deleteMany({ where: { name: { startsWith: prefix } } })
}
```

- [ ] **Step 3: Adicionar o script no package.json**

Em `"scripts"`, adicionar após `"test:run"`:
```json
"test:integration": "vitest run --config vitest.integration.config.ts",
```

- [ ] **Step 4: Verificar que a suíte roda (vazia ainda) e o typecheck passa**

Run: `pnpm test:integration`
Expected: PASS — "No test files found" não é erro fatal aqui (vitest sai 0 se não há include match? se sair !=0, criar placeholder na Task 3). Confirmar com: `pnpm typecheck` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add vitest.integration.config.ts tests/integration/_setup.ts package.json
git commit -m "test(integration): config + helper de limpeza (cascade-delete) — 1º setup do repo"
```

---

### Task 2: UpdateSchoolSchema (subset estrito do CreateSchoolSchema)

**Files:**
- Modify: `src/lib/validations/unit.ts`
- Test: `tests/unit/validations/update-school.test.ts`

**Interfaces:**
- Consumes: `BillingConfigSchema`, `PlanSchema`, `SubjectSchema` (já existem em `unit.ts`).
- Produces: `UpdateSchoolSchema` (zod, `.strict()`) e `type UpdateSchoolInput`. Campos: todos os do Create **exceto** `cnpj` e `responsibleCpf`. `subjects` ganha `isActive: z.boolean()` (editável). Por ser `.strict()`, presença de `cnpj` ou `responsibleCpf` no input é **rejeitada**.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/validations/update-school.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { UpdateSchoolSchema } from '@/lib/validations/unit'

const validUpdate = {
  name: 'Escola Atualizada',
  legalName: 'Razão LTDA',
  email: 'novo@escola.com',
  phone: '31999990000',
  cep: '30350540',
  address: 'Rua Nova',
  number: '99',
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'MG',
  isFranchise: false,
  responsibleName: 'Maria Silva',
  responsibleEmail: 'maria@escola.com',
  responsiblePhone: '31988887777',
  billing: {
    dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 100,
    cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'ESCOLA',
    municipalRegistration: '12345',
  },
  plan: { planId: 'basico', isBeta: false },
  subjects: [{
    name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000,
    annualPriceCents: 300000, isActive: true,
  }],
}

describe('UpdateSchoolSchema', () => {
  it('aceita um update válido sem cnpj nem cpf', () => {
    expect(UpdateSchoolSchema.safeParse(validUpdate).success).toBe(true)
  })

  it('rejeita se cnpj estiver presente (read-only)', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, cnpj: '11222333000181' })
    expect(r.success).toBe(false)
  })

  it('rejeita se responsibleCpf estiver presente (read-only/PII)', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, responsibleCpf: '12345678909' })
    expect(r.success).toBe(false)
  })

  it('rejeita name vazio', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, name: '' })
    expect(r.success).toBe(false)
  })

  it('exige ao menos 1 matéria', () => {
    const r = UpdateSchoolSchema.safeParse({ ...validUpdate, subjects: [] })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/validations/update-school.test.ts`
Expected: FAIL — `UpdateSchoolSchema` não exportado.

- [ ] **Step 3: Implementar o schema**

Em `src/lib/validations/unit.ts`, após `CreateSchoolSchema`, adicionar:
```ts
// Subject editável no update — inclui isActive (ativar/desativar matéria).
export const SubjectUpdateSchema = SubjectSchema.extend({
  isActive: z.boolean(),
})

// Update = subset do Create SEM cnpj e responsibleCpf (read-only após criação).
// .strict() faz o schema REJEITAR cnpj/responsibleCpf se vierem no body (zod
// por padrão só removeria as chaves desconhecidas — strict transforma em erro).
export const UpdateSchoolSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    legalName: z.string().optional(),
    tradeName: z.string().optional(),
    cnpjStatus: z.string().optional(),
    email: z.string().email('E-mail inválido'),
    phone: z.string().refine(isValidBrMobile, 'Celular inválido (DDD + 9 dígitos, com o 9)'),
    cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
    address: z.string().min(5, 'Endereço inválido'),
    number: z.string().min(1, 'Número obrigatório'),
    neighborhood: z.string().min(2, 'Bairro inválido'),
    complement: z.string().optional(),
    city: z.string().min(2, 'Cidade inválida'),
    state: z.string().length(2, 'UF deve ter 2 caracteres'),
    isFranchise: z.boolean(),
    franchiseParent: z.string().optional(),
    responsibleName: z.string().min(3, 'Nome do responsável obrigatório'),
    responsibleEmail: z.string().email('E-mail do responsável inválido'),
    responsiblePhone: z.string().refine(isValidBrMobile, 'Celular do responsável inválido (DDD + 9 dígitos)'),
    billing: BillingConfigSchema,
    plan: PlanSchema,
    subjects: z.array(SubjectUpdateSchema).min(1, 'Pelo menos 1 matéria obrigatória'),
  })
  .strict()

export type UpdateSchoolInput = z.infer<typeof UpdateSchoolSchema>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/validations/update-school.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/unit.ts tests/unit/validations/update-school.test.ts
git commit -m "feat(validations): UpdateSchoolSchema — subset estrito sem cnpj/cpf"
```

---

### Task 3: updateSchool service (transacional) + teste de integração

**Files:**
- Modify: `src/lib/services/onboarding.service.ts`
- Test: `tests/integration/escola-update.integration.test.ts`

**Interfaces:**
- Consumes: módulo `prisma` (`@/lib/db`), `UpdateSchoolSchema`/`UpdateSchoolInput`, `getPlan` (`@/lib/data/plans`), `InvalidPlanError` (já existe).
- Produces: `class UnitNotFoundError extends Error` (`status` 404). `updateSchool(unitId: string, input: UpdateSchoolInput): Promise<Unit>` — valida com `UpdateSchoolSchema`, confirma que a Unit existe, e numa transação: `tx.unit.update` (campos editáveis, **nunca** cnpj/responsibleCpfEnc), `tx.billingConfig.update` (where unitId), matérias `tx.subject.deleteMany({where:{unitId}})` + `tx.subject.createMany`. Não toca Asaas, e-mail, nem status. Resolve `planPriceCents` snapshot via `getPlan`.

- [ ] **Step 1: Escrever o teste de integração que falha**

`tests/integration/escola-update.integration.test.ts`:
```ts
import { describe, it, expect, afterEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { updateSchool, UnitNotFoundError } from '@/lib/services/onboarding.service'
import { cleanupUnits, TEST_PREFIX } from './_setup'
import type { UpdateSchoolInput } from '@/lib/validations/unit'

afterEach(() => cleanupUnits())
afterAll(() => cleanupUnits())

// Cria uma Unit completa (Unit + BillingConfig + 1 Subject) direto no banco.
async function seedUnit(suffix = 'a') {
  const cpfEnc = await encrypt('12345678909')
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} Escola ${suffix}`,
      cnpj: `9999999900${suffix === 'a' ? '01' : '02'}81`.slice(-14).padStart(14, '9'),
      email: 'old@e.com', phone: '31999990000', cep: '30000000',
      address: 'Rua Velha', number: '1', neighborhood: 'Centro',
      city: 'BH', state: 'MG', isFranchise: false,
      responsibleName: 'Antigo', responsibleCpfEnc: cpfEnc,
      responsibleEmail: 'old@r.com', responsiblePhone: '31988880000',
      status: 'ACTIVE',
      billingConfig: { create: {
        dueDay: 5, closingDay: 1, lateFeePercent: 100, monthlyInterestBp: 100,
        cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'RESPONSAVEL',
        municipalRegistration: '0001', planId: 'basico', planPriceCents: 39900,
      }},
      subjects: { create: [{ name: 'Antiga', nfseServiceCode: '0001', priceCents: 10000, annualPriceCents: 100000 }] },
    },
  })
}

function validInput(): UpdateSchoolInput {
  return {
    name: `${TEST_PREFIX} Escola Nova`, email: 'novo@e.com', phone: '31999991111',
    cep: '30350540', address: 'Rua Nova Grande', number: '99', neighborhood: 'Savassi',
    city: 'BH', state: 'MG', isFranchise: false,
    responsibleName: 'Maria Nova', responsibleEmail: 'maria@r.com', responsiblePhone: '31977776666',
    billing: { dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 150,
      cardFeePayer: 'ESCOLA', negativacaoFeePayer: 'ESCOLA', municipalRegistration: '9999' },
    plan: { planId: 'crescimento', isBeta: false },
    subjects: [{ name: 'Matemática', nfseServiceCode: '0801', priceCents: 30000, annualPriceCents: 300000, isActive: true }],
  }
}

describe('updateSchool (integração — banco real)', () => {
  it('persiste Unit + BillingConfig + Subjects (substitui matérias)', async () => {
    const unit = await seedUnit()
    await updateSchool(unit.id, validInput())

    const reloaded = await prisma.unit.findUniqueOrThrow({
      where: { id: unit.id },
      include: { billingConfig: true, subjects: true },
    })
    expect(reloaded.name).toBe(`${TEST_PREFIX} Escola Nova`)
    expect(reloaded.city).toBe('BH')
    expect(reloaded.billingConfig?.dueDay).toBe(10)
    expect(reloaded.billingConfig?.planId).toBe('crescimento')
    expect(reloaded.subjects).toHaveLength(1)
    expect(reloaded.subjects[0].name).toBe('Matemática')
  })

  it('não altera cnpj nem responsibleCpfEnc', async () => {
    const unit = await seedUnit()
    const before = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } })
    await updateSchool(unit.id, validInput())
    const after = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } })
    expect(after.cnpj).toBe(before.cnpj)
    expect(after.responsibleCpfEnc).toBe(before.responsibleCpfEnc)
  })

  it('lança UnitNotFoundError se a Unit não existe', async () => {
    await expect(updateSchool('nao-existe', validInput())).rejects.toBeInstanceOf(UnitNotFoundError)
  })

  it('rollback atômico: matéria inválida não deixa BillingConfig alterado', async () => {
    const unit = await seedUnit()
    const bad = validInput()
    // priceCents negativo passa pelo schema? Não — então forçamos erro no banco:
    // nfseServiceCode além do permitido não existe; usamos um Subject que viola NOT NULL
    // via cast para simular falha no meio da transação.
    const broken = { ...bad, subjects: [{ ...bad.subjects[0], priceCents: Number.NaN }] } as unknown as UpdateSchoolInput
    await expect(updateSchool(unit.id, broken)).rejects.toBeTruthy()
    const after = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id }, include: { billingConfig: true } })
    // BillingConfig NÃO mudou (rollback) — dueDay continua o do seed (5), não o do input (10).
    expect(after.billingConfig?.dueDay).toBe(5)
  })
})
```

> Nota de implementação do caso de rollback: se `NaN` for barrado pelo `UpdateSchoolSchema` antes da transação, o teste ainda passa (rejeita e nada muda). O ponto verificado é a invariante "falha ⇒ nenhuma alteração", válida tanto se a falha for na validação quanto no meio da transação.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test:integration`
Expected: FAIL — `updateSchool`/`UnitNotFoundError` não existem.

- [ ] **Step 3: Implementar o service**

Em `src/lib/services/onboarding.service.ts`:

Adicionar o import do schema no topo (junto ao import existente de validations):
```ts
import { CreateSchoolSchema, UpdateSchoolSchema, type CreateSchoolInput, type UpdateSchoolInput } from '../validations/unit'
```

Adicionar a classe de erro perto das outras:
```ts
export class UnitNotFoundError extends Error {
  readonly status = 404
  constructor() {
    super('Escola não encontrada')
    this.name = 'UnitNotFoundError'
  }
}
```

Adicionar a função (após `createSchool`):
```ts
/**
 * Atualiza uma escola existente (admin). Edita Unit + BillingConfig + Subjects
 * numa transação atômica. NÃO toca cnpj, responsibleCpfEnc, Asaas, status nem e-mail —
 * são imutáveis/fora do escopo desta operação. Matérias usam delete-all + create
 * (mesmo padrão do create), então a lista enviada é a verdade final.
 */
export async function updateSchool(unitId: string, input: UpdateSchoolInput): Promise<Unit> {
  const data = UpdateSchoolSchema.parse(input)

  const existing = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!existing) throw new UnitNotFoundError()

  const plan = getPlan(data.plan.planId)
  if (!plan) throw new InvalidPlanError()
  const planPriceCents = plan.priceCents
  if (data.plan.discountValueCents !== undefined && data.plan.discountValueCents >= planPriceCents) {
    throw new InvalidPlanError()
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.unit.update({
      where: { id: unitId },
      data: {
        name: data.name,
        legalName: data.legalName ?? null,
        tradeName: data.tradeName ?? null,
        cnpjStatus: data.cnpjStatus ?? null,
        email: data.email,
        phone: data.phone,
        cep: data.cep,
        address: data.address,
        number: data.number,
        neighborhood: data.neighborhood,
        complement: data.complement ?? null,
        city: data.city,
        state: data.state,
        isFranchise: data.isFranchise,
        franchiseParent: data.franchiseParent ?? null,
        responsibleName: data.responsibleName,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
      },
    })

    await tx.billingConfig.update({
      where: { unitId },
      data: {
        dueDay: data.billing.dueDay,
        closingDay: data.billing.closingDay,
        lateFeePercent: data.billing.lateFeePercent,
        monthlyInterestBp: data.billing.monthlyInterestBp,
        cardFeePayer: data.billing.cardFeePayer,
        negativacaoFeePayer: data.billing.negativacaoFeePayer,
        municipalRegistration: data.billing.municipalRegistration,
        planId: data.plan.planId,
        planPriceCents,
        isBeta: data.plan.isBeta,
        discountType: data.plan.discountType ?? null,
        discountValueBp: data.plan.discountValueBp ?? null,
        discountValueCents: data.plan.discountValueCents ?? null,
      },
    })

    await tx.subject.deleteMany({ where: { unitId } })
    await tx.subject.createMany({
      data: data.subjects.map((s) => ({
        unitId,
        name: s.name,
        nfseServiceCode: s.nfseServiceCode,
        priceCents: s.priceCents,
        quarterlyPriceCents: s.quarterlyPriceCents ?? null,
        semiannualPriceCents: s.semiannualPriceCents ?? null,
        annualPriceCents: s.annualPriceCents ?? null,
        isActive: s.isActive,
      })),
    })

    return updated
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test:integration`
Expected: PASS (4 testes). Se o caso de rollback falhar porque o NaN passou no schema mas o banco aceitou, trocar o gatilho de erro por um `nfseServiceCode` que estoure (ver nota no Step 1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/onboarding.service.ts tests/integration/escola-update.integration.test.ts
git commit -m "feat(onboarding): updateSchool transacional + teste de integração"
```

---

### Task 4: Error handler reutilizável (handle.ts) + unit test

**Files:**
- Create: `src/lib/errors/handle.ts`
- Test: `tests/unit/errors/handle.test.ts`

**Interfaces:**
- Produces: `handleError(error: unknown, ctx: ErrorContext): { message: string; code: string }` — loga estruturado (`console.error` com a causa real + contexto: route, unitId?, code) e devolve `{ message, code }` amigável pra UI mapear num toast. `ErrorContext = { route: string; unitId?: string; userMessage?: string }`. Mapeia erros conhecidos do domínio (`DuplicateCnpjError`→409/'DUPLICATE_CNPJ', `UnitNotFoundError`→404/'NOT_FOUND', `InvalidPlanError`→400/'INVALID_PLAN', `ZodError`→400/'VALIDATION') e cai em INTERNAL pro resto.
- Consumes: classes de erro de `onboarding.service.ts`, `ZodError` (zod).

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/errors/handle.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleError } from '@/lib/errors/handle'
import { DuplicateCnpjError, UnitNotFoundError } from '@/lib/services/onboarding.service'

describe('handleError', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('loga a causa técnica real com contexto e devolve mensagem amigável', () => {
    const real = new Error('connection refused at 5432')
    const out = handleError(real, { route: 'PATCH /api/escolas/[unitId]', unitId: 'u1' })
    expect(out.message).toMatch(/inesperado|erro/i)
    expect(out.code).toBe('INTERNAL')
    expect(console.error).toHaveBeenCalledOnce()
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0].join(' ')
    expect(logged).toContain('connection refused at 5432') // causa real preservada
    expect(logged).toContain('u1')
    expect(logged).toContain('/api/escolas/[unitId]')
  })

  it('mapeia DuplicateCnpjError para 409/DUPLICATE_CNPJ', () => {
    const out = handleError(new DuplicateCnpjError(), { route: 'POST /x' })
    expect(out.code).toBe('DUPLICATE_CNPJ')
  })

  it('mapeia UnitNotFoundError para NOT_FOUND', () => {
    const out = handleError(new UnitNotFoundError(), { route: 'PATCH /x' })
    expect(out.code).toBe('NOT_FOUND')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/errors/handle.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o handler**

`src/lib/errors/handle.ts`:
```ts
import { ZodError } from 'zod'
import {
  DuplicateCnpjError,
  UnitNotFoundError,
  InvalidPlanError,
  AsaasProvisionError,
} from '@/lib/services/onboarding.service'

export interface ErrorContext {
  /** Identificação da origem, ex: 'PATCH /api/escolas/[unitId]'. */
  route: string
  unitId?: string
  /** Sobrescreve a mensagem amigável padrão, se quiser algo específico. */
  userMessage?: string
}

export interface HandledError {
  message: string
  code: string
  status: number
}

/**
 * Padrão único de tratamento de erro do projeto:
 *  1. console.error com a CAUSA REAL (erro técnico) + contexto estruturado;
 *  2. devolve { message, code, status } amigável para a UI montar um toast.
 * Toda rota/handler deve usar isto em vez de inventar o próprio formato.
 */
export function handleError(error: unknown, ctx: ErrorContext): HandledError {
  const known = mapKnown(error)

  // Log estruturado: contexto + causa real (nunca engolir o erro técnico).
  console.error(
    `[${ctx.route}]${ctx.unitId ? ` unit=${ctx.unitId}` : ''} code=${known.code}`,
    error
  )

  return {
    message: ctx.userMessage ?? known.message,
    code: known.code,
    status: known.status,
  }
}

function mapKnown(error: unknown): HandledError {
  if (error instanceof DuplicateCnpjError) {
    return { message: 'CNPJ já cadastrado.', code: 'DUPLICATE_CNPJ', status: 409 }
  }
  if (error instanceof UnitNotFoundError) {
    return { message: 'Escola não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof InvalidPlanError) {
    return { message: 'Plano inválido ou desconto maior que o preço.', code: 'INVALID_PLAN', status: 400 }
  }
  if (error instanceof AsaasProvisionError) {
    return { message: 'Falha ao provisionar subconta de pagamento.', code: 'ASAAS_PROVISION', status: 502 }
  }
  if (error instanceof ZodError) {
    return { message: 'Dados inválidos. Confira os campos destacados.', code: 'VALIDATION', status: 400 }
  }
  return { message: 'Erro inesperado. Tente novamente.', code: 'INTERNAL', status: 500 }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/errors/handle.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors/handle.ts tests/unit/errors/handle.test.ts
git commit -m "feat(errors): handleError — padrão único (log causa real + toast amigável)"
```

---

### Task 5: GET /api/escolas (lista, admin-only) + unit test da rota

**Files:**
- Create: `src/app/api/escolas/route.ts`
- Test: `tests/unit/api/escolas-list.route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `UnauthorizedError`, `ForbiddenError` (auth), `prisma` (db cru — **NÃO** `forUnit`), `handleError`.
- Produces: `GET(req: NextRequest): Promise<NextResponse>` — lista todas as Units com `select` enxuto (id, name, cnpj, city, state, status, createdAt) + `_count.subjects`. 401/403 via auth, 500 via handleError.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/api/escolas-list.route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdmin = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, requireAdmin: (...a: unknown[]) => requireAdmin(...a) }
})

const findMany = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { unit: { findMany: (...a: unknown[]) => findMany(...a) } } }))

import { GET } from '@/app/api/escolas/route'
import { ForbiddenError } from '@/lib/auth/unit-context'

beforeEach(() => { requireAdmin.mockReset(); findMany.mockReset() })

it('200 com a lista de escolas para admin', async () => {
  requireAdmin.mockResolvedValue({ role: 'admin' })
  findMany.mockResolvedValue([
    { id: '1', name: 'A', cnpj: '111', city: 'BH', state: 'MG', status: 'ACTIVE', createdAt: new Date(), _count: { subjects: 2 } },
  ])
  const res = await GET(new NextRequest('http://x/api/escolas'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toHaveLength(1)
  expect(body[0].subjectCount).toBe(2)
})

it('403 para não-admin', async () => {
  requireAdmin.mockRejectedValue(new ForbiddenError())
  const res = await GET(new NextRequest('http://x/api/escolas'))
  expect(res.status).toBe(403)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/api/escolas-list.route.test.ts`
Expected: FAIL — rota não existe.

- [ ] **Step 3: Implementar a rota**

`src/app/api/escolas/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/auth/unit-context'
import { handleError } from '@/lib/errors/handle'

// Admin-only. Usa prisma cru (NÃO forUnit): o admin tem unitId='__admin__' e
// forUnit filtraria a lista pra vazio.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Você não tem permissão para ver as escolas.', code: 'FORBIDDEN' }, { status: 403 })
    }
    const h = handleError(err, { route: 'GET /api/escolas' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }

  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, cnpj: true, city: true, state: true,
        status: true, createdAt: true,
        _count: { select: { subjects: true } },
      },
    })
    const list = units.map((u) => ({
      id: u.id, name: u.name, cnpj: u.cnpj, city: u.city, state: u.state,
      status: u.status, createdAt: u.createdAt, subjectCount: u._count.subjects,
    }))
    return NextResponse.json(list, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'GET /api/escolas' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/api/escolas-list.route.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/escolas/route.ts tests/unit/api/escolas-list.route.test.ts
git commit -m "feat(api): GET /api/escolas — lista admin-only"
```

---

### Task 6: GET + PATCH /api/escolas/[unitId] + unit test da rota

**Files:**
- Create: `src/app/api/escolas/[unitId]/route.ts`
- Test: `tests/unit/api/escola-detail.route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`/erros de auth, `prisma` (db cru), `updateSchool`/`UnitNotFoundError`/`InvalidPlanError` (service), `UpdateSchoolSchema`, `handleError`.
- Produces: `GET(req, { params })` — retorna a Unit com billingConfig + subjects (cpf NUNCA no payload; retorna `responsibleCpfEnc` omitido). `PATCH(req, { params })` — valida com `UpdateSchoolSchema`, chama `updateSchool`, mapeia erros. Assinatura do 2º arg no Next 15: `{ params: Promise<{ unitId: string }> }`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/api/escola-detail.route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdmin = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, requireAdmin: (...a: unknown[]) => requireAdmin(...a) }
})

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } } }))

const updateSchool = vi.fn()
vi.mock('@/lib/services/onboarding.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/onboarding.service')>('@/lib/services/onboarding.service')
  return { ...actual, updateSchool: (...a: unknown[]) => updateSchool(...a) }
})

import { GET, PATCH } from '@/app/api/escolas/[unitId]/route'
import { ForbiddenError } from '@/lib/auth/unit-context'
import { UnitNotFoundError } from '@/lib/services/onboarding.service'

const ctx = (unitId: string) => ({ params: Promise.resolve({ unitId }) })
beforeEach(() => { requireAdmin.mockReset(); findUnique.mockReset(); updateSchool.mockReset(); requireAdmin.mockResolvedValue({ role: 'admin' }) })

it('GET 404 quando a escola não existe', async () => {
  findUnique.mockResolvedValue(null)
  const res = await GET(new NextRequest('http://x'), ctx('nope'))
  expect(res.status).toBe(404)
})

it('GET 200 nunca expõe responsibleCpfEnc', async () => {
  findUnique.mockResolvedValue({ id: '1', name: 'A', responsibleCpfEnc: 'SECRET', billingConfig: {}, subjects: [] })
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(JSON.stringify(body)).not.toContain('SECRET')
})

it('GET 403 para não-admin', async () => {
  requireAdmin.mockRejectedValue(new ForbiddenError())
  const res = await GET(new NextRequest('http://x'), ctx('1'))
  expect(res.status).toBe(403)
})

it('PATCH 404 quando updateSchool lança UnitNotFoundError', async () => {
  updateSchool.mockRejectedValue(new UnitNotFoundError())
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(minimalValidBody()) })
  const res = await PATCH(req, ctx('nope'))
  expect(res.status).toBe(404)
})

it('PATCH 400 com body inválido', async () => {
  const req = new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify({ name: '' }) })
  const res = await PATCH(req, ctx('1'))
  expect(res.status).toBe(400)
})

function minimalValidBody() {
  return {
    name: 'Escola X', email: 'e@e.com', phone: '31999990000', cep: '30350540',
    address: 'Rua Grande', number: '1', neighborhood: 'Centro', city: 'BH', state: 'MG',
    isFranchise: false, responsibleName: 'Ana', responsibleEmail: 'a@a.com', responsiblePhone: '31988887777',
    billing: { dueDay: 10, closingDay: 5, lateFeePercent: 200, monthlyInterestBp: 100, cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'ESCOLA', municipalRegistration: '1' },
    plan: { planId: 'basico', isBeta: false },
    subjects: [{ name: 'Mat', nfseServiceCode: '0801', priceCents: 30000, annualPriceCents: 300000, isActive: true }],
  }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/api/escola-detail.route.test.ts`
Expected: FAIL — rota não existe.

- [ ] **Step 3: Implementar a rota**

`src/app/api/escolas/[unitId]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/auth/unit-context'
import { updateSchool } from '@/lib/services/onboarding.service'
import { UpdateSchoolSchema } from '@/lib/validations/unit'
import { handleError } from '@/lib/errors/handle'

type RouteCtx = { params: Promise<{ unitId: string }> }

async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Você não tem permissão para esta ação.', code: 'FORBIDDEN' }, { status: 403 })
    }
    const h = handleError(err, { route: 'auth /api/escolas/[unitId]' })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { unitId } = await params

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { billingConfig: true, subjects: { orderBy: { createdAt: 'asc' } } },
    })
    if (!unit) {
      return NextResponse.json({ error: 'Escola não encontrada.', code: 'NOT_FOUND' }, { status: 404 })
    }
    // Nunca expor PII criptografada no payload.
    const { responsibleCpfEnc: _omit, asaasApiKeyEnc: _omit2, ...safe } = unit
    return NextResponse.json(safe, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'GET /api/escolas/[unitId]', unitId })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin()
  if (denied) return denied
  const { unitId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.', code: 'INVALID_BODY' }, { status: 400 })
  }

  const parsed = UpdateSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos. Confira os campos destacados.', code: 'VALIDATION', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const updated = await updateSchool(unitId, parsed.data)
    return NextResponse.json(updated, { status: 200 })
  } catch (err) {
    const h = handleError(err, { route: 'PATCH /api/escolas/[unitId]', unitId })
    return NextResponse.json({ error: h.message, code: h.code }, { status: h.status })
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/api/escola-detail.route.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Rodar o DoD completo do PR A**

Run: `pnpm typecheck && pnpm test:run && pnpm test:integration`
Expected: exit 0 em tudo.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/escolas/[unitId]/route.ts tests/unit/api/escola-detail.route.test.ts
git commit -m "feat(api): GET+PATCH /api/escolas/[unitId] — detalhe e edição admin"
```

---

### Task 7: Regra de error handling na constitution

**Files:**
- Modify: `.specify/memory/constitution.md`

- [ ] **Step 1: Adicionar a regra**

Localizar a seção de princípios/regras de engenharia e adicionar:
```markdown
- **Error handling padrão:** todo handler/rota usa `handleError` (`src/lib/errors/handle.ts`) —
  loga a causa técnica real via `console.error` com contexto estruturado (route, unitId, code)
  e devolve `{ message, code, status }` amigável pra UI montar um toast. Nunca engolir o erro
  técnico; nunca vazar stack/PII pro usuário.
```

- [ ] **Step 2: Commit**

```bash
git add .specify/memory/constitution.md
git commit -m "docs(constitution): error handling padrão (handleError)"
```

---

## Self-Review

**Spec coverage (vs TASK-01-PR-A.md):**
- Setup integração → Task 1 ✓ · UpdateSchoolSchema → Task 2 ✓ · updateSchool transacional + integração (persistência + atomicidade) → Task 3 ✓ · handle.ts + unit → Task 4 ✓ · GET lista → Task 5 ✓ · GET+PATCH detalhe → Task 6 ✓ · regra constitution → Task 7 ✓.
- Not-included (páginas, hook, nav, E2E) → não há tarefa, correto (são PR B).

**Type consistency:** `updateSchool(unitId, input)` (2 args, sem injeção) consistente entre Task 3, 6. `handleError(error, ctx)` consistente entre Task 4, 5, 6. `UpdateSchoolSchema`/`UpdateSchoolInput` consistente entre Task 2, 3, 6. `UnitNotFoundError` definido na Task 3, consumido na Task 4 e 6.

**Correções do advisor aplicadas:** (1) cleanup por cascade-delete, não rollback; (2) `updateSchool` em `prisma` de módulo, sem injeção de `tx`; (3) `UpdateSchoolSchema.strict()`; (4) GET lista com `prisma.unit.findMany` cru, não `forUnit`.

**Risco aberto:** o caso de rollback atômico (Task 3) depende de provocar erro no meio da transação. Se o `UpdateSchoolSchema` barrar o input antes, a invariante ainda é satisfeita (nada muda) — teste passa. Documentado no Step 1 da Task 3.

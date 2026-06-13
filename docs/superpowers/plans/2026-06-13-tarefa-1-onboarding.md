# Tarefa 1 — Onboarding da Escola — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin IX cadastra uma escola nova num wizard de 4 passos → subconta Asaas criada + config + matérias com preço + aceite IX↔Escola → escola pronta para receber alunos, em <30 min.

**Architecture:** Monolito Next.js App Router, camadas Component→Hook→Store→Service→API→Prisma. Isolamento multi-tenant via Prisma Client Extension (`$extends`, NÃO `$use` deprecated) que injeta `unitId` da sessão Clerk. Criptografia AES-256-GCM para credenciais Asaas. Cliente Asaas tipado (já migrado). Valores em centavos no app, reais na borda Asaas.

**Tech Stack:** Next.js 15.5 · React 19 · Prisma 6 + Supabase Postgres · Clerk 6 · Tailwind 4 + shadcn (tokens Alfabeto) · Zod · Vitest · Playwright

---

## Pipeline reproduzível (vale para cada Task abaixo)

Cada Task segue o `ix-dev` (7 passos). Designação de agents/skills por etapa:

| Etapa | Skill/Agent | Modelo |
|-------|-------------|--------|
| Contexto | `ix-core` + `ix-backend`/`ix-frontend`/`ix-security` (conforme a Task) | — |
| Docs lib | `mcp__context7__query-docs` (Prisma `$extends`, Clerk 6 `clerkMiddleware`) ⚠️ **confirmar sintaxe na doc oficial — context7 estava com chave inválida em 13/jun** | — |
| Execução | TDD (RED→GREEN→REFACTOR), `ix-code-guidelines` (500 linhas, DRY) | Sonnet (lógica) / Haiku (boilerplate, columns) |
| Verificação | `pnpm test:run && typecheck && build` + Playwright 3 breakpoints (UI) + `ix-security` | — |
| Review | `ix-code-review` + `advisor()` (schema/auth/cripto = crítico) | Opus via advisor |
| Ship | branch `feature/`, PR, sem Co-Authored-By | — |

**Ordem das Tasks (dependências):** 1.1 schema+cripto → 1.2 service+subconta → 1.4 auth/tenant (pode paralelizar com 1.3 após 1.1) → 1.3 wizard UI → 1.5 termos.

---

## File Structure

```
prisma/schema.prisma                          # Unit, BillingConfig, Subject, Guardian, TermsVersion, TermsAcceptance
src/lib/crypto.ts                              # AES-256-GCM encrypt/decrypt
src/lib/crypto.test.ts
src/lib/db.ts                                  # Prisma singleton + tenant extension factory
src/lib/validations/unit.ts                    # Zod schemas (Unit, BillingConfig, Subject)
src/lib/services/onboarding.service.ts         # cria Unit + subconta Asaas + rollback
src/lib/services/__tests__/onboarding.service.test.ts
src/lib/auth/unit-context.ts                   # getUnitContext(auth) — unitId da sessão Clerk
src/lib/store/onboarding.store.ts              # Zustand: estado do wizard
src/hooks/use-onboarding.ts                    # orquestra store → service via API
src/app/api/setup/escola/route.ts              # POST: 201/400/409/502
src/components/onboarding/OnboardingWizard.tsx # shell do wizard (4 passos)
src/components/onboarding/StepDados.tsx        # passo 1
src/components/onboarding/StepCobranca.tsx     # passo 2 (FeeRouter)
src/components/onboarding/StepDocumentos.tsx   # passo 3 (matérias + código NFS-e + PREÇO + contrato)
src/components/onboarding/StepRevisao.tsx      # passo 4
src/components/onboarding/FeeRouter.tsx        # quem paga taxa (responsavel|escola)
src/components/ui/{input,toggle,badge,file-drop}.tsx  # átomos shadcn faltantes
src/middleware.ts                              # clerkMiddleware
src/app/(app)/onboarding/page.tsx              # rota do wizard
tests/e2e/onboarding.spec.ts                   # Playwright 3 breakpoints
docs/legal/termos-uso-ix-escola.md             # Task 1.5
```

---

## Task 1.1 — Schema base + criptografia

**Contexto:** `ix-core` + `ix-backend` + `ix-security`. Modelo de cobrança: ver memória `education-x-modelo-cobranca` (Subject = nome + código NFS-e + preço em centavos).

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/crypto.test.ts`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Escrever o teste de crypto (RED)**

```typescript
// src/lib/crypto.test.ts
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "./crypto";

const KEY = "0".repeat(64); // 32 bytes hex

describe("crypto AES-256-GCM", () => {
  it("round-trip: decrypt(encrypt(x)) === x", () => {
    const plain = "asaas_api_key_secret_123";
    expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
  });
  it("IV é aleatório: dois encrypts do mesmo texto diferem", () => {
    expect(encrypt("same", KEY)).not.toBe(encrypt("same", KEY));
  });
  it("decrypt com chave errada lança erro", () => {
    const enc = encrypt("x", KEY);
    expect(() => decrypt(enc, "f".repeat(64))).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test:run src/lib/crypto.test.ts`
Expected: FAIL ("encrypt is not a function")

- [ ] **Step 3: Implementar crypto.ts (GREEN)**

```typescript
// src/lib/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";

export function encrypt(plain: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(payload: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test:run src/lib/crypto.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 5: Reescrever o schema Prisma**

Substituir o `Enrollment` simplificado. Modelo final:

```prisma
model Unit {
  id               String   @id @default(cuid())
  name             String
  cnpj             String   @unique
  email            String
  phone            String
  cep              String
  address          String
  complement       String?
  city             String
  state            String   // UF
  isFranchise      Boolean  @default(false)
  franchiseParent  String?  // ex: "Kumon Brasil"
  status           UnitStatus @default(PENDING)
  asaasAccountId   String?
  asaasApiKeyEnc   String?  // AES-256-GCM
  asaasWalletId    String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  billingConfig BillingConfig?
  subjects      Subject[]
  guardians     Guardian[]
  termsAcceptances TermsAcceptance[]

  @@map("units")
}

model BillingConfig {
  id                   String   @id @default(cuid())
  unitId               String   @unique
  dueDay               Int      // 1..28
  closingDay           Int      // 1..28
  lateFeePercent       Int      // basis points (200 = 2%)
  monthlyInterestBp    Int      // basis points (100 = 1% a.m.)
  enablesSpc           Boolean  @default(false)
  autoBilling          Boolean  @default(true)
  acceptsCard          Boolean  @default(false)
  cardFeePayer         FeePayer @default(RESPONSAVEL)
  negativacaoFeePayer  FeePayer @default(RESPONSAVEL)
  municipalRegistration String
  requireSignedContract Boolean @default(false)
  contractFileName     String?
  asaasWebhookTokenEnc String? // AES-256-GCM
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  @@map("billing_configs")
}

model Subject {
  id            String   @id @default(cuid())
  unitId        String
  name          String   // matéria, ex: "Matemática"
  nfseServiceCode String // código de serviço NFS-e
  priceCents    Int      // preço da matéria, em centavos
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  @@index([unitId])
  @@map("subjects")
}

model Guardian {
  id        String   @id @default(cuid())
  unitId    String
  name      String          // nome não é criptografado (precisa exibir em listas/ordenação)
  cpfEnc    String?         // PII — AES-256-GCM (LGPD, ver rule security/lgpd)
  emailEnc  String?         // PII — AES-256-GCM
  phoneEnc  String?         // PII — AES-256-GCM
  asaasCustomerId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  @@index([unitId])
  @@map("guardians")
}

model TermsVersion {
  id        String   @id @default(cuid())
  kind      TermsKind
  version   String   // ex: "1.0"
  body      String   @db.Text
  createdAt DateTime @default(now())

  acceptances TermsAcceptance[]
  @@map("terms_versions")
}

model TermsAcceptance {
  id             String   @id @default(cuid())
  unitId         String
  termsVersionId String
  ip             String
  acceptedAt     DateTime @default(now())

  unit         Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  termsVersion TermsVersion @relation(fields: [termsVersionId], references: [id])
  @@index([unitId])
  @@map("terms_acceptances")
}

enum UnitStatus { PENDING ACTIVE SUSPENDED }
enum FeePayer { RESPONSAVEL ESCOLA }
enum TermsKind { IX_ESCOLA ESCOLA_RESPONSAVEL PRIVACY }
```

> Remover os models `Enrollment` e `Invoice` antigos do scaffold por ora — entram na Fase 2/3 com o modelo correto (`Enrollment = Student × Subject × preço`). `Student` também entra na Fase 2 (matrícula). Manter o schema da Tarefa 1 focado em onboarding.

- [ ] **Step 6: Gerar migration**

Run: `pnpm dlx prisma migrate dev --name tarefa-1-onboarding-schema`
Expected: migration criada e aplicada (precisa de `DATABASE_URL` no `.env.local`)

- [ ] **Step 7: Validações Zod**

```typescript
// src/lib/validations/unit.ts
import { z } from "zod";

const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

export const subjectSchema = z.object({
  name: z.string().min(1),
  nfseServiceCode: z.string().min(1),
  priceCents: z.number().int().positive(),
});

export const onboardingSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().regex(cnpjRegex, "CNPJ inválido"),
  email: z.string().email(),
  phone: z.string().min(8),
  cep: z.string().min(8),
  address: z.string().min(1),
  complement: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  isFranchise: z.boolean(),
  franchiseParent: z.string().optional(),
  dueDay: z.number().int().min(1).max(28),
  closingDay: z.number().int().min(1).max(28),
  lateFeePercent: z.number().int().min(0),
  monthlyInterestBp: z.number().int().min(0),
  enablesSpc: z.boolean(),
  autoBilling: z.boolean(),
  acceptsCard: z.boolean(),
  cardFeePayer: z.enum(["RESPONSAVEL", "ESCOLA"]),
  negativacaoFeePayer: z.enum(["RESPONSAVEL", "ESCOLA"]),
  municipalRegistration: z.string().min(1),
  subjects: z.array(subjectSchema).min(1),
  contractFileName: z.string().optional(),
  acceptedTermsVersionId: z.string().min(1),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
```

- [ ] **Step 8: Teste do schema Zod (CNPJ inválido, dueDay fora de range)**

```typescript
// src/lib/validations/unit.test.ts
import { describe, it, expect } from "vitest";
import { onboardingSchema } from "./unit";

const base = {
  name: "Kumon Camargos",
  cnpj: "12.345.678/0001-90",
  email: "contato@kumoncamargos.com.br",
  phone: "(31) 3456-7890",
  cep: "30000-000",
  address: "Rua X, 100",
  complement: "Sala 201",
  city: "Belo Horizonte",
  state: "MG",
  isFranchise: true,
  franchiseParent: "Kumon Brasil",
  dueDay: 10,
  closingDay: 25,
  lateFeePercent: 200,        // 2% em basis points
  monthlyInterestBp: 100,     // 1% a.m. em basis points
  enablesSpc: true,
  autoBilling: true,
  acceptsCard: false,
  cardFeePayer: "RESPONSAVEL",
  negativacaoFeePayer: "ESCOLA",
  municipalRegistration: "1.234.567-8",
  subjects: [{ name: "Matemática", nfseServiceCode: "08.01", priceCents: 39000 }],
  contractFileName: "contrato.pdf",
  acceptedTermsVersionId: "tv_1",
} as const;

describe("onboardingSchema", () => {
  it("aceita um payload válido completo", () => {
    expect(onboardingSchema.safeParse(base).success).toBe(true);
  });
  it("rejeita CNPJ inválido", () => {
    expect(onboardingSchema.safeParse({ ...base, cnpj: "123" }).success).toBe(false);
  });
  it("rejeita dueDay > 28", () => {
    expect(onboardingSchema.safeParse({ ...base, dueDay: 31 }).success).toBe(false);
  });
  it("rejeita subjects vazio", () => {
    expect(onboardingSchema.safeParse({ ...base, subjects: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 9: Rodar testes + typecheck**

Run: `pnpm test:run && pnpm typecheck`
Expected: PASS

- [ ] **Step 10: advisor() — review do schema + cripto (crítico)**

- [ ] **Step 11: Commit**

```bash
git add prisma/ src/lib/crypto.ts src/lib/crypto.test.ts src/lib/validations/
git commit -m "feat(onboarding): schema Unit/BillingConfig/Subject + crypto AES-256-GCM + validações Zod"
```

---

## Task 1.2 — Service de onboarding + criação de subconta Asaas

**Contexto:** `ix-core` + `ix-backend`. Cliente Asaas tipado já existe em `src/lib/integration/asaas/`. Subconta verificada em sandbox (HTTP 200). Valores em reais na borda Asaas.

**Files:**
- Create: `src/lib/db.ts`, `src/lib/services/onboarding.service.ts`, `src/lib/services/__tests__/onboarding.service.test.ts`, `src/app/api/setup/escola/route.ts`

- [ ] **Step 1: Teste do service com AsaasMockClient (RED)** — cobre: cria Unit+BillingConfig+Subjects; criptografa apiKey; rollback se Asaas falhar; CNPJ duplicado lança erro tipado.

```typescript
// src/lib/services/__tests__/onboarding.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { createSchool, DuplicateCnpjError, AsaasProvisionError } from "../onboarding.service";
import { AsaasMockClient } from "@/lib/integration/asaas/mock-client";

const KEY = "0".repeat(64);
const validInput = {
  name: "Kumon Camargos", cnpj: "12.345.678/0001-90", email: "c@k.com", phone: "31999",
  cep: "30000-000", address: "Rua X", complement: null, city: "BH", state: "MG",
  isFranchise: true, franchiseParent: "Kumon Brasil",
  dueDay: 10, closingDay: 25, lateFeePercent: 200, monthlyInterestBp: 100,
  enablesSpc: true, autoBilling: true, acceptsCard: false,
  cardFeePayer: "RESPONSAVEL" as const, negativacaoFeePayer: "ESCOLA" as const,
  municipalRegistration: "1.234.567-8",
  subjects: [{ name: "Matemática", nfseServiceCode: "08.01", priceCents: 39000 }],
  contractFileName: "contrato.pdf", acceptedTermsVersionId: "tv_1",
};

// Mock mínimo do Prisma: $transaction executa o callback, create devolve a Unit com id.
function makeMockPrisma(overrides: Record<string, unknown> = {}) {
  const unit = { id: "unit_1", status: "PENDING", asaasApiKeyEnc: null as string | null };
  return {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(makeMockPrisma(overrides))),
    unit: {
      create: vi.fn(async () => unit),
      update: vi.fn(async (a: { data: Record<string, unknown> }) => ({ ...unit, ...a.data })),
      delete: vi.fn(async () => unit),
    },
    billingConfig: { create: vi.fn(async () => ({})) },
    subject: { createMany: vi.fn(async () => ({ count: 1 })) },
    termsAcceptance: { create: vi.fn(async () => ({})) },
    ...overrides,
  };
}

describe("createSchool", () => {
  it("cria Unit, criptografa apiKey da subconta, persiste subjects, status ACTIVE", async () => {
    const asaas = new AsaasMockClient(); // createSubAccount devolve { apiKey, walletId, id }
    const prisma = makeMockPrisma();
    const result = await createSchool(validInput, { asaas, prisma: prisma as never, encKey: KEY });
    expect(result.unit.asaasApiKeyEnc).toBeTruthy();
    expect(result.unit.asaasApiKeyEnc).not.toContain("apikey"); // valor cru não vaza
    expect(result.unit.status).toBe("ACTIVE");
    expect(prisma.subject.createMany).toHaveBeenCalled();
  });

  it("faz rollback (deleta Unit) se a criação de subconta Asaas falhar", async () => {
    const asaas = { createSubAccount: vi.fn().mockRejectedValue(new Error("asaas 502")) };
    const prisma = makeMockPrisma();
    await expect(createSchool(validInput, { asaas: asaas as never, prisma: prisma as never, encKey: KEY }))
      .rejects.toBeInstanceOf(AsaasProvisionError);
    expect(prisma.unit.delete).toHaveBeenCalled();
  });

  it("CNPJ duplicado lança DuplicateCnpjError", async () => {
    const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
    const prisma = makeMockPrisma({ unit: { create: vi.fn().mockRejectedValue(p2002), update: vi.fn(), delete: vi.fn() } });
    const asaas = new AsaasMockClient();
    await expect(createSchool(validInput, { asaas, prisma: prisma as never, encKey: KEY }))
      .rejects.toBeInstanceOf(DuplicateCnpjError);
  });
});
```

> **Worker:** ajuste a forma do mock conforme a implementação real (transação aninhada, ordem das chamadas). O contrato a satisfazer são as 3 asserções: cripto não vaza valor cru, rollback chama `unit.delete`, P2002→`DuplicateCnpjError`.

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test:run src/lib/services/__tests__/onboarding.service.test.ts` → FAIL

- [ ] **Step 3: `src/lib/db.ts` — Prisma singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Implementar `onboarding.service.ts` (GREEN)** — pseudo-contrato:

```typescript
// src/lib/services/onboarding.service.ts
import type { OnboardingInput } from "@/lib/validations/unit";
import { encrypt } from "@/lib/crypto";

export class DuplicateCnpjError extends Error {}
export class AsaasProvisionError extends Error {}

interface Deps { asaas: AsaasClient; prisma: PrismaClient; encKey: string; }

export async function createSchool(input: OnboardingInput, deps: Deps) {
  const { asaas, prisma, encKey } = deps;
  // 1. cria Unit + BillingConfig + Subjects (transação) status=PENDING
  // 2. chama asaas.createSubAccount({ name, email, cnpjCpf, ... })
  //    em falha → deleta Unit (rollback) → throw AsaasProvisionError
  // 3. criptografa apiKey/walletId, atualiza Unit status=ACTIVE
  // 4. mapeia P2002 (unique cnpj) → DuplicateCnpjError
  // retorna { unit }
}
```

(O worker preenche a implementação completa seguindo o contrato + os testes. Conversão centavos→reais acontece DENTRO do cliente Asaas, não aqui.)

- [ ] **Step 5: Rodar e ver passar.** Run: `pnpm test:run src/lib/services/__tests__/onboarding.service.test.ts` → PASS

- [ ] **Step 6: API route `POST /api/setup/escola`**

```typescript
// src/app/api/setup/escola/route.ts
import { NextResponse } from "next/server";
import { onboardingSchema } from "@/lib/validations/unit";
import { createSchool, DuplicateCnpjError, AsaasProvisionError } from "@/lib/services/onboarding.service";
import { getUnitContext } from "@/lib/auth/unit-context";

export async function POST(req: Request) {
  // RBAC: só Admin IX cria escola. unitId/role vêm da sessão Clerk, nunca de HTTP.
  const { role } = await getUnitContext();
  if (role !== "admin_ix") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  try {
    // onboarding usa `prisma` cru (não forUnit) — criar Unit não é tenant-scoped (ver Task 1.4)
    const { unit } = await createSchool(parsed.data, { /* deps reais: prisma cru, asaas, encKey */ });
    return NextResponse.json({ unitId: unit.id }, { status: 201 });
  } catch (e) {
    if (e instanceof DuplicateCnpjError) return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });
    if (e instanceof AsaasProvisionError) return NextResponse.json({ error: "Falha ao criar subconta" }, { status: 502 });
    throw e;
  }
}
```

> **RBAC + sessão Clerk:** `getUnitContext` lê `role` e `unitId` de `sessionClaims.metadata`. Isto precisa ser populado no Clerk: o **Admin IX** tem `role: "admin_ix"` (sem unitId); a **fran** recebe `role: "fran"` + `unitId` da sua escola. **Onde é setado:** no Clerk Dashboard (publicMetadata do user) ou via Clerk API quando o usuário da escola é provisionado. Para a Task 1, basta o Admin IX existir com `role: admin_ix` — o provisionamento de usuário-fran entra quando a escola tiver login próprio (Fase posterior). Marcar como dependência: **sem o metadata configurado no Clerk, o `getUnitContext` retorna role undefined e a rota dá 403** — configurar o primeiro admin manualmente no Clerk Dashboard.

- [ ] **Step 7: typecheck + advisor() (rollback + falha externa é crítico)**
- [ ] **Step 8: Commit** — `feat(onboarding): service de criação de escola + subconta Asaas com rollback + POST /api/setup/escola`

---

## Task 1.4 — Auth, RBAC e isolamento de tenant 🔴

**Contexto:** `ix-core` + `ix-security`. ADR-0002: isolamento por aplicação via Prisma Client Extension. Clerk 6 `clerkMiddleware`. ⚠️ Confirmar sintaxe `$extends` (Prisma 6) e `clerkMiddleware` (Clerk 6) na doc oficial antes de codar.

**Files:**
- Create: `src/middleware.ts`, `src/lib/auth/unit-context.ts`
- Modify: `src/lib/db.ts` (adicionar factory de client com extension de tenant)

> **Quando usar `prisma` cru vs `forUnit` (regra explícita):**
> - **`prisma` cru** — operações de Admin IX e onboarding (criar Unit, ler/escrever models GLOBAIS como `TermsVersion`). NÃO são tenant-scoped: a `Unit` é o próprio tenant (filtrar por `unitId` quebraria), e `TermsVersion` é global.
> - **`forUnit(unitId)`** — TODA query em request autenticado de uma fran, sobre models tenant-scoped (`Subject`, `Guardian`, `BillingConfig`, `TermsAcceptance` e os futuros `Student`/`Enrollment`/`Invoice`). O `unitId` vem de `getUnitContext()`, nunca de HTTP.
> A extension usa **allowlist** dos models tenant-scoped — NÃO `$allModels` (que quebraria em `Unit`/`TermsVersion`, pois eles não têm coluna `unitId`).

- [ ] **Step 1: Teste do tenant extension (RED)** — cobre os models que QUEBRAM e o vazamento por `findUnique`.

```typescript
// src/lib/auth/tenant.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { forUnit, prisma } from "@/lib/db";

describe("tenant extension", () => {
  beforeEach(async () => {
    // seed: unit_A e unit_B; subject S_B pertence a unit_B
  });
  it("injeta unitId em findMany de subjects (model tenant-scoped)", async () => {
    const rows = await forUnit("unit_A").subject.findMany();
    expect(rows.every((r) => r.unitId === "unit_A")).toBe(true);
  });
  it("escola A não lê subject de escola B via findMany", async () => {
    const rows = await forUnit("unit_A").subject.findMany();
    expect(rows.find((r) => r.id === "S_B")).toBeUndefined();
  });
  it("escola A não lê subject de B nem por findUnique (id direto)", async () => {
    // findUnique deve ser reescrito p/ findFirst com unitId — senão vaza
    const row = await forUnit("unit_A").subject.findUnique({ where: { id: "S_B" } });
    expect(row).toBeNull();
  });
  it("NÃO injeta unitId em models globais — Unit.findFirst não quebra", async () => {
    // Unit não é tenant-scoped: a query roda sem erro de 'Unknown argument unitId'
    await expect(prisma.unit.findFirst({ where: { id: "unit_A" } })).resolves.toBeTruthy();
  });
  it("NÃO injeta unitId em TermsVersion (global) — findMany não quebra", async () => {
    await expect(prisma.termsVersion.findMany()).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar.** → FAIL

- [ ] **Step 3: `forUnit(unitId)` com `$extends` + allowlist** (Prisma Client Extension — confirmar sintaxe `$extends` na doc oficial Prisma 6)

```typescript
// src/lib/db.ts (adicionar)
// Apenas models que têm a coluna unitId. Unit e TermsVersion NÃO entram.
const TENANT_MODELS = new Set([
  "Subject", "Guardian", "BillingConfig", "TermsAcceptance",
  // futuros: "Student", "Enrollment", "Invoice"
]);

export function forUnit(unitId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, args, query, operation }) {
          if (!TENANT_MODELS.has(model)) return query(args); // global → passa direto
          // findUnique ignora where extra → reescreve p/ findFirst com unitId (anti-vazamento)
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const a = args as { where?: Record<string, unknown> };
            return (query as unknown as (x: unknown) => unknown)({
              ...a, where: { ...(a.where ?? {}), unitId },
            });
            // NOTA p/ worker: confirmar na doc se findUnique pode ser redirecionado p/ findFirst
            // dentro da extension; se não, validar unitId no resultado e retornar null se divergir.
          }
          if (["findMany","findFirst","findFirstOrThrow","count","aggregate","updateMany","deleteMany"].includes(operation)) {
            const a = args as { where?: Record<string, unknown> };
            a.where = { ...(a.where ?? {}), unitId };
          }
          if (operation === "create") {
            const a = args as { data?: Record<string, unknown> };
            a.data = { ...(a.data ?? {}), unitId };
          }
          if (operation === "createMany") {
            const a = args as { data?: Record<string, unknown>[] };
            if (Array.isArray(a.data)) a.data = a.data.map((d) => ({ ...d, unitId }));
          }
          return query(args);
        },
      },
    },
  });
}
```

> ⚠️ **Worker:** o redirecionamento `findUnique`→`findFirst` dentro de uma extension pode não ser suportado diretamente pelo Prisma. Confirmar na doc. Fallback seguro: deixar `findUnique` rodar, e na extension verificar `result.unitId === unitId` — retornar `null` se divergir. O TESTE (`findUnique` de S_B → null) é o contrato; a implementação que o satisfizer está correta.

- [ ] **Step 4: `getUnitContext(auth)` — unitId da sessão Clerk, nunca de HTTP**

```typescript
// src/lib/auth/unit-context.ts
import { auth } from "@clerk/nextjs/server";
export async function getUnitContext() {
  const { sessionClaims, userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  const unitId = sessionClaims?.metadata?.unitId as string | undefined;
  const role = sessionClaims?.metadata?.role as "admin_ix" | "fran" | undefined;
  return { userId, unitId, role };
}
```

- [ ] **Step 5: `src/middleware.ts` — clerkMiddleware** (confirmar sintaxe Clerk 6)

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/api/webhooks(.*)", "/matricula(.*)"]);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});
export const config = { matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"] };
```

- [ ] **Step 6: Rodar testes + typecheck.** → PASS
- [ ] **Step 7: advisor() — isolamento de tenant é segurança crítica**
- [ ] **Step 8: Commit** — `feat(auth): Clerk 6 middleware + getUnitContext + Prisma tenant extension (isolamento por unitId)`

---

## Task 1.3 — UI do wizard (4 passos) + aceite clickwrap

**Contexto:** `ix-core` + `ix-frontend` + `ix-design-system` + `frontend-design`. Referência pixel-perfect: `specs/prototipo/design-handoff/project/app/screens-a.jsx` (FlowA) — recriar com componentes reutilizáveis, NÃO copiar inline. **Passo 3 (Documentos) expande "códigos de serviço por matéria" em tabela: matéria + código NFS-e + PREÇO** (decisão 13/jun). Valores em reais no frontend, centavos no submit.

**Files:** (ver File Structure) — átomos shadcn faltantes primeiro (Haiku), depois store/hook (Sonnet), depois os 4 passos (Haiku dumb + Sonnet lógica), depois o shell.

- [ ] **Step 1: Átomos shadcn faltantes** (Haiku) — `input`, `toggle`, `badge`, `file-drop` em `src/components/ui/`, estilados com tokens Alfabeto. Teste de render de cada (cor primária `#0467DB`).
- [ ] **Step 2: `onboarding.store.ts` (Zustand)** — estado dos 4 passos + `subjects: {name, nfseServiceCode, priceCents}[]` + ações `setField`, `addSubject`, `removeSubject`, `goToStep`. Teste do store.
- [ ] **Step 3: `FeeRouter.tsx`** — toggle responsavel|escola. Teste: persiste valor.
- [ ] **Step 4: `StepDados.tsx`** (passo 1) — campos do screens-a linhas 196-230 (nome, CNPJ, tel, email, CEP, endereço, complemento, cidade, UF, toggle franquia → franquiaMãe).
- [ ] **Step 5: `StepCobranca.tsx`** (passo 2) — vencimento, fechamento, multa, juros, 3 toggles (SPC/auto/cartão), 2 FeeRouters. Conversão: % → basis points no submit.
- [ ] **Step 6: `StepDocumentos.tsx`** (passo 3) — inscrição municipal + **tabela de matérias (nome + código NFS-e + preço R$)** com add/remove + FileDrop contrato. Preço em reais na UI → centavos no store.
- [ ] **Step 7: `StepRevisao.tsx`** (passo 4) — 3 blocos editáveis (ver screens-a linha 358-361) + checkbox aceite clickwrap (registra ao submeter) + botão "Criar escola" → loading → sucesso.
- [ ] **Step 8: `use-onboarding.ts`** — orquestra store → `POST /api/setup/escola`. Trata 201/400/409/502 (toast).
- [ ] **Step 9: `OnboardingWizard.tsx` + rota `(app)/onboarding/page.tsx`** — shell com Stepper, monta os 4 passos.
- [ ] **Step 10: Teste Vitest** — aceite registra IP/versão (mock); onboarding bloqueado sem aceite; subjects persistem com preço.
- [ ] **Step 11: VERIFICAÇÃO E2E Playwright** (obrigatório, ix-dev Passo 6) — `tests/e2e/onboarding.spec.ts`: percorre os 4 passos nos 3 breakpoints (375/768/1440), console limpo, screenshots `pw-{bp}-onboarding.png`.
- [ ] **Step 12: `ix-code-review` + Commit** — `feat(onboarding): wizard 4 passos com matérias+preço, FeeRouter, aceite clickwrap`

---

## Task 1.5 — Termos da plataforma + isenção da IX

**Contexto:** `ix-core`. Redigir conteúdo (mecanismo de aceite está em 1.3). Sem advogado agora — versão funcional. Clickwrap basta pro MVP (H12 decidida).

**Files:**
- Create: `docs/legal/termos-uso-ix-escola.md`, `docs/legal/termos-escola-responsavel.md`, `docs/legal/politica-privacidade.md`
- Create: `prisma/seed-terms.ts` (popula `TermsVersion` v1.0 dos 3 textos)

- [ ] **Step 1: Redigir Termos de Uso IX↔Escola** — com cláusula de isenção: a Escola é responsável legal pela cobrança/negativação dos seus responsáveis; a IX é só a plataforma tecnológica, não é parte na relação Escola↔Responsável. Bloco de isenção fixo, não-editável.
- [ ] **Step 2: Redigir Termos Escola↔Responsável** — condições de cobrança, multa/juros, possibilidade de negativação, cancelamento.
- [ ] **Step 3: Redigir Política de Privacidade básica** — quais dados, por quê (sem aparato LGPD completo — pós-MVP).
- [ ] **Step 4: `seed-terms.ts`** — insere as 3 versões em `TermsVersion`. Teste: aceite vincula à versão correta; cláusula de isenção sempre presente no texto IX↔Escola.
- [ ] **Step 5: Commit** — `feat(legal): termos IX↔Escola + Escola↔Responsável + privacidade v1.0 versionados`

---

## Self-Review (preenchido — revisado pós-advisor 13/jun)

- **Cobertura do spec (PLANO-TECNICO FASE 1):** 1.1✓ 1.2✓ 1.3✓ 1.4✓ 1.5✓. H9 (matéria+preço) coberto na 1.1 e 1.3.
- **Placeholders:** removidos. Testes de validação (1.1) e service (1.2) têm payload e mock completos. Steps de UI (1.3) referenciam o `screens-a.jsx` pixel-perfect + testes como contrato — aceitável. Partes críticas (crypto, schema, tenant extension, middleware, RBAC) têm código completo.
- **Consistência de tipos:** `OnboardingInput` (1.1) usado em 1.2 e 1.3. `forUnit` (1.4) é o nome único. `FeePayer`/`UnitStatus`/`TermsKind` enums consistentes. `asaasApiKeyEnc`/`cpfEnc`/`emailEnc`/`phoneEnc` (sufixo `Enc` = criptografado).

### Correções aplicadas após review do advisor (bloqueantes):
1. **Tenant extension (1.4) — era o bug crítico.** `$allModels` cego quebraria em `Unit`/`TermsVersion` (sem coluna unitId) e `findUnique` vazaria cross-tenant. Corrigido: **allowlist** `TENANT_MODELS`, `findUnique` tratado (redirect/validação), teste agora cobre `Unit`, `TermsVersion` e `findUnique` de outro tenant.
2. **`prisma` cru vs `forUnit`** — regra explícita adicionada no topo da 1.4: admin/onboarding usa cru; request de fran usa `forUnit`.
3. **RBAC na rota (1.2)** — `/api/setup/escola` agora checa `role === "admin_ix"` → 403; documentado onde o metadata (role/unitId) é setado no Clerk.
4. **PII do Guardian (1.1)** — `cpf/email/phone` → `cpfEnc/emailEnc/phoneEnc` (AES-256-GCM, LGPD). Decidido no schema agora pra não migrar depois.

- **Risco aberto:** sintaxe Prisma `$extends` (incl. redirect de `findUnique`) e Clerk 6 `clerkMiddleware`/`sessionClaims.metadata` precisa de confirmação na doc oficial (context7 estava indisponível em 13/jun) — marcado nas Tasks 1.2 e 1.4.
- **Tamanho real:** 5 subtasks pesadas (schema+cripto, service+Asaas, auth/tenant crítico, wizard 4 passos, termos). Alvo original 17/jun é apertado — escopo a confirmar com o Rafa.

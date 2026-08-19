# Regras Backend — Education X

## Arquitetura de Camadas (rígida)
```
API Route Handler
    ↓ (validação de input, autorização)
Service Layer (src/lib/services/)
    ↓ (lógica de negócio, pura, testável)
Prisma Client (src/lib/db.ts)
    ↓ (queries com unitId injected)
Database (PostgreSQL)
```

**Regra de ouro:** lógica de negócio NUNCA em route handler. Sempre delegue para Service.

## Valores — Centavos (obrigatório)
- **INTERNO**: tudo em centavos (tipo `Int` no banco, `number` no TS).
- **BORDA ASAAS**: converte centavos → reais (`value / 100`) NA SAÍDA para a API Asaas.
- **NUNCA Float** em cálculo de dinheiro — use `Math.round()` pra conversões.
- Exemplo:
  ```typescript
  // Service calcula em centavos
  const discountCents = amount * discountPercentage / 100;
  const finalCents = Math.round(amount - discountCents);
  
  // Ao enviar para Asaas, converte
  const asaasPayload = { value: finalCents / 100 };
  ```

## Prisma Client
- **Singleton** em `src/lib/db.ts` — importado sempre do mesmo lugar.
- **Middleware obrigatório** que injeta `unitId` automaticamente em TODA query.
- Schema: nomenclatura inglesa (Unit, Guardian, Student, Invoice, Enrollment).
- Toda operação filtra por `unitId` — nenhuma query pode "esquecer".

Exemplo middleware:
```typescript
prisma.$use(async (params, next) => {
  params.args.where = { ...params.args.where, unitId };
  return next(params);
});
```

## Funções Puras (lógica de negócio)
- **Sem I/O**: não podem chamar Prisma, fetch, ou file system.
- **Testáveis isoladamente**: entrada → cálculo → saída.
- **Máximo 500 linhas** por arquivo.
- Exemplos: `calculateProRata()`, `calculateDiscount()`, `determinePricingTier()`.

```typescript
// ✅ Pura, testável
export function calculateProRata(
  monthlyPrice: number,
  daysUsed: number
): number {
  return Math.round((monthlyPrice * daysUsed) / 30);
}

// ❌ I/O, não testável
export async function calculateWithTax(price: number): Promise<number> {
  const taxRate = await prisma.taxRule.findUnique(...);
  return price * (1 + taxRate);
}
```

## Idempotência (crítico para Asaas)
- Toda operação que **toca Asaas** (criar cobrança, antecipação, transfer) usa `externalReference` único.
- Se a request falhar, **não faça rollback automático** — marque status `ERROR`, logue e aguarde retry ou decisão humana.
- Nunca deixar estado órfão (exemplo: cobrança criada em Asaas mas student status não atualizado).
- Padrão:
  ```typescript
  const externalRef = `ed-${unitId}-${studentId}-${Date.now()}`;
  const asaasResponse = await asaasClient.createPayment({
    externalReference: externalRef,
    ...
  });
  
  if (asaasResponse.error) {
    await updatePaymentStatus(paymentId, 'ERROR', asaasResponse.error);
    throw new Error(`Failed to create payment: ${asaasResponse.error}`);
  }
  ```

## Validação de Input
- Use Zod/superstruct em route handlers.
- NUNCA confie em tipos TS para validação de requisição.
- Sempre validar `unitId` vem da sessão Clerk, não de parâmetro.

## Error Handling
- Service lança erros específicos (custom classes: `InvalidUnitError`, `PaymentNotFoundError`).
- Route handler captura, loga contexto, e retorna 4xx/5xx apropriado.
- Nunca exponha stack trace em resposta ao cliente.

## Testes (TDD)
- Teste ANTES do código.
- Unit tests em `src/lib/services/__tests__/`.
- Mock Prisma com `jest.mock()` ou `@testing-library/jest-dom`.
- Cobertura mínima: funções puras, happy path, edge cases, erros.

## Limites de Arquivo
- **500 linhas máximo** por arquivo de código.
- Service grande? Quebra em `pricing.service.ts`, `enrollment.service.ts`, etc.
- Routes nunca precisam de mais de 50 linhas — delegue ao Service.

## Anti-padrões
- ❌ Lógica de negócio no route handler.
- ❌ Queries Prisma direto do component.
- ❌ Float pra dinheiro.
- ❌ `externalReference` gerado aleatoriamente (deve ser determinístico e único).
- ❌ Rollback automático de operações Asaas — trate como eventual consistency.
- ❌ Valores nunca convertidos (centavos vs reais misturados).

## Performance

- **`select`/`include` explícito sempre.** `findMany()` sem projeção traz todas as colunas —
  inclusive as que forem adicionadas depois, sem ninguém revisar.
- **N+1 é o erro mais caro e o mais fácil de cometer.** Query dentro de `for`/`map` = 1 + N
  round-trips. As três saídas, em ordem de preferência:
  1. `relationLoadStrategy: "join"` (1 query)
  2. `include: { relacao: true }` (2 queries)
  3. `where: { id: { in: [...] } }` em lote (2 queries)
- **`Promise.all` no que é independente.** `await` sequencial de 3 chamadas que não dependem
  entre si custa a soma; em paralelo custa o máximo.
- Paginação sempre em listagem que cresce com o uso (cobranças, matrículas). `take` sem `skip`
  usando cursor é mais estável que offset em tabela que recebe insert.
- Antes de otimizar código: confirmar que a query tem índice (ver `database.md`).

## Anti-padrões de performance

- ❌ Query Prisma dentro de loop.
- ❌ `await` em série no que podia ser `Promise.all`.
- ❌ `findMany()` sem `take` em tabela que cresce sem limite.
- ❌ Buscar a lista inteira pra contar no JS — `count()` faz isso no banco.
- ❌ Instanciar `new PrismaClient()` por request — usar o singleton (já é regra na seção
  "Prisma Client" acima; em serverless isso estoura o pool).

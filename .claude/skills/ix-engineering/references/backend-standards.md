# Backend Standards — Impact X

## Stack padrão
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **Framework**: Nest.js (principal) · Hono (edge/lightweight) · Express (legacy)
- **ORM**: Prisma (principal) · Drizzle (edge/lightweight)
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (JWT) ou custom JWT
- **Validation**: Zod (APIs standalone) + class-validator/class-transformer (Nest.js)
- **Testing**: Vitest / Jest
- **Hosting**: Vercel Serverless · Cloudflare Workers (edge)

## Arquitetura modular por domínio
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts    # Route handlers
│   │   ├── auth.service.ts       # Business logic
│   │   ├── auth.schema.ts        # Zod schemas
│   │   ├── auth.types.ts         # TypeScript types
│   │   └── auth.test.ts          # Tests
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── ...
│   └── [domain]/
├── middleware/
│   ├── auth.ts           # JWT verification
│   ├── rate-limit.ts     # Rate limiting
│   ├── error-handler.ts  # Global error handler
│   └── logger.ts         # Request logging
├── lib/
│   ├── db.ts             # Database client
│   ├── supabase.ts       # Supabase client
│   └── external/         # Third-party service clients
├── config/
│   ├── env.ts            # Environment validation (Zod)
│   └── constants.ts      # App constants
└── index.ts              # App entry point
```

## Patterns

### Controller (route handler)
```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '@/middleware/auth'
import { createUserSchema, getUserParamsSchema } from './users.schema'
import { UsersService } from './users.service'

const users = new Hono()

users.post('/',
  authMiddleware,
  zValidator('json', createUserSchema),
  async (c) => {
    const data = c.req.valid('json')
    const user = await UsersService.create(data)
    return c.json({ data: user, error: null }, 201)
  }
)
```

### Service (business logic)
```ts
export class UsersService {
  static async create(data: CreateUserInput) {
    // Business logic here — no HTTP concerns
    const user = await db.insert(users).values(data).returning()
    return user[0]
  }
}
```

### Schema (validation)
```ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'member']).default('member'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
```

## API Response format (ALWAYS)
```ts
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Email is required" } }

// List
{ "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 }, "error": null }
```

## Error handling
```ts
// Custom error classes
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

// Global error handler middleware
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ data: null, error: { code: err.code, message: err.message } }, err.statusCode)
  }
  // Unknown error — log and return generic
  console.error(err)
  return c.json({ data: null, error: { code: 'INTERNAL', message: 'Something went wrong' } }, 500)
})
```

## Security checklist (EVERY project)
- [ ] Zod validation on ALL inputs (body, params, query, headers)
- [ ] JWT auth on protected routes
- [ ] Rate limiting (100 req/min for API, 10 req/min for auth)
- [ ] CORS: allow only known origins
- [ ] Helmet headers (or equivalent)
- [ ] No raw SQL — use Drizzle ORM or parameterized queries
- [ ] Secrets in environment variables (validated by Zod at startup)
- [ ] HTTPS enforced
- [ ] No sensitive data in logs (mask emails, tokens)
- [ ] Password hashing: bcrypt with cost 12+

## Database patterns
- Drizzle ORM for type-safe queries
- Migrations versioned in repo
- Indexes on frequently queried columns
- Soft delete with `deleted_at` timestamp
- `created_at` and `updated_at` on all tables
- UUIDs for public IDs, serial for internal

## Environment validation
```ts
// config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
})

export const env = envSchema.parse(process.env)
```

## Testing
- Unit tests for services (business logic)
- Integration tests for controllers (HTTP layer)
- Test database with seeds
- Min 80% coverage on business logic
- Test names: `should [expected behavior] when [condition]`

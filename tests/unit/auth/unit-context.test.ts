import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUnitContext, UnauthorizedError, ForbiddenError } from '../../../src/lib/auth/unit-context'

// Mock do Clerk auth()
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
const mockAuth = vi.mocked(auth)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockAuthReturn(value: Record<string, unknown>) {
  mockAuth.mockResolvedValue(value as unknown as Awaited<ReturnType<typeof auth>>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUnitContext', () => {
  it('lança UnauthorizedError quando não autenticado (userId null)', async () => {
    mockAuthReturn({ userId: null, sessionClaims: null })
    await expect(getUnitContext()).rejects.toThrow(UnauthorizedError)
  })

  it('lança ForbiddenError quando role é inválido', async () => {
    mockAuthReturn({
      userId: 'user-123',
      sessionClaims: { publicMetadata: { role: 'desconhecido' } },
    })
    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })

  it('retorna contexto admin com unitId __admin__', async () => {
    mockAuthReturn({
      userId: 'user-admin',
      sessionClaims: { publicMetadata: { role: 'admin' } },
    })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('admin')
    expect(ctx.unitId).toBe('__admin__')
    expect(ctx.userId).toBe('user-admin')
  })

  it('retorna contexto orientador com unitId da sessão', async () => {
    mockAuthReturn({
      userId: 'user-orientador',
      sessionClaims: { publicMetadata: { role: 'orientador', unitId: 'unit-abc-123' } },
    })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('orientador')
    expect(ctx.unitId).toBe('unit-abc-123')
  })

  it('lança ForbiddenError quando role = orientador mas unitId ausente', async () => {
    mockAuthReturn({
      userId: 'user-orientador',
      sessionClaims: { publicMetadata: { role: 'orientador' } },
    })

    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })

  it('lança ForbiddenError quando publicMetadata ausente', async () => {
    mockAuthReturn({
      userId: 'user-123',
      sessionClaims: {},
    })

    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })
})

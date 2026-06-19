import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUnitContext, UnauthorizedError, ForbiddenError } from '../../../src/lib/auth/unit-context'

// Mock do Clerk auth() + currentUser()
// O role/unitId vivem no publicMetadata do User (currentUser), não nos sessionClaims —
// o session token não inclui publicMetadata por padrão.
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

import { auth, currentUser } from '@clerk/nextjs/server'
const mockAuth = vi.mocked(auth)
const mockCurrentUser = vi.mocked(currentUser)

function mockSession(userId: string | null, publicMetadata?: Record<string, unknown>) {
  mockAuth.mockResolvedValue({ userId } as unknown as Awaited<ReturnType<typeof auth>>)
  mockCurrentUser.mockResolvedValue(
    (userId ? { id: userId, publicMetadata: publicMetadata ?? {} } : null) as unknown as Awaited<
      ReturnType<typeof currentUser>
    >
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUnitContext', () => {
  it('lança UnauthorizedError quando não autenticado (userId null)', async () => {
    mockSession(null)
    await expect(getUnitContext()).rejects.toThrow(UnauthorizedError)
  })

  it('lança ForbiddenError quando role é inválido', async () => {
    mockSession('user-123', { role: 'desconhecido' })
    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })

  it('retorna contexto admin com unitId __admin__', async () => {
    mockSession('user-admin', { role: 'admin' })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('admin')
    expect(ctx.unitId).toBe('__admin__')
    expect(ctx.userId).toBe('user-admin')
  })

  it('retorna contexto orientador com unitId do metadata', async () => {
    mockSession('user-orientador', { role: 'orientador', unitId: 'unit-abc-123' })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('orientador')
    expect(ctx.unitId).toBe('unit-abc-123')
  })

  it('lança ForbiddenError quando role = orientador mas unitId ausente', async () => {
    mockSession('user-orientador', { role: 'orientador' })
    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })

  it('lança ForbiddenError quando publicMetadata ausente', async () => {
    mockSession('user-123', undefined)
    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })
})

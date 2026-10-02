import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUnitContext,
  requireAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '../../../src/lib/auth/unit-context'

// Mock do Clerk auth() + currentUser()
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

import { auth, currentUser } from '@clerk/nextjs/server'
const mockAuth = vi.mocked(auth)
const mockCurrentUser = vi.mocked(currentUser)

function mockAuthReturn(value: Record<string, unknown>) {
  mockAuth.mockResolvedValue(value as unknown as Awaited<ReturnType<typeof auth>>)
}

function mockCurrentUserMeta(publicMetadata: Record<string, unknown> | null) {
  mockCurrentUser.mockResolvedValue(
    (publicMetadata === null ? null : { publicMetadata }) as unknown as Awaited<
      ReturnType<typeof currentUser>
    >
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: sem fallback de currentUser (sessões já têm o custom claim).
  mockCurrentUserMeta({})
})

describe('getUnitContext — role via custom session claim (sessionClaims.metadata)', () => {
  it('lança UnauthorizedError quando não autenticado (userId null)', async () => {
    mockAuthReturn({ userId: null, sessionClaims: null })
    await expect(getUnitContext()).rejects.toThrow(UnauthorizedError)
  })

  it('lança ForbiddenError quando role é inválido', async () => {
    mockAuthReturn({
      userId: 'user-123',
      sessionClaims: { metadata: { role: 'desconhecido' } },
    })
    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })

  it('retorna contexto admin com unitId __admin__', async () => {
    mockAuthReturn({
      userId: 'user-admin',
      sessionClaims: { metadata: { role: 'admin' } },
    })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('admin')
    expect(ctx.unitId).toBe('__admin__')
    expect(ctx.userId).toBe('user-admin')
    // Caminho primário: NÃO deve cair no fallback de rede.
    expect(mockCurrentUser).not.toHaveBeenCalled()
  })

  it('retorna contexto orientador com unitId da sessão', async () => {
    mockAuthReturn({
      userId: 'user-orientador',
      sessionClaims: { metadata: { role: 'orientador', unitId: 'unit-abc-123' } },
    })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('orientador')
    expect(ctx.unitId).toBe('unit-abc-123')
  })

  it('lança ForbiddenError quando role = orientador mas unitId ausente', async () => {
    mockAuthReturn({
      userId: 'user-orientador',
      sessionClaims: { metadata: { role: 'orientador' } },
    })

    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })
})

describe('getUnitContext — fallback via currentUser() (claim ausente)', () => {
  it('usa currentUser().publicMetadata quando sessionClaims.metadata não tem role', async () => {
    mockAuthReturn({ userId: 'user-admin', sessionClaims: {} })
    mockCurrentUserMeta({ role: 'admin' })

    const ctx = await getUnitContext()
    expect(ctx.role).toBe('admin')
    expect(ctx.unitId).toBe('__admin__')
    expect(mockCurrentUser).toHaveBeenCalledOnce()
  })

  it('lança ForbiddenError quando nem claim nem currentUser têm role', async () => {
    mockAuthReturn({ userId: 'user-123', sessionClaims: {} })
    mockCurrentUserMeta({})

    await expect(getUnitContext()).rejects.toThrow(ForbiddenError)
  })
})

describe('requireAdmin', () => {
  it('retorna contexto quando admin', async () => {
    mockAuthReturn({ userId: 'user-admin', sessionClaims: { metadata: { role: 'admin' } } })
    const ctx = await requireAdmin()
    expect(ctx.role).toBe('admin')
  })

  it('lança ForbiddenError quando orientador tenta ação de admin', async () => {
    mockAuthReturn({
      userId: 'user-orientador',
      sessionClaims: { metadata: { role: 'orientador', unitId: 'unit-1' } },
    })
    await expect(requireAdmin()).rejects.toThrow(ForbiddenError)
  })

  it('lança UnauthorizedError quando não autenticado', async () => {
    mockAuthReturn({ userId: null, sessionClaims: null })
    await expect(requireAdmin()).rejects.toThrow(UnauthorizedError)
  })
})

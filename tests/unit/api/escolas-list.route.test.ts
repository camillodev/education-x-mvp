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
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/unit-context'

beforeEach(() => { requireAdmin.mockReset(); findMany.mockReset() })

it('200 com a lista de escolas para admin', async () => {
  requireAdmin.mockResolvedValue({ role: 'admin' })
  findMany.mockResolvedValue([
    { id: '1', name: 'A', cnpj: '111', city: 'BH', state: 'MG', status: 'ACTIVE', createdAt: new Date(), _count: { subjects: 2 }, franchiseParent: 'Kumon' },
  ])
  const res = await GET(new NextRequest('http://x/api/escolas'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toHaveLength(1)
  expect(body[0].subjectCount).toBe(2)
  expect(body[0].franchiseParent).toBe('Kumon')
})

it('403 para não-admin', async () => {
  requireAdmin.mockRejectedValue(new ForbiddenError())
  const res = await GET(new NextRequest('http://x/api/escolas'))
  expect(res.status).toBe(403)
})

it('401 quando sessão expirada', async () => {
  requireAdmin.mockRejectedValue(new UnauthorizedError())
  const res = await GET(new NextRequest('http://x/api/escolas'))
  expect(res.status).toBe(401)
  const body = await res.json()
  expect(body.code).toBe('UNAUTHORIZED')
})

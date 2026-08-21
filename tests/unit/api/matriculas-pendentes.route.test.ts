import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const listPendingEnrollments = vi.fn()
vi.mock('@/lib/services/approval.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/approval.service')>('@/lib/services/approval.service')
  return { ...actual, listPendingEnrollments: (...a: unknown[]) => listPendingEnrollments(...a) }
})

import { GET } from '@/app/api/matriculas/pendentes/route'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/unit-context'

beforeEach(() => {
  getUnitContext.mockReset()
  listPendingEnrollments.mockReset()
})

it('200 com a lista de matrículas pendentes para orientador', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  listPendingEnrollments.mockResolvedValue([
    { guardianId: 'g1', guardianName: 'Maria', plan: 'MONTHLY', students: ['João'], totalCents: 35000 },
  ])

  const res = await GET()

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toHaveLength(1)
  expect(listPendingEnrollments).toHaveBeenCalledWith('unit-1')
})

it('403 para admin (não é dono da matrícula)', async () => {
  getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

  const res = await GET()

  expect(res.status).toBe(403)
  expect(listPendingEnrollments).not.toHaveBeenCalled()
})

it('401 quando sessão expirada', async () => {
  getUnitContext.mockRejectedValue(new UnauthorizedError())

  const res = await GET()

  expect(res.status).toBe(401)
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const rejectEnrollment = vi.fn()
vi.mock('@/lib/services/approval.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/approval.service')>('@/lib/services/approval.service')
  return { ...actual, rejectEnrollment: (...a: unknown[]) => rejectEnrollment(...a) }
})

import { POST } from '@/app/api/matriculas/[guardianId]/recusar/route'

function makeParams(guardianId: string) {
  return { params: Promise.resolve({ guardianId }) }
}

beforeEach(() => {
  getUnitContext.mockReset()
  rejectEnrollment.mockReset()
})

it('200 recusa a matrícula sem tocar Asaas', async () => {
  getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
  rejectEnrollment.mockResolvedValue(undefined)

  const res = await POST(new Request('http://x'), makeParams('guardian-1'))

  expect(res.status).toBe(200)
  expect(rejectEnrollment).toHaveBeenCalledWith('unit-1', 'guardian-1')
})

it('403 para admin', async () => {
  getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

  const res = await POST(new Request('http://x'), makeParams('guardian-1'))

  expect(res.status).toBe(403)
  expect(rejectEnrollment).not.toHaveBeenCalled()
})

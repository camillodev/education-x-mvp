import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUnitContext = vi.fn()
vi.mock('@/lib/auth/unit-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/unit-context')>('@/lib/auth/unit-context')
  return { ...actual, getUnitContext: (...a: unknown[]) => getUnitContext(...a) }
})

const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: { unit: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}))

const decrypt = vi.fn()
vi.mock('@/lib/crypto', () => ({ decrypt: (...a: unknown[]) => decrypt(...a) }))

const cancelActiveEnrollment = vi.fn()
vi.mock('@/lib/services/subscription.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/subscription.service')>('@/lib/services/subscription.service')
  return { ...actual, cancelActiveEnrollment: (...a: unknown[]) => cancelActiveEnrollment(...a) }
})

import { POST } from '@/app/api/enrollments/[id]/cancel/route'
import { EnrollmentNotFoundError, EnrollmentNotCancellableError } from '@/lib/services/subscription.service'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  getUnitContext.mockReset()
  findUnique.mockReset()
  decrypt.mockReset()
  cancelActiveEnrollment.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/enrollments/[id]/cancel', () => {
  it('returns 200 and cancels with session unitId, param enrollmentId and decrypted key', async () => {
    getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc-key' })
    decrypt.mockResolvedValue('plain-key')
    cancelActiveEnrollment.mockResolvedValue(undefined)

    const res = await POST(new Request('http://x'), makeParams('enr-1'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'unit-1' }, select: { asaasApiKeyEnc: true } })
    expect(decrypt).toHaveBeenCalledWith('enc-key')
    expect(cancelActiveEnrollment).toHaveBeenCalledWith('unit-1', 'enr-1', 'plain-key')
  })

  it('returns 403 for admin without calling the service', async () => {
    getUnitContext.mockResolvedValue({ role: 'admin', unitId: '__admin__', userId: 'u1' })

    const res = await POST(new Request('http://x'), makeParams('enr-1'))

    expect(res.status).toBe(403)
    expect(cancelActiveEnrollment).not.toHaveBeenCalled()
  })

  it('returns 404 when the enrollment is not found in the unit', async () => {
    getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc-key' })
    decrypt.mockResolvedValue('plain-key')
    cancelActiveEnrollment.mockRejectedValue(new EnrollmentNotFoundError())

    const res = await POST(new Request('http://x'), makeParams('enr-x'))

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })

  it('returns 409 ENROLLMENT_NOT_CANCELLABLE for a pending enrollment', async () => {
    getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
    findUnique.mockResolvedValue({ asaasApiKeyEnc: 'enc-key' })
    decrypt.mockResolvedValue('plain-key')
    cancelActiveEnrollment.mockRejectedValue(new EnrollmentNotCancellableError())

    const res = await POST(new Request('http://x'), makeParams('enr-1'))

    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('ENROLLMENT_NOT_CANCELLABLE')
  })

  it('falls back to an empty key when the unit has no asaasApiKeyEnc', async () => {
    getUnitContext.mockResolvedValue({ role: 'orientador', unitId: 'unit-1', userId: 'u1' })
    findUnique.mockResolvedValue({ asaasApiKeyEnc: null })
    cancelActiveEnrollment.mockResolvedValue(undefined)

    const res = await POST(new Request('http://x'), makeParams('enr-1'))

    expect(res.status).toBe(200)
    expect(decrypt).not.toHaveBeenCalled()
    expect(cancelActiveEnrollment).toHaveBeenCalledWith('unit-1', 'enr-1', '')
  })
})

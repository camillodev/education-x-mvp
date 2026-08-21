import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { resolveEnrollmentLink, InvalidEnrollmentLinkError } from '@/lib/services/enrollment.service'

vi.mock('@/lib/db', () => ({
  prisma: {
    unit: {
      findUnique: vi.fn(),
    },
  },
}))

type MockPrisma = { unit: { findUnique: ReturnType<typeof vi.fn> } }

describe('resolveEnrollmentLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna unitId e nome da unidade para um token válido', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue({
      id: 'unit-1',
      name: 'Kumon Camargos',
    })

    const result = await resolveEnrollmentLink('tok-valido')

    expect(result).toEqual({ unitId: 'unit-1', unitName: 'Kumon Camargos' })
    expect(mp.unit.findUnique).toHaveBeenCalledWith({
      where: { enrollmentLinkToken: 'tok-valido' },
      select: { id: true, name: true },
    })
  })

  it('lança InvalidEnrollmentLinkError quando o token não resolve nenhuma unidade', async () => {
    const mp = prisma as unknown as MockPrisma
    mp.unit.findUnique.mockResolvedValue(null)

    await expect(resolveEnrollmentLink('tok-invalido')).rejects.toThrow(InvalidEnrollmentLinkError)
  })
})

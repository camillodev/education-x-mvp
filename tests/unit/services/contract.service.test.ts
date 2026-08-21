import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    termsVersion: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

import { getUnitContract, saveUnitContract, NoContractVersionError } from '@/lib/services/contract.service'

beforeEach(() => {
  mockFindFirst.mockReset()
  mockCreate.mockReset()
})

describe('getUnitContract', () => {
  it('retorna a versão mais recente da escola (unitId preenchido) quando existir', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'tv1', unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL', version: '2', body: 'texto da escola', createdAt: new Date() })

    const result = await getUnitContract('unit1')

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL' },
      orderBy: { createdAt: 'desc' },
    })
    expect(result.id).toBe('tv1')
    expect(result.body).toBe('texto da escola')
    expect(result.isCustom).toBe(true)
  })

  it('cai na versão global (unitId null) quando a escola não tem contrato próprio ainda', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null) // busca custom da escola — não existe
      .mockResolvedValueOnce({ id: 'seed-ESCOLA_RESPONSAVEL-1.0', unitId: null, kind: 'ESCOLA_RESPONSAVEL', version: '1.0', body: 'texto global', createdAt: new Date() })

    const result = await getUnitContract('unit-sem-contrato')

    expect(mockFindFirst).toHaveBeenNthCalledWith(2, {
      where: { unitId: null, kind: 'ESCOLA_RESPONSAVEL' },
      orderBy: { createdAt: 'desc' },
    })
    expect(result.id).toBe('seed-ESCOLA_RESPONSAVEL-1.0')
    expect(result.body).toBe('texto global')
    expect(result.isCustom).toBe(false)
  })

  it('lança NoContractVersionError se nem custom nem global existirem (estado inconsistente)', async () => {
    mockFindFirst.mockResolvedValue(null)

    await expect(getUnitContract('unit-x')).rejects.toThrow(NoContractVersionError)
  })
})

describe('saveUnitContract', () => {
  it('grava uma NOVA TermsVersion escopada por unitId (append-only, nunca update)', async () => {
    mockCreate.mockResolvedValue({ id: 'tv2', unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL', version: '2026-08-21T00:00:00.000Z', body: 'novo texto', createdAt: new Date() })

    const result = await saveUnitContract('unit1', 'novo texto')

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: 'unit1',
        kind: 'ESCOLA_RESPONSAVEL',
        body: 'novo texto',
      }),
    })
    expect(result.id).toBe('tv2')
  })

  it('rejeita corpo vazio', async () => {
    await expect(saveUnitContract('unit1', '   ')).rejects.toThrow()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

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

import { getUnitContract, saveUnitContract } from '@/lib/services/contract.service'
import { TERMS_DOCUMENTS } from '@/lib/terms/content'

const FALLBACK_BODY = TERMS_DOCUMENTS.find((t) => t.kind === 'ESCOLA_RESPONSAVEL')!.body

beforeEach(() => {
  mockFindFirst.mockReset()
  mockCreate.mockReset()
})

describe('getUnitContract', () => {
  it('retorna a versão mais recente da escola (unitId preenchido) quando existir', async () => {
    mockFindFirst.mockResolvedValue({ id: 'tv1', unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL', version: '2', body: 'texto da escola', createdAt: new Date() })

    const result = await getUnitContract('unit1')

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL' },
      orderBy: { createdAt: 'desc' },
    })
    expect(result.body).toBe('texto da escola')
    expect(result.isCustom).toBe(true)
  })

  it('cai no texto global (TERMS_DOCUMENTS) quando a escola não tem contrato próprio ainda', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await getUnitContract('unit-sem-contrato')

    expect(result.body).toBe(FALLBACK_BODY)
    expect(result.isCustom).toBe(false)
  })
})

describe('saveUnitContract', () => {
  it('grava uma NOVA TermsVersion escopada por unitId (append-only, nunca update)', async () => {
    mockCreate.mockResolvedValue({ id: 'tv2', unitId: 'unit1', kind: 'ESCOLA_RESPONSAVEL', version: '2026-08-21T00:00:00.000Z', body: 'novo texto', createdAt: new Date() })

    await saveUnitContract('unit1', 'novo texto')

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitId: 'unit1',
        kind: 'ESCOLA_RESPONSAVEL',
        body: 'novo texto',
      }),
    })
  })

  it('rejeita corpo vazio', async () => {
    await expect(saveUnitContract('unit1', '   ')).rejects.toThrow()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleError } from '@/lib/errors/handle'
import { DuplicateCnpjError, UnitNotFoundError } from '@/lib/services/onboarding.service'

describe('handleError', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('loga a causa técnica real com contexto e devolve mensagem amigável', () => {
    const real = new Error('connection refused at 5432')
    const out = handleError(real, { route: 'PATCH /api/escolas/[unitId]', unitId: 'u1' })
    expect(out.message).toMatch(/inesperado|erro/i)
    expect(out.code).toBe('INTERNAL')
    expect(console.error).toHaveBeenCalledOnce()
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0].join(' ')
    expect(logged).toContain('connection refused at 5432') // causa real preservada
    expect(logged).toContain('u1')
    expect(logged).toContain('/api/escolas/[unitId]')
  })

  it('mapeia DuplicateCnpjError para 409/DUPLICATE_CNPJ', () => {
    const out = handleError(new DuplicateCnpjError(), { route: 'POST /x' })
    expect(out.code).toBe('DUPLICATE_CNPJ')
  })

  it('mapeia UnitNotFoundError para NOT_FOUND', () => {
    const out = handleError(new UnitNotFoundError(), { route: 'PATCH /x' })
    expect(out.code).toBe('NOT_FOUND')
  })
})

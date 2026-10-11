import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleError, errorResponse } from '@/lib/errors/handle'
import { DuplicateCnpjError, DueDayImmutableError, UnitNotFoundError } from '@/lib/services/onboarding.service'
import { GuardianNotFoundError } from '@/lib/services/approval.service'
import { EnrollmentNotFoundError, EnrollmentNotCancellableError } from '@/lib/services/subscription.service'

describe('handleError', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('loga a causa técnica real com contexto e devolve mensagem amigável', () => {
    const real = new Error('connection refused at 5432')
    const out = handleError(real, { route: 'PATCH /api/schools/[unitId]', unitId: 'u1' })
    expect(out.message).toMatch(/inesperado|erro/i)
    expect(out.code).toBe('INTERNAL')
    expect(console.error).toHaveBeenCalledOnce()
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0].join(' ')
    expect(logged).toContain('connection refused at 5432') // causa real preservada
    expect(logged).toContain('u1')
    expect(logged).toContain('/api/schools/[unitId]')
  })

  it('inclui a causa técnica real no campo detail (volta na resposta da API)', () => {
    const real = new Error('connection refused at 5432')
    const out = handleError(real, { route: 'GET /api/schools' })
    expect(out.detail).toBe('connection refused at 5432')
  })

  it('detail funciona com erro não-Error (string/objeto)', () => {
    const out = handleError('falha crua', { route: 'GET /x' })
    expect(out.detail).toContain('falha crua')
  })

  it('mapeia DuplicateCnpjError para 409/DUPLICATE_CNPJ', () => {
    const out = handleError(new DuplicateCnpjError(), { route: 'POST /x' })
    expect(out.code).toBe('DUPLICATE_CNPJ')
  })

  it('mapeia UnitNotFoundError para NOT_FOUND', () => {
    const out = handleError(new UnitNotFoundError(), { route: 'PATCH /x' })
    expect(out.code).toBe('NOT_FOUND')
  })

  it('maps DueDayImmutableError to 400/DUE_DAY_IMMUTABLE', () => {
    const r = handleError(new DueDayImmutableError(), { route: 'PATCH /api/schools/[unitId]' })
    expect(r).toMatchObject({ status: 400, code: 'DUE_DAY_IMMUTABLE' })
    expect(r.message).toMatch(/vencimento/i)
  })

  it('mapeia GuardianNotFoundError para NOT_FOUND', () => {
    const out = handleError(new GuardianNotFoundError(), { route: 'POST /x' })
    expect(out.code).toBe('NOT_FOUND')
  })

  it('maps EnrollmentNotFoundError to 404/NOT_FOUND', () => {
    const out = handleError(new EnrollmentNotFoundError(), { route: 'POST /x' })
    expect(out).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('maps EnrollmentNotCancellableError to 409/ENROLLMENT_NOT_CANCELLABLE', () => {
    const out = handleError(new EnrollmentNotCancellableError(), { route: 'POST /x' })
    expect(out).toMatchObject({ status: 409, code: 'ENROLLMENT_NOT_CANCELLABLE' })
  })
})

describe('errorResponse', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('sem exposeDetail (rota tenant-facing): resposta não inclui detail', async () => {
    const res = errorResponse(new Error('connection refused at 5432'), { route: 'GET /api/invoices', unitId: 'u1' })
    const body = await res.json()
    expect(body.detail).toBeUndefined()
    expect(body.error).toBeDefined()
    expect(body.code).toBe('INTERNAL')
  })

  it('com exposeDetail:true (rota admin): resposta inclui detail', async () => {
    const res = errorResponse(new Error('connection refused at 5432'), { route: 'GET /api/schools', exposeDetail: true })
    const body = await res.json()
    expect(body.detail).toBe('connection refused at 5432')
  })
})

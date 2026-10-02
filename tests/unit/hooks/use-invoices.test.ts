import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInvoices } from '@/hooks/use-invoices'

const responseBody = {
  items: [
    {
      id: 'inv_1',
      enrollmentId: 'enr_1',
      status: 'PENDING',
      referenceMonth: '2026-09',
      amountCents: 35000,
      dueDate: '2026-09-10',
      guardianName: 'Maria da Silva',
      studentName: 'João',
      subjectName: 'Matemática',
    },
  ],
  page: 1,
  totalPages: 3,
  total: 42,
}

describe('useInvoices', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetch inicial monta URL sem query params quando filtros vazios', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => responseBody,
    })
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useInvoices())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/invoices')
  })

  it('muda status → refaz fetch com ?status=BLOCKED', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => responseBody })
      .mockResolvedValueOnce({ ok: true, json: async () => responseBody })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.setFilters({ status: 'BLOCKED' })
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/invoices?status=BLOCKED')
  })

  it('fetch falha (res.ok=false) → seta error, não lança', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Falha ao carregar cobranças.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useInvoices())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Falha ao carregar cobranças.')
    expect(result.current.items).toEqual([])
  })

  it('resposta 200 popula items/page/totalPages/total', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => responseBody,
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useInvoices())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual(responseBody.items)
    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.total).toBe(42)
    expect(result.current.error).toBeNull()
  })
})

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { InvoiceListItem } from '@/lib/services/billing.service'

// InvoiceListItem.dueDate é Date no service (server-side) — depois de res.json() (JSON não
// serializa Date), o valor real no client é string ISO. Reusar InvoiceListItem direto no client
// mentiria sobre esse shape (achado de code review, EDU-27).
export type InvoiceListItemDTO = Omit<InvoiceListItem, 'dueDate'> & { dueDate: string }

export interface InvoicesFilters {
  status?: string
  referenceMonth?: string
  page?: number
}

function buildQueryString(filters: InvoicesFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.referenceMonth) params.set('referenceMonth', filters.referenceMonth)
  if (filters.page) params.set('page', String(filters.page))
  const qs = params.toString()
  return qs ? `/api/invoices?${qs}` : '/api/invoices'
}

// EDU-27 — US-F2-06: lista de cobranças da Unit, com filtros/paginação server-side.
export function useInvoices() {
  const [items, setItems] = useState<InvoiceListItemDTO[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InvoicesFilters>({})

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildQueryString(filters))
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Falha ao carregar cobranças.')
        setItems([])
        return
      }
      const body = (await res.json()) as {
        items: InvoiceListItemDTO[]
        page: number
        totalPages: number
        total: number
      }
      setItems(body.items)
      setPage(body.page)
      setTotalPages(body.totalPages)
      setTotal(body.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Reemissão (linha ERROR) — achado de code review, EDU-27: estava como fetch inline na
  // page, violando a camada Component → Hook → Service → API (regra frontend.md). Movido pra
  // cá, mesmo padrão de approve/reject em use-pending-enrollments.ts.
  const reemitir = useCallback(async (invoiceId: string) => {
    const item = items.find((i) => i.id === invoiceId)
    if (!item) return

    const res = await fetch(`/api/enrollments/${item.enrollmentId}/invoices`, { method: 'POST' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? 'Falha ao reemitir cobrança.')
    }
    await refetch()
  }, [items, refetch])

  return { items, page, totalPages, total, loading, error, filters, setFilters, refetch, reemitir }
}

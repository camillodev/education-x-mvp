'use client'

import { useCallback, useEffect, useState } from 'react'

export interface PendingEnrollmentItem {
  guardianId: string
  guardianName: string
  plan: string
  students: string[]
  totalCents: number
}

export function filterPendingEnrollments(items: PendingEnrollmentItem[], query: string): PendingEnrollmentItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (i) => i.guardianName.toLowerCase().includes(q) || i.students.some((s) => s.toLowerCase().includes(q))
  )
}

export function usePendingEnrollments() {
  const [items, setItems] = useState<PendingEnrollmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/matriculas/pendentes')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; detail?: string }
        console.error(
          `[usePendingEnrollments] GET /api/matriculas/pendentes falhou (${res.status} ${body.code ?? ''}):`,
          body.detail ?? '(sem detail)'
        )
        setError(body.error ?? 'Falha ao carregar matrículas pendentes.')
        return
      }
      setItems((await res.json()) as PendingEnrollmentItem[])
    } catch (err) {
      console.error('[usePendingEnrollments] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const approve = useCallback(
    async (guardianId: string) => {
      const res = await fetch(`/api/matriculas/${guardianId}/aprovar`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao aprovar matrícula.')
      }
      await refetch()
    },
    [refetch]
  )

  const reject = useCallback(
    async (guardianId: string) => {
      const res = await fetch(`/api/matriculas/${guardianId}/recusar`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao recusar matrícula.')
      }
      await refetch()
    },
    [refetch]
  )

  return { items, loading, error, refetch, approve, reject }
}

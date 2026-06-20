'use client'

import { useCallback, useEffect, useState } from 'react'

export interface SchoolListItem {
  id: string
  name: string
  cnpj: string
  city: string
  state: string
  status: string
  createdAt: Date
  subjectCount: number
  franchiseParent: string | null
}

export interface SchoolFilters {
  query: string
  franchise: string // 'all' | <franchiseParent>
  status: string // 'all' | 'ACTIVE' | 'SUSPENDED' | 'PENDING'
}

export function filterSchools(schools: SchoolListItem[], f: SchoolFilters): SchoolListItem[] {
  const q = f.query.trim().toLowerCase()
  return schools.filter((s) => {
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.cnpj.toLowerCase().includes(q) ||
      (s.franchiseParent?.toLowerCase().includes(q) ?? false)
    const matchF = f.franchise === 'all' || s.franchiseParent === f.franchise
    const matchS = f.status === 'all' || s.status === f.status
    return matchQ && matchF && matchS
  })
}

export function useSchools() {
  const [schools, setSchools] = useState<SchoolListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/escolas')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
          detail?: string
        }
        // A causa técnica real (detail) vai pro console; a message amigável pra UI.
        console.error(
          `[useSchools] GET /api/escolas falhou (${res.status} ${body.code ?? ''}):`,
          body.detail ?? '(sem detail)'
        )
        setError(body.error ?? 'Falha ao carregar escolas.')
        return
      }
      setSchools((await res.json()) as SchoolListItem[])
    } catch (err) {
      console.error('[useSchools] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { schools, loading, error, refetch }
}

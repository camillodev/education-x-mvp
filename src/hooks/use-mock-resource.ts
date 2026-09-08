'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Fetch genérico para os endpoints /api/mock/* — mesmo contrato de loading/
 * error/refetch dos hooks reais (ver use-schools.ts), para que a troca por
 * dado real depois seja só trocar a URL, não reescrever a tela.
 */
export function useMockResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.error(`[useMockResource] GET ${url} falhou (${res.status})`)
        setError('Falha ao carregar dados.')
        return
      }
      setData((await res.json()) as T)
    } catch (err) {
      console.error(`[useMockResource] fetch error (${url}):`, err)
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

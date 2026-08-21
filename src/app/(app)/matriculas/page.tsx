'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { usePendingEnrollments, filterPendingEnrollments } from '@/hooks/use-pending-enrollments'
import { PendingEnrollmentsTable } from '@/components/admin/PendingEnrollmentsTable'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

export default function MatriculasPendentesPage() {
  const { items, loading, error, approve, reject } = usePendingEnrollments()
  const [query, setQuery] = useState('')
  const { toast } = useToast()

  const filtered = useMemo(() => filterPendingEnrollments(items, query), [items, query])

  async function handleApprove(guardianId: string) {
    try {
      await approve(guardianId)
      toast('Matrícula aprovada.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao aprovar matrícula.', 'error')
    }
  }

  async function handleReject(guardianId: string) {
    try {
      await reject(guardianId)
      toast('Matrícula recusada.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao recusar matrícula.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">Matrículas</p>
        <h1 className="text-2xl font-bold text-(--color-text)">Aprovação de matrículas</h1>
        <p className="text-sm text-(--color-text-subtle)">
          Responsáveis que já enviaram a matrícula e aceitaram o contrato, aguardando sua confirmação.
        </p>
      </div>

      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por responsável ou aluno"
          aria-label="Buscar por responsável ou aluno"
          leadingIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
      </div>

      {loading && <p className="py-12 text-center text-(--color-text-subtle)">Carregando matrículas…</p>}
      {error && <p className="py-12 text-center text-(--color-danger)">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="py-12 text-center text-(--color-text-subtle)">Nenhuma matrícula pendente.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <PendingEnrollmentsTable items={filtered} onApprove={handleApprove} onReject={handleReject} />
      )}
    </div>
  )
}

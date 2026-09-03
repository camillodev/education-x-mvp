'use client'

import { useInvoices } from '@/hooks/use-invoices'
import { InvoicesTable } from '@/components/billing/InvoicesTable'
import { DataTablePagination } from '@/components/DataTable'
import { Segmented } from '@/components/ui/segmented'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencida' },
  { value: 'BLOCKED', label: 'Aguardando cadastro' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'ERROR', label: 'Erro' },
]

export default function CobrancasPage() {
  const { items, page, totalPages, loading, error, filters, setFilters, reemitir } = useInvoices()
  const { toast } = useToast()

  async function handleReemitir(invoiceId: string) {
    try {
      await reemitir(invoiceId)
      toast('Cobrança reemitida.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao reemitir cobrança.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">Financeiro</p>
        <h1 className="text-2xl font-bold text-(--color-text)">Cobranças</h1>
        <p className="text-sm text-(--color-text-subtle)">
          Todas as cobranças emitidas para os responsáveis da sua unidade.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          aria-label="Filtrar por status"
          options={STATUS_OPTIONS}
          value={filters.status ?? ''}
          onChange={(status) => setFilters({ ...filters, status: status || undefined, page: undefined })}
        />
        <Input
          type="month"
          aria-label="Filtrar por mês de referência"
          value={filters.referenceMonth ?? ''}
          onChange={(e) => setFilters({ ...filters, referenceMonth: e.target.value || undefined, page: undefined })}
          className="max-w-[160px]"
        />
      </div>

      {loading && <p className="py-12 text-center text-(--color-text-subtle)">Carregando cobranças…</p>}
      {error && <p className="py-12 text-center text-(--color-danger)">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="py-12 text-center text-(--color-text-subtle)">Nenhuma cobrança emitida ainda.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <InvoicesTable items={items} onReemitir={handleReemitir} />
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setFilters({ ...filters, page: page - 1 })}
            onNext={() => setFilters({ ...filters, page: page + 1 })}
          />
        </>
      )}
    </div>
  )
}

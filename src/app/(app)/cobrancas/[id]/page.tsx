import { notFound } from 'next/navigation'
import { getUnitContext, ForbiddenError } from '@/lib/auth/unit-context'
import { getInvoiceDetail } from '@/lib/services/invoice-detail.service'
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CobrancaDetalhePage({ params }: Props) {
  const ctx = await getUnitContext()
  if (ctx.role !== 'orientador') {
    throw new ForbiddenError('Apenas a escola pode acessar o detalhe de uma cobrança')
  }

  const { id } = await params
  const invoice = await getInvoiceDetail(ctx.unitId, id)
  if (!invoice) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <InvoiceDetailView invoice={invoice} />
    </div>
  )
}

import { forUnit } from '../db'
import { decrypt } from '../crypto'
import { getAsaasClient } from '../integration/asaas/client'
import type { Invoice, InvoiceStatus, DiscountType } from '@prisma/client'

export class InvoiceNotFoundError extends Error {
  readonly status = 404
  constructor() {
    super('Cobrança não encontrada')
    this.name = 'InvoiceNotFoundError'
  }
}

export class InvoiceInvalidStateError extends Error {
  readonly status = 409
  constructor() {
    super('Cobrança não pode ser cancelada neste status')
    this.name = 'InvoiceInvalidStateError'
  }
}

export interface InvoiceDetail {
  id: string
  status: InvoiceStatus
  amountCents: number
  netAmountCents: number
  referenceMonth: string
  dueDate: Date
  emittedAt: Date | null
  paidAt: Date | null
  paidAmountCents: number | null
  asaasPaymentId: string | null
  asaasPaymentUrl: string | null
  asaasBankSlipUrl: string | null
  asaasBarCode: string | null
  student: { name: string }
  subject: { name: string }
  guardian: { asaasCustomerId: string | null }
  enrollment: {
    discountType: DiscountType | null
    discountValueBp: number | null
    discountValueCents: number | null
  }
  billingConfig: { lateFeePercent: number; monthlyInterestBp: number }
  payments: { asaasEvent: string; amountCents: number; paidAt: Date }[]
}

export async function getInvoiceDetail(
  unitId: string,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const db = forUnit(unitId)

  const row = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      enrollment: {
        include: {
          student: { select: { nameEnc: true } },
          subject: { select: { name: true } },
          guardian: { select: { asaasCustomerId: true } },
        },
      },
      unit: { include: { billingConfig: true } },
      payments: {
        select: { asaasEvent: true, amountCents: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      },
    },
  })

  if (!row) {
    return null
  }

  const studentName = await decrypt(row.enrollment.student.nameEnc)

  return {
    id: row.id,
    status: row.status,
    amountCents: row.amountCents,
    netAmountCents: row.netAmountCents,
    referenceMonth: row.referenceMonth,
    dueDate: row.dueDate,
    emittedAt: row.emittedAt,
    paidAt: row.paidAt,
    paidAmountCents: row.paidAmountCents,
    asaasPaymentId: row.asaasPaymentId,
    asaasPaymentUrl: row.asaasPaymentUrl,
    asaasBankSlipUrl: row.asaasBankSlipUrl,
    asaasBarCode: row.asaasBarCode,
    student: { name: studentName },
    subject: { name: row.enrollment.subject.name },
    guardian: { asaasCustomerId: row.enrollment.guardian.asaasCustomerId },
    enrollment: {
      discountType: row.enrollment.discountType,
      discountValueBp: row.enrollment.discountValueBp,
      discountValueCents: row.enrollment.discountValueCents,
    },
    billingConfig: row.unit.billingConfig!,
    payments: row.payments,
  }
}

export async function cancelInvoice(
  unitId: string,
  invoiceId: string,
  asaasApiKey: string
): Promise<Invoice> {
  const db = forUnit(unitId)

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })

  if (!invoice) {
    throw new InvoiceNotFoundError()
  }

  if (invoice.status !== 'PENDING') {
    throw new InvoiceInvalidStateError()
  }

  if (invoice.asaasPaymentId) {
    const client = getAsaasClient(asaasApiKey)
    await client.cancelPayment(invoice.asaasPaymentId)
  }

  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'CANCELLED' },
  })
}

export function calculateLateFeeAndInterest(
  billingConfig: { lateFeePercent: number; monthlyInterestBp: number },
  amountCents: number,
  dueDate: Date,
  now: Date
): { lateFeeCents: number; interestCents: number } {
  const lateFeeCents = Math.round((amountCents * billingConfig.lateFeePercent) / 10000)

  const dueDateUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate())
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const daysLate = Math.max(1, Math.round((nowUTC - dueDateUTC) / 86400000))

  const interestCents = Math.round(
    ((amountCents * billingConfig.monthlyInterestBp) / 10000) * (daysLate / 30)
  )

  return { lateFeeCents, interestCents }
}

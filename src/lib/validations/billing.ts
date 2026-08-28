import { z } from 'zod'

// "YYYY-MM" com zero-pad estrito — usado como parte de Invoice.idempotencyKey, então
// grafias equivalentes não normalizadas (ex: "2026-8") quebrariam a idempotência.
export const ReferenceMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'referenceMonth deve estar no formato YYYY-MM')
  .optional()

export const EmitInvoiceBodySchema = z.object({
  referenceMonth: ReferenceMonthSchema,
})

export const EmitBatchBodySchema = z.object({
  subjectId: z.string().min(1, 'subjectId é obrigatório'),
  referenceMonth: ReferenceMonthSchema,
})

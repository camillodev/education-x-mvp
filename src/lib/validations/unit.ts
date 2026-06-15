import { z } from 'zod'

export const SubjectSchema = z.object({
  name: z.string().min(1, 'Nome da matéria obrigatório'),
  nfseServiceCode: z.string().min(1, 'Código NFS-e obrigatório'),
  priceCents: z.number().int().positive('Preço deve ser positivo'),
})

export const BillingConfigSchema = z.object({
  dueDay: z.number().int().min(1).max(28),
  closingDay: z.number().int().min(1).max(28),
  lateFeePercent: z.number().int().min(0).max(500),
  monthlyInterestBp: z.number().int().min(0).max(300),
  enablesSpc: z.boolean(),
  autoBilling: z.boolean(),
  acceptsCard: z.boolean(),
  cardFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  negativacaoFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  municipalRegistration: z.string().min(1, 'Inscrição municipal obrigatória'),
})

export const CreateSchoolSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter exatamente 14 dígitos numéricos'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  address: z.string().min(5, 'Endereço inválido'),
  complement: z.string().optional(),
  city: z.string().min(2, 'Cidade inválida'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  isFranchise: z.boolean(),
  franchiseParent: z.string().optional(),
  billing: BillingConfigSchema,
  subjects: z
    .array(SubjectSchema)
    .min(1, 'Pelo menos 1 matéria obrigatória'),
  termsVersionId: z.string().cuid('ID do termo de uso inválido'),
})

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
export type SubjectInput = z.infer<typeof SubjectSchema>

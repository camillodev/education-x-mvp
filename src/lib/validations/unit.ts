import { z } from 'zod'
import { isValidCnpj, isValidBrMobile, isValidCpf } from './br-documents'

export const SubjectSchema = z.object({
  name: z.string().min(1, 'Nome da matéria obrigatório'),
  nfseServiceCode: z.string().min(1, 'Código NFS-e obrigatório'),
  // priceCents = valor mensal (sempre obrigatório, base para cálculo de desconto dos planos)
  priceCents: z.number().int().positive('Preço deve ser positivo'),
  quarterlyPriceCents: z.number().int().positive().optional(),
  semiannualPriceCents: z.number().int().positive().optional(),
  annualPriceCents: z.number().int().positive().optional(),
})

export const BillingConfigSchema = z.object({
  dueDay: z.number().int().min(1).max(28),
  closingDay: z.number().int().min(1).max(28),
  lateFeePercent: z.number().int().min(0).max(500),
  monthlyInterestBp: z.number().int().min(0).max(300),
  // autoBilling/enablesSpc/acceptsCard são sempre ligados no MVP — não vêm da UI,
  // têm default no banco. A escola só decide quem paga cada taxa.
  cardFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  negativacaoFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  municipalRegistration: z.string().min(1, 'Inscrição municipal obrigatória'),
})

export const PlanSchema = z
  .object({
    planId: z.enum(['basico', 'crescimento', 'pro']),
    isBeta: z.boolean(),
    discountType: z.enum(['PERCENT', 'FIXED']).optional(),
    discountValueBp: z.number().int().min(1).max(10000).optional(),
    discountValueCents: z.number().int().positive().optional(),
  })
  .refine(
    (p) =>
      p.discountType === undefined ||
      (p.discountType === 'PERCENT' && p.discountValueBp !== undefined) ||
      (p.discountType === 'FIXED' && p.discountValueCents !== undefined),
    { message: 'Desconto incompleto: tipo sem o valor correspondente' }
  )

export const CreateSchoolSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter exatamente 14 dígitos numéricos')
    .refine(isValidCnpj, 'CNPJ inválido (dígito verificador não confere)'),
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
  cnpjStatus: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  phone: z
    .string()
    .refine(isValidBrMobile, 'Celular inválido (DDD + 9 dígitos, com o 9)'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  address: z.string().min(5, 'Endereço inválido'),
  number: z.string().min(1, 'Número obrigatório'),
  neighborhood: z.string().min(2, 'Bairro inválido'),
  complement: z.string().optional(),
  city: z.string().min(2, 'Cidade inválida'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  isFranchise: z.boolean(),
  franchiseParent: z.string().optional(),
  // Responsável da unidade — recebe o e-mail de aceite dos termos
  responsibleName: z.string().min(3, 'Nome do responsável obrigatório'),
  responsibleCpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos')
    .refine(isValidCpf, 'CPF inválido (dígito verificador não confere)'),
  responsibleEmail: z.string().email('E-mail do responsável inválido'),
  responsiblePhone: z
    .string()
    .refine(isValidBrMobile, 'Celular do responsável inválido (DDD + 9 dígitos)'),
  billing: BillingConfigSchema,
  plan: PlanSchema,
  subjects: z
    .array(SubjectSchema)
    .min(1, 'Pelo menos 1 matéria obrigatória'),
})

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
export type SubjectInput = z.infer<typeof SubjectSchema>

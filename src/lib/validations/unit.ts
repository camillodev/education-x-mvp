import { z } from 'zod'
import { isValidCnpj, isValidBrPhone, isValidCpf } from './br-documents'

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
  // autoBilling/enablesSpc/acceptsCard são sempre ligados no MVP — não vêm da UI,
  // têm default no banco. A escola só decide quem paga cada taxa.
  cardFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  negativacaoFeePayer: z.enum(['RESPONSAVEL', 'ESCOLA']),
  municipalRegistration: z.string().min(1, 'Inscrição municipal obrigatória'),
})

export const CreateSchoolSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter exatamente 14 dígitos numéricos')
    .refine(isValidCnpj, 'CNPJ inválido (dígito verificador não confere)'),
  email: z.string().email('E-mail inválido'),
  phone: z
    .string()
    .refine(isValidBrPhone, 'Telefone inválido (DDD e formato precisam ser válidos)'),
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
    .refine(isValidBrPhone, 'Telefone do responsável inválido'),
  billing: BillingConfigSchema,
  subjects: z
    .array(SubjectSchema)
    .min(1, 'Pelo menos 1 matéria obrigatória'),
})

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
export type SubjectInput = z.infer<typeof SubjectSchema>

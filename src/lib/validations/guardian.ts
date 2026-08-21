import { z } from 'zod'
import { isValidCpf, isValidBrMobile } from './br-documents'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const GuardianStepSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Digite seu nome completo.')
    .refine((v) => v.includes(' '), 'Digite seu nome completo.'),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine(isValidCpf, 'CPF inválido. Confira os números.'),
  email: z.string().trim().regex(EMAIL_REGEX, 'Digite um e-mail válido.'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine(isValidBrMobile, 'Digite um celular válido, com DDD.'),
  type: z.enum(['FATHER', 'MOTHER', 'LEGAL_GUARDIAN'], {
    message: 'Selecione o tipo de responsável.',
  }),
})

export type GuardianStepInput = z.infer<typeof GuardianStepSchema>

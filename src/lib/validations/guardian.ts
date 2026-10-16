import { z } from "zod";
import {
  isValidBrMobile,
  isValidBrPhone,
  isValidCnpj,
  isValidCpf,
} from "./br-documents";

const normalizeDocument = (value: string) =>
  value.replace(/[^a-z\d]/gi, "").toUpperCase();
const isValidTaxDocument = (value: string) => {
  const normalized = normalizeDocument(value);
  return normalized.length === 11
    ? isValidCpf(normalized)
    : isValidCnpj(normalized);
};

export const GuardianStepSchema = z.object({
  name: z.string().trim().min(3, "Digite seu nome completo.").refine(
    (value) => value.includes(" "),
    "Digite seu nome completo.",
  ),
  cpfCnpj: z.string().transform(normalizeDocument).refine(
    isValidTaxDocument,
    "CPF ou CNPJ inválido. Confira os caracteres e dígitos verificadores.",
  ),
  email: z.string().trim().email("Digite um e-mail válido."),
  mobilePhone: z.string().transform((value) => value.replace(/\D/g, "")).refine(
    isValidBrMobile,
    "Digite um celular válido, com DDD.",
  ),
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).refine(
    (value) => !value || /^\d{8}$/.test(value),
    "Digite um CEP válido.",
  ),
  address: z.string().trim(),
  addressNumber: z.string().trim(),
  complement: z.string().trim(),
  province: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim().toUpperCase(),
  phone: z.string().transform((value) => value.replace(/\D/g, "")).refine(
    (value) => !value || isValidBrPhone(value),
    "Digite um telefone fixo válido.",
  ),
  additionalEmails: z.string().trim().refine(
    (value) =>
      !value ||
      value.split(/[;,]/).every((email) =>
        z.string().email().safeParse(email.trim()).success
      ),
    "Confira os e-mails adicionais.",
  ),
  type: z.enum(["FATHER", "MOTHER", "LEGAL_GUARDIAN"], {
    message: "Selecione o tipo de responsável.",
  }),
});

export type GuardianStepInput = z.input<typeof GuardianStepSchema>;
export type GuardianStepOutput = z.output<typeof GuardianStepSchema>;

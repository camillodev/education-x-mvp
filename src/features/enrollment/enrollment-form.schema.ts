import { z } from "zod";
import type { DiscountType } from "@/lib/pricing";
import type { EnrollmentPlan, SubjectId } from "@/lib/mock/types";
import {
  isValidBrMobile,
  isValidBrPhone,
  isValidCnpj,
  isValidCpf,
} from "@/lib/validations/br-documents";
import { parseBirthDate } from "@/lib/validations/student";

const normalizeDocument = (value: string) =>
  value.replace(/[^a-z\d]/gi, "").toUpperCase();
const isValidTaxDocument = (value: string) => {
  const document = normalizeDocument(value);
  return document.length === 11 ? isValidCpf(document) : isValidCnpj(document);
};
const isValidEmail = (value: string) =>
  z.string().email().safeParse(value.trim()).success;
const SubjectIdSchema = z.enum([
  "matematica",
  "portugues",
  "ingles",
  "japones",
]);

export const GuardianEnrollmentSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").refine(
    (value) => value.trim().includes(" "),
    "Informe nome e sobrenome.",
  ),
  cpfCnpj: z.string().refine(
    isValidTaxDocument,
    "Informe um CPF ou CNPJ válido.",
  ),
  email: z.string().trim().email("Informe um e-mail válido."),
  mobilePhone: z.string().refine(
    (value) => isValidBrMobile(value.replace(/\D/g, "")),
    "Informe um celular válido com DDD.",
  ),
  postalCode: z.string().refine(
    (value) => !value.trim() || /^\d{8}$/.test(value.replace(/\D/g, "")),
    "Informe um CEP válido.",
  ),
  address: z.string(),
  addressNumber: z.string(),
  complement: z.string(),
  province: z.string(),
  city: z.string(),
  state: z.string(),
  phone: z.string().refine(
    (value) => !value.trim() || isValidBrPhone(value.replace(/\D/g, "")),
    "Informe um telefone fixo válido.",
  ),
  additionalEmails: z.string().refine(
    (value) =>
      !value.trim() ||
      value.split(/[;,]/).every((email) => isValidEmail(email)),
    "Confira os e-mails adicionais.",
  ),
  guardianType: z.enum(["FATHER", "MOTHER", "LEGAL_GUARDIAN"]).optional(),
  showAddress: z.boolean(),
});

export const StudentEnrollmentSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo do aluno.").refine(
    (value) => value.includes(" "),
    "Informe nome e sobrenome.",
  ),
  birthDate: z.string().refine((value) => {
    const date = parseBirthDate(value);
    return date !== null && date.getTime() <= Date.now();
  }, "Informe uma data de nascimento válida, não futura."),
  email: z.string().trim().refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Informe um e-mail válido.",
  ),
  cpf: z.string().refine(
    (value) => !value.trim() || isValidCpf(value.replace(/\D/g, "")),
    "Informe um CPF válido.",
  ),
  mobilePhone: z.string().refine(
    (value) => !value.trim() || isValidBrMobile(value.replace(/\D/g, "")),
    "Informe um celular válido com DDD.",
  ),
  rg: z.string(),
  rgIssuer: z.string(),
  subjectIds: z.array(SubjectIdSchema).min(
    1,
    "Selecione ao menos uma matéria.",
  ),
  plan: z.string().min(1),
  discount: z.boolean(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.string(),
});

const PlanStepSchema = z.object({
  plan: z.string().min(1, "Selecione um plano."),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.string(),
  dueDate: z.string().regex(
    /^(?:[1-9]|[12]\d|3[01])$/,
    "Informe um dia entre 1 e 31.",
  ),
});

export const EnrollmentFormSchema = z.object({
  guardian: GuardianEnrollmentSchema,
  students: z.array(StudentEnrollmentSchema).min(
    1,
    "Adicione ao menos um aluno.",
  ).max(5, "O limite é de cinco alunos."),
  plan: PlanStepSchema,
});

export type EnrollmentFormValues = z.infer<typeof EnrollmentFormSchema>;
export type EnrollmentStudentValues = z.infer<typeof StudentEnrollmentSchema>;
export type EnrollmentMode = "create" | "edit";
export type { DiscountType, EnrollmentPlan, SubjectId };

export function createEmptyStudentValues(
  planName = "Mensal",
): EnrollmentStudentValues {
  return {
    name: "",
    birthDate: "",
    email: "",
    cpf: "",
    mobilePhone: "",
    rg: "",
    rgIssuer: "",
    subjectIds: ["matematica"],
    plan: planName,
    discount: false,
    discountType: "PERCENT",
    discountValue: "0",
  };
}

export function createEmptyEnrollmentFormValues(
  planName = "Mensal",
): EnrollmentFormValues {
  return {
    guardian: {
      name: "",
      cpfCnpj: "",
      email: "",
      mobilePhone: "",
      postalCode: "",
      address: "",
      addressNumber: "",
      complement: "",
      province: "",
      city: "",
      state: "",
      phone: "",
      additionalEmails: "",
      guardianType: "MOTHER",
      showAddress: false,
    },
    students: [createEmptyStudentValues(planName)],
    plan: {
      plan: planName,
      discountType: "PERCENT",
      discountValue: "0",
      dueDate: "10",
    },
  };
}

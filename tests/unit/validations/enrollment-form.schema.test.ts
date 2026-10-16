import { describe, expect, it } from "vitest";
import {
  createEmptyEnrollmentFormValues,
  EnrollmentFormSchema,
} from "@/features/enrollment/enrollment-form.schema";

function validValues() {
  const values = createEmptyEnrollmentFormValues();
  values.guardian = {
    ...values.guardian,
    name: "Maria da Silva",
    cpfCnpj: "529.982.247-25",
    email: "maria@example.com",
    mobilePhone: "(31) 99999-0000",
    postalCode: "01001-000",
    address: "Praça da Sé",
    addressNumber: "100",
    complement: "Apto 10",
    province: "Sé",
    phone: "(11) 3333-4444",
    additionalEmails: "financeiro@example.com",
  };
  values.students[0] = {
    ...values.students[0],
    name: "João da Silva",
    birthDate: "15/03/2015",
    email: "joao@example.com",
    cpf: "111.444.777-35",
    mobilePhone: "(31) 98888-7777",
    rg: "12.345.678",
    rgIssuer: "SSP/MG",
  };
  return values;
}

describe("EnrollmentFormSchema", () => {
  it("accepts the complete guardian and student payload", () => {
    expect(EnrollmentFormSchema.safeParse(validValues()).success).toBe(true);
  });

  it.each([
    "",
    "529.982.247-26",
    "00000000000",
    "11222333000199",
    "00.000.000/E08G-13",
  ])(
    "rejects invalid guardian CPF/CNPJ %s",
    (cpfCnpj) => {
      const result = EnrollmentFormSchema.safeParse({
        ...validValues(),
        guardian: { ...validValues().guardian, cpfCnpj },
      });
      expect(result.success).toBe(false);
    },
  );

  it("accepts a valid alphanumeric CNPJ for the guardian", () => {
    const values = validValues();
    values.guardian.cpfCnpj = "00.000.000/E08G-12";
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(true);
  });

  it.each(["name", "cpfCnpj", "email", "mobilePhone"])(
    "requires guardian %s",
    (field) => {
      const values = validValues();
      Object.assign(values.guardian, { [field]: "" });
      expect(EnrollmentFormSchema.safeParse(values).success).toBe(false);
    },
  );

  it.each(["name", "birthDate"])("requires student %s", (field) => {
    const values = validValues();
    Object.assign(values.students[0], { [field]: "" });
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(false);
  });

  it("allows an empty student email but rejects an invalid one", () => {
    const values = validValues();
    values.students[0].email = "";
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(true);

    values.students[0].email = "not-an-email";
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(false);
  });

  it("allows the student's optional CPF, mobile and RG fields to be empty", () => {
    const values = validValues();
    values.students[0].cpf = "";
    values.students[0].mobilePhone = "";
    values.students[0].rg = "";
    values.students[0].rgIssuer = "";
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(true);
  });

  it("allows optional guardian address, landline and additional emails to be empty", () => {
    const values = validValues();
    values.guardian.postalCode = "";
    values.guardian.address = "";
    values.guardian.addressNumber = "";
    values.guardian.complement = "";
    values.guardian.province = "";
    values.guardian.phone = "";
    values.guardian.additionalEmails = "";
    expect(EnrollmentFormSchema.safeParse(values).success).toBe(true);
  });

  it("rejects invalid birth dates and malformed optional emails", () => {
    const invalidDate = validValues();
    invalidDate.students[0].birthDate = "31/02/2015";
    expect(EnrollmentFormSchema.safeParse(invalidDate).success).toBe(false);

    const invalidEmail = validValues();
    invalidEmail.guardian.additionalEmails = "nao-e-email";
    expect(EnrollmentFormSchema.safeParse(invalidEmail).success).toBe(false);
  });
});

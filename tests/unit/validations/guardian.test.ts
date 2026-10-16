import { describe, expect, it } from "vitest";
import { GuardianStepSchema } from "@/lib/validations/guardian";

const validInput = {
  name: "Maria da Silva",
  cpfCnpj: "111.444.777-35",
  email: "maria@example.com",
  mobilePhone: "(31) 98888-7777",
  postalCode: "01001-000",
  address: "Praça da Sé",
  addressNumber: "100",
  complement: "Apto 10",
  province: "Sé",
  city: "São Paulo",
  state: "sp",
  phone: "(11) 3333-4444",
  additionalEmails: "financeiro@example.com, outro@example.com",
  type: "MOTHER" as const,
};

describe("GuardianStepSchema", () => {
  it("accepts and normalizes a complete guardian payload", () => {
    expect(GuardianStepSchema.parse(validInput)).toMatchObject({
      cpfCnpj: "11144477735",
      mobilePhone: "31988887777",
      postalCode: "01001000",
      phone: "1133334444",
      state: "SP",
      name: "Maria da Silva",
    });
  });

  it("accepts a mathematically valid alphanumeric CNPJ", () => {
    expect(
      GuardianStepSchema.safeParse({
        ...validInput,
        cpfCnpj: "00.000.000/E08G-12",
      }).success,
    ).toBe(true);
  });

  it.each(["name", "cpfCnpj", "email", "mobilePhone", "type"] as const)(
    "requires %s",
    (field) => {
      expect(
        GuardianStepSchema.safeParse({ ...validInput, [field]: "" }).success,
      ).toBe(false);
    },
  );

  it("allows optional address, landline and additional emails to be empty", () => {
    expect(
      GuardianStepSchema.safeParse({
        ...validInput,
        postalCode: "",
        address: "",
        addressNumber: "",
        complement: "",
        province: "",
        city: "",
        state: "",
        phone: "",
        additionalEmails: "",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid tax id, mobile, CEP, landline and additional email", () => {
    for (
      const field of [
        "cpfCnpj",
        "mobilePhone",
        "postalCode",
        "phone",
        "additionalEmails",
      ] as const
    ) {
      const value = field === "cpfCnpj"
        ? "111.444.777-36"
        : field === "mobilePhone"
        ? "3138887777"
        : field === "postalCode"
        ? "123"
        : field === "phone"
        ? "2099999999"
        : "broken-email";
      expect(
        GuardianStepSchema.safeParse({ ...validInput, [field]: value }).success,
      ).toBe(false);
    }
  });
});

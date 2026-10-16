import { describe, expect, it } from "vitest";
import {
  parseBirthDate,
  StudentBlockSchema,
  StudentsStepSchema,
} from "@/lib/validations/student";

describe("parseBirthDate", () => {
  it("faz parse de data válida DD/MM/AAAA", () => {
    const date = parseBirthDate("15/03/2015");
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2015);
    expect(date!.getMonth()).toBe(2); // março = índice 2
    expect(date!.getDate()).toBe(15);
  });

  it("rejeita 31/02 (dia inexistente no mês) — não faz overflow silencioso pra março", () => {
    expect(parseBirthDate("31/02/2015")).toBeNull();
  });

  it("rejeita mês 13", () => {
    expect(parseBirthDate("01/13/2015")).toBeNull();
  });

  it("rejeita formato fora de DD/MM/AAAA", () => {
    expect(parseBirthDate("2015-03-15")).toBeNull();
    expect(parseBirthDate("15/3/2015")).toBeNull();
  });
});

const validBlock = {
  name: "João Silva",
  birthDate: "15/03/2015",
  email: "joao@example.com",
  cpf: "",
  mobilePhone: "",
  rg: "",
  rgIssuer: "",
  subjectIds: ["subj-1"],
};

describe("StudentBlockSchema", () => {
  it("aceita bloco válido e converte birthDate pra Date", () => {
    const result = StudentBlockSchema.parse(validBlock);
    expect(result.birthDate).toBeInstanceOf(Date);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(() => StudentBlockSchema.parse({ ...validBlock, name: "A" }))
      .toThrow();
  });

  it("rejeita data futura", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = `${String(future.getDate()).padStart(2, "0")}/${
      String(future.getMonth() + 1).padStart(2, "0")
    }/${future.getFullYear()}`;
    expect(() =>
      StudentBlockSchema.parse({ ...validBlock, birthDate: futureStr })
    ).toThrow();
  });

  it("rejeita idade implausível (>99 anos)", () => {
    expect(() =>
      StudentBlockSchema.parse({ ...validBlock, birthDate: "01/01/1900" })
    ).toThrow();
  });

  it("rejeita sem nenhuma matéria selecionada", () => {
    expect(() => StudentBlockSchema.parse({ ...validBlock, subjectIds: [] }))
      .toThrow();
  });

  it("requires student email and validates optional CPF and mobile", () => {
    expect(() => StudentBlockSchema.parse({ ...validBlock, email: "" }))
      .toThrow();
    expect(() =>
      StudentBlockSchema.parse({ ...validBlock, cpf: "11144477736" })
    ).toThrow();
    expect(() =>
      StudentBlockSchema.parse({ ...validBlock, mobilePhone: "3133334444" })
    ).toThrow();
    expect(
      StudentBlockSchema.parse({
        ...validBlock,
        cpf: "111.444.777-35",
        mobilePhone: "(31) 98888-7777",
      }),
    ).toMatchObject({ cpf: "11144477735", mobilePhone: "31988887777" });
  });
});

describe("StudentsStepSchema", () => {
  it("aceita de 1 a 5 alunos", () => {
    expect(() => StudentsStepSchema.parse([validBlock])).not.toThrow();
    expect(() => StudentsStepSchema.parse(Array(5).fill(validBlock))).not
      .toThrow();
  });

  it("rejeita 0 alunos", () => {
    expect(() => StudentsStepSchema.parse([])).toThrow();
  });

  it("rejeita mais de 5 alunos (R1/R20 — limite é servidor, não só UI)", () => {
    expect(() => StudentsStepSchema.parse(Array(6).fill(validBlock))).toThrow();
  });
});

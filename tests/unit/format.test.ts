import { describe, expect, it } from "vitest";
import { maskCnpjTail, maskCpfCnpj } from "@/lib/format";

describe("maskCnpjTail", () => {
  it("mostra bullets + últimos 5 dígitos de um CNPJ de 14 dígitos", () => {
    expect(maskCnpjTail("11222333000190")).toBe("•••• 00190");
  });

  it("ignora máscara/pontuação no input", () => {
    expect(maskCnpjTail("11.222.333/0001-90")).toBe("•••• 00190");
  });

  it("lida com menos de 5 dígitos sem quebrar", () => {
    expect(maskCnpjTail("123")).toBe("•••• 123");
  });
});

describe("maskCpfCnpj", () => {
  it("applies CPF punctuation to numeric eleven-character documents", () => {
    expect(maskCpfCnpj("52998224725")).toBe("529.982.247-25");
  });

  it("preserves letters and applies the new CNPJ mask", () => {
    expect(maskCpfCnpj("00000000e08g12")).toBe("00.000.000/E08G-12");
  });
});

import { describe, expect, it } from "vitest";
import {
  availablePlans,
  economyPercent,
  PlanStepSchema,
  priceCentsForPlan,
} from "@/lib/validations/plan";

const FULL_PRICING = {
  priceCents: 30000,
  quarterlyPriceCents: 28000,
  semiannualPriceCents: 26000,
  annualPriceCents: 24000,
};
const MONTHLY_ONLY = {
  priceCents: 30000,
  quarterlyPriceCents: null,
  semiannualPriceCents: null,
  annualPriceCents: 20000,
};

describe("priceCentsForPlan", () => {
  it("retorna o campo correspondente ao plano (R5a)", () => {
    expect(priceCentsForPlan(FULL_PRICING, "MONTHLY")).toBe(30000);
    expect(priceCentsForPlan(FULL_PRICING, "QUARTERLY")).toBe(28000);
    expect(priceCentsForPlan(FULL_PRICING, "ANNUAL")).toBe(24000);
  });

  it("retorna null quando o Subject não tem esse plano configurado", () => {
    expect(priceCentsForPlan(MONTHLY_ONLY, "QUARTERLY")).toBeNull();
  });
});

describe("availablePlans", () => {
  it("inclui todos os planos quando todos os Subjects têm preço configurado", () => {
    expect(availablePlans([FULL_PRICING])).toEqual([
      "MONTHLY",
      "QUARTERLY",
      "SEMIANNUAL",
      "ANNUAL",
    ]);
  });

  it("exclui plano que falta em QUALQUER subject selecionado (1 plano cobre todas as matérias)", () => {
    expect(availablePlans([FULL_PRICING, MONTHLY_ONLY])).toEqual([
      "MONTHLY",
      "ANNUAL",
    ]);
  });

  it("MONTHLY sempre disponível (priceCents é obrigatório no schema)", () => {
    expect(availablePlans([MONTHLY_ONLY])).toContain("MONTHLY");
  });
});

describe("economyPercent", () => {
  it("calcula economia percentual arredondada vs. mensal", () => {
    expect(economyPercent(30000, 24000)).toBe(20);
  });

  it("retorna 0 quando o plano custa igual ao mensal", () => {
    expect(economyPercent(30000, 30000)).toBe(0);
  });
});

describe("PlanStepSchema", () => {
  it("aceita um dos 4 planos", () => {
    expect(() => PlanStepSchema.parse({ plan: "ANNUAL" })).not.toThrow();
  });

  it("rejeita plano fora do enum", () => {
    expect(() => PlanStepSchema.parse({ plan: "BIENAL" })).toThrow();
  });
});

describe("PlanStepSchema form input", () => {
  it("rejects an empty plan selection before submission", () => {
    expect(PlanStepSchema.safeParse({ plan: "" }).success).toBe(false);
  });
});

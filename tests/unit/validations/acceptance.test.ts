import { describe, expect, it } from "vitest";
import { AcceptanceStepSchema } from "@/lib/validations/acceptance";

describe("AcceptanceStepSchema", () => {
  it("requires explicit acceptance of the contract", () => {
    expect(AcceptanceStepSchema.safeParse({ accepted: false }).success).toBe(
      false,
    );
    expect(AcceptanceStepSchema.safeParse({ accepted: true }).success).toBe(
      true,
    );
  });
});

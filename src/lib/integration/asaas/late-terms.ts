import type { AsaasFineConfig, AsaasInterestConfig } from "./types";

interface LateTermsConfig {
  lateFeePercent: number; // basis points
  monthlyInterestBp: number; // basis points
}

// Asaas expects percentages, billingConfig stores basis points
export function lateChargeTerms(config: LateTermsConfig): {
  fine: AsaasFineConfig;
  interest: AsaasInterestConfig;
} {
  return {
    fine: { value: config.lateFeePercent / 100 },
    interest: { value: config.monthlyInterestBp / 100 },
  };
}

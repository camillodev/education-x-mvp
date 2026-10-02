import type { ChartPoint } from "./types";

// Faturamento — valores em centavos.
export const REVENUE_6M: ChartPoint[] = [
  { label: "Jan", value: 3120000 }, { label: "Fev", value: 3380000 }, { label: "Mar", value: 3510000 },
  { label: "Abr", value: 3690000 }, { label: "Mai", value: 3760000 }, { label: "Jun", value: 3840000, highlight: true },
];

// Percentuais e contagens — não são dinheiro, ficam como estão (não centavos).
export const DELINQUENCY_6M: ChartPoint[] = [
  { label: "Jan", value: 4.2 }, { label: "Fev", value: 3.8 }, { label: "Mar", value: 3.5 },
  { label: "Abr", value: 3.6 }, { label: "Mai", value: 3.2 }, { label: "Jun", value: 3.1, highlight: true },
];

export const STUDENTS_6M: ChartPoint[] = [
  { label: "Jan", value: 71 }, { label: "Fev", value: 74 }, { label: "Mar", value: 77 },
  { label: "Abr", value: 79 }, { label: "Mai", value: 81 }, { label: "Jun", value: 84, highlight: true },
];

export const CHURN_6M: ChartPoint[] = [
  { label: "Jan", value: 2.8 }, { label: "Fev", value: 2.4 }, { label: "Mar", value: 3.1 },
  { label: "Abr", value: 2.0 }, { label: "Mai", value: 1.9 }, { label: "Jun", value: 1.6, highlight: true },
];

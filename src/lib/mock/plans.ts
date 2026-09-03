import type { EnrollmentPlan } from "./types";

// Planos de mensalidade do aluno (distinto de PLANOS_IX — plano SaaS da
// plataforma, ver platform-billing.ts). Valores em centavos.
export const ENROLLMENT_PLANS: EnrollmentPlan[] = [
  { id: "mensal", nome: "Mensal", parcela: 45000, meses: 1, total: 45000, desc: "Cobrança todo mês" },
  { id: "trimestral", nome: "Trimestral", parcela: 42700, meses: 3, total: 128100, desc: "Assinatura trimestral · 5% off", badge: "5% off" },
  { id: "semestral", nome: "Semestral", parcela: 40500, meses: 6, total: 243000, desc: "Assinatura semestral · 10% off", badge: "10% off" },
  { id: "anual", nome: "Anual", parcela: 36000, meses: 12, total: 432000, desc: "Assinatura anual · 20% off", badge: "Melhor preço" },
];

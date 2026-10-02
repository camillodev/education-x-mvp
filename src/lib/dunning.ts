// Prazo fixo de negativação, contado a partir do vencimento da Invoice.
// Decisão de produto (Rafa, 2026-09-22) — ADR-0008 Emenda 1. Igual para toda escola:
// não é configurável por Unit, por isso é constante e não coluna.
// Os avisos pré-negativação (D-3/D0/D+1) são da régua nativa do Asaas, não daqui.
export const NEGATIVATION_DAYS_AFTER_OVERDUE = 60

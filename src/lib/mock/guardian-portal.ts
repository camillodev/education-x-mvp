import type { GuardianInvoice } from "./types";

// Cobranças do próprio responsável, como aparecem no Portal do Responsável
// (shape parecido com INVOICES, mas visão do titular — não da escola).
// Valores em centavos.
export const GUARDIAN_INVOICES: GuardianInvoice[] = [
  { id: "p0", desc: "Mensalidade Maio/2026", valor: 45000, valorAtualizado: 47100, venc: "07/05/2026", status: "vencida", forma: "Boleto", atraso: 26 },
  { id: "p1", desc: "Mensalidade Junho/2026", valor: 45000, venc: "07/06/2026", status: "avencer", forma: "PIX" },
  { id: "p2", desc: "Material didático", valor: 12000, venc: "20/04/2026", status: "paga", forma: "Boleto", pagoEm: "18/04/2026", nf: "00008711" },
  { id: "p3", desc: "Mensalidade Abril/2026", valor: 45000, venc: "07/04/2026", status: "paga", forma: "PIX", pagoEm: "05/04/2026", nf: "00008690" },
];

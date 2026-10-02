import type { LedgerEntry, Receivable, SchoolBalance } from "./types";

// Saldo separado por origem: PIX/boleto cai na hora; cartão liquida em D+X.
// Valores em centavos.
export const SCHOOL_BALANCE: SchoolBalance = {
  disponivel: 1845000,
  aLiberar: 987000,
  pixRecebido: 1845000,
  cartaoPendente: 987000,
};

export const RECEIVABLES: Receivable[] = [
  { id: "r1", origem: "Cartão", desc: "Mensalidades · lote 02/06", bruto: 360000, liberaEm: "02/07/2026", dias: 30 },
  { id: "r2", origem: "Cartão", desc: "Mensalidades · lote 28/05", bruto: 294000, liberaEm: "27/06/2026", dias: 25 },
  { id: "r3", origem: "Cartão", desc: "Mensalidades · lote 20/05", bruto: 213000, liberaEm: "19/06/2026", dias: 17 },
  { id: "r4", origem: "Cartão", desc: "Material didático · lote 15/05", bruto: 120000, liberaEm: "14/06/2026", dias: 12 },
];

export const LEDGER_ENTRIES: LedgerEntry[] = [
  { id: "e1", tipo: "entrada", origem: "PIX", desc: "Patrícia Lopes · Mensalidade Maio", valor: 38000, data: "Hoje, 09:12", status: "disponivel" },
  { id: "e2", tipo: "entrada", origem: "Boleto", desc: "Rodrigo Nunes · Mensalidade Maio", valor: 60000, data: "Ontem, 16:40", status: "disponivel" },
  { id: "e3", tipo: "entrada", origem: "Cartão", desc: "Fernanda Dias · Mensalidade Maio", valor: 38000, data: "Ontem, 11:05", status: "aliberar", liberaEm: "20/06" },
  { id: "e4", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 1200000, data: "01/06, 08:00", status: "concluido" },
  { id: "e5", tipo: "entrada", origem: "PIX", desc: "Maria Silva · Material didático", valor: 12000, data: "31/05, 14:22", status: "disponivel" },
  { id: "e6", tipo: "entrada", origem: "Antecipação", desc: "Antecipação de recebíveis (líquido)", valor: 418000, data: "29/05, 10:15", status: "disponivel" },
  // extras (segunda página do extrato no dashboard)
  { id: "e7", tipo: "entrada", origem: "PIX", desc: "Carlos Andrade · Mensalidade Maio", valor: 45000, data: "30/05, 09:40", status: "disponivel" },
  { id: "e8", tipo: "entrada", origem: "Boleto", desc: "Rodrigo Nunes · Mensalidade Abril", valor: 60000, data: "28/05, 16:00", status: "disponivel" },
  { id: "e9", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 800000, data: "25/05, 08:00", status: "concluido" },
  { id: "e10", tipo: "entrada", origem: "Cartão", desc: "Renata Alves · Mensalidade Maio", valor: 38000, data: "22/05, 11:20", status: "aliberar", liberaEm: "21/06" },
  { id: "e11", tipo: "entrada", origem: "PIX", desc: "Maria Silva · Material didático", valor: 12000, data: "20/05, 14:10", status: "disponivel" },
  { id: "e12", tipo: "saida", origem: "Saque", desc: "Transferência para conta ****-5521", valor: 1000000, data: "01/05, 08:00", status: "concluido" },
];

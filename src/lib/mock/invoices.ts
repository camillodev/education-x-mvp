import type { Invoice, UpcomingDue } from "./types";

// Valores em centavos (Int) — regra de ouro do app (.claude/rules/backend.md).
export const INVOICES: Invoice[] = [
  { id: "cob_8842", resp: "Maria Silva", aluno: "João Silva", valor: 45000, venc: "07/06/2026", status: "avencer", forma: "PIX", desc: "Mensalidade Junho/2026" },
  { id: "cob_8831", resp: "Carlos Andrade", aluno: "Beatriz Andrade", valor: 45000, venc: "05/06/2026", status: "avencer", forma: "Boleto", desc: "Mensalidade Junho/2026" },
  { id: "cob_8790", resp: "Juliana Prado", aluno: "Heitor Prado", valor: 38000, venc: "28/05/2026", status: "vencida", forma: "Boleto", desc: "Mensalidade Maio/2026", atraso: 5 },
  { id: "cob_8765", resp: "Antônio Reis", aluno: "Sofia Reis", valor: 60000, venc: "20/05/2026", status: "vencida", forma: "PIX", desc: "Mensalidade Maio/2026", atraso: 13 },
  { id: "cob_8744", resp: "Fernanda Dias", aluno: "Miguel Dias", valor: 38000, venc: "10/05/2026", status: "paga", forma: "PIX", desc: "Mensalidade Maio/2026", pagoEm: "08/05/2026" },
  { id: "cob_8730", resp: "Rodrigo Nunes", aluno: "Helena Nunes", valor: 60000, venc: "10/05/2026", status: "paga", forma: "Boleto", desc: "Mensalidade Maio/2026", pagoEm: "09/05/2026" },
  { id: "cob_8722", resp: "Patrícia Lopes", aluno: "Théo Lopes", valor: 38000, venc: "10/05/2026", status: "paga", forma: "PIX", desc: "Mensalidade Maio/2026", pagoEm: "10/05/2026" },
  { id: "cob_8701", resp: "Marcos Vieira", aluno: "Clara Vieira", valor: 45000, venc: "10/05/2026", status: "contestacao", forma: "Boleto", desc: "Mensalidade Maio/2026" },
];

// Tabela "Próximos vencimentos" do Dashboard — shape com múltiplos alunos por
// responsável (substitui o PROX_VENC de data.js, que não é lido em lugar
// nenhum do protótipo original).
export const UPCOMING_DUES: UpcomingDue[] = [
  { resp: "Carlos Andrade", alunos: ["Beatriz", "Lucas"], venc: "05/06", valor: 90000, forma: "Boleto" },
  { resp: "Patrícia Lopes", alunos: ["Théo"], venc: "05/06", valor: 38000, forma: "PIX" },
  { resp: "Maria Silva", alunos: ["João", "Helena", "Pedro"], venc: "07/06", valor: 135000, forma: "PIX" },
  { resp: "Rodrigo Nunes", alunos: ["Helena"], venc: "08/06", valor: 60000, forma: "Boleto" },
  { resp: "Fernanda Dias", alunos: ["Miguel", "Laura"], venc: "10/06", valor: 76000, forma: "PIX" },
  { resp: "Juliana Castro", alunos: ["Sofia", "Enzo", "Valentina", "Heitor", "Alice"], venc: "10/06", valor: 210000, forma: "Boleto" },
  { resp: "Bruno Ferreira", alunos: ["Davi"], venc: "12/06", valor: 45000, forma: "PIX" },
  { resp: "Aline Rocha", alunos: ["Manuela", "Bernardo"], venc: "12/06", valor: 82000, forma: "Cartão" },
  { resp: "Gustavo Pinto", alunos: ["Arthur"], venc: "13/06", valor: 38000, forma: "Boleto" },
  { resp: "Camila Souza", alunos: ["Cecília", "Gael", "Maria"], venc: "15/06", valor: 129000, forma: "PIX" },
  { resp: "Diego Martins", alunos: ["Antônio"], venc: "15/06", valor: 45000, forma: "Cartão" },
  { resp: "Renata Lima", alunos: ["Isabela", "Lorenzo"], venc: "18/06", valor: 76000, forma: "PIX" },
  { resp: "Felipe Gomes", alunos: ["Benício"], venc: "20/06", valor: 38000, forma: "Boleto" },
  { resp: "Tânia Barros", alunos: ["Maitê", "Noah", "Liz", "Caio"], venc: "22/06", valor: 168000, forma: "Boleto" },
];

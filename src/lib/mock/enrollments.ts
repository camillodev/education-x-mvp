import type { Enrollment } from "./types";

// Valores em centavos (Int) — regra de ouro do app (.claude/rules/backend.md).
export const ENROLLMENTS: Enrollment[] = [
  // ── Pendentes de aprovação ──
  { id: "m1", aluno: "João Silva", pagante: "Maria Silva", selfPayer: false, cpf: "123.456.789-00", email: "maria.silva@email.com", tel: "(31) 98765-4321",
    nascimento: "14/03/2015", materias: ["matematica", "portugues"], plano: "Mensal", valor: 45000, status: "pendente", aceiteEm: "02/06/2026 14:32" },
  { id: "m2", aluno: "Laura Campos", pagante: "Bruno Campos", selfPayer: false, cpf: "987.654.321-00", email: "bruno.campos@email.com", tel: "(31) 99812-3344",
    nascimento: "02/08/2014", materias: ["ingles"], plano: "Trimestral", valor: 114000, status: "pendente", aceiteEm: "02/06/2026 11:08" },
  { id: "m3", aluno: "Pedro Rocha", pagante: "Aline Rocha", selfPayer: false, cpf: "456.123.789-00", email: "aline.rocha@email.com", tel: "(31) 99440-1122",
    nascimento: "21/11/2016", materias: ["matematica"], plano: "Mensal", valor: 38000, status: "pendente", aceiteEm: "01/06/2026 17:45" },
  // ── Ativas (matrícula aprovada, cobrança rodando) ──
  { id: "a1", aluno: "Beatriz Andrade", pagante: "Carlos Andrade", selfPayer: false, cpf: "222.333.444-00", email: "carlos.andrade@email.com", tel: "(31) 98800-1010",
    nascimento: "09/02/2014", materias: ["matematica"], plano: "Mensal", valor: 45000, status: "ativa", desde: "03/2025" },
  { id: "a2", aluno: "Théo Lopes", pagante: "Patrícia Lopes", selfPayer: false, cpf: "333.444.555-00", email: "patricia.lopes@email.com", tel: "(31) 99700-2020",
    nascimento: "17/06/2016", materias: ["portugues"], plano: "Mensal", valor: 38000, status: "ativa", desde: "08/2024" },
  { id: "a3", aluno: "Helena Nunes", pagante: "Rodrigo Nunes", selfPayer: false, cpf: "444.555.666-00", email: "rodrigo.nunes@email.com", tel: "(31) 98600-3030",
    nascimento: "30/11/2013", materias: ["matematica", "ingles"], plano: "Semestral", valor: 243000, status: "ativa", desde: "02/2025" },
  // ── Aluna adulta: ela mesma é a pagante ──
  { id: "a4", aluno: "Renata Alves", pagante: "Renata Alves", selfPayer: true, cpf: "555.666.777-00", email: "renata.alves@email.com", tel: "(31) 99500-4040",
    nascimento: "12/09/2001", materias: ["ingles"], plano: "Trimestral", valor: 128100, status: "ativa", desde: "01/2026" },
  { id: "a5", aluno: "Miguel Dias", pagante: "Fernanda Dias", selfPayer: false, cpf: "666.777.888-00", email: "fernanda.dias@email.com", tel: "(31) 98400-5050",
    nascimento: "05/05/2015", materias: ["matematica"], plano: "Mensal", valor: 38000, status: "ativa", desde: "05/2025" },
  // ── Canceladas (matrícula encerrada) ──
  { id: "x1", aluno: "Gabriel Moura", pagante: "Sílvia Moura", selfPayer: false, cpf: "777.888.999-00", email: "silvia.moura@email.com", tel: "(31) 98300-6060",
    nascimento: "19/07/2014", materias: ["portugues"], plano: "Mensal", valor: 38000, status: "cancelada", desde: "03/2024", canceladaEm: "04/2026", motivo: "Mudança de cidade" },
  { id: "x2", aluno: "Isabela Rocha", pagante: "Marcelo Rocha", selfPayer: false, cpf: "888.999.000-00", email: "marcelo.rocha@email.com", tel: "(31) 98200-7070",
    nascimento: "23/01/2016", materias: ["matematica", "ingles"], plano: "Trimestral", valor: 114000, status: "cancelada", desde: "08/2024", canceladaEm: "05/2026", motivo: "A pedido do responsável" },
];

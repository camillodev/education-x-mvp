import type { CsvImportRow } from "./types";

export const VALID_PLANS = ["Mensal", "Trimestral", "Semestral", "Anual"] as const;

export const CSV_IMPORT_ROWS: CsvImportRow[] = [
  { aluno: "Ana Beatriz Costa", pagante: "Sérgio Costa", cpf: "111.222.333-44", plano: "Mensal", ok: true },
  { aluno: "Lucas Ferreira", pagante: "Marta Ferreira", cpf: "222.333.444-55", plano: "Trimestral", ok: true },
  { aluno: "Gabriela Pinto", pagante: "", cpf: "", plano: "Mensal", ok: false, erro: "Pagante e CPF ausentes" },
  { aluno: "Rafael Souza", pagante: "Hélio Souza", cpf: "333.444.555-66", plano: "Mensal", ok: true },
  { aluno: "Mariana Lima", pagante: "Paulo Lima", cpf: "444.555.666", plano: "Mensal", ok: false, erro: "CPF inválido" },
  { aluno: "Enzo Martins", pagante: "Cláudia Martins", cpf: "555.666.777-88", plano: "Anual", ok: true },
  { aluno: "Sofia Ramos", pagante: "Diego Ramos", cpf: "666.777.888-99", plano: "Bimestral", ok: false, erro: 'Plano "Bimestral" não existe' },
];

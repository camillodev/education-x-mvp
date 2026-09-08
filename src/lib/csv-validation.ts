import type { CsvImportRow } from "@/lib/mock/types";

export const CPF_RE = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

/**
 * Revalida uma linha de importação CSV. Pura — sem I/O, testável.
 * Retorna a mensagem de erro, ou null se a linha está válida.
 */
export function validateRow(row: CsvImportRow, validPlans: readonly string[]): string | null {
  if (!row.pagante.trim()) return "Pagante ausente";
  if (!CPF_RE.test(row.cpf.trim())) return "CPF inválido";
  if (!validPlans.includes(row.plano.trim())) return `Plano "${row.plano}" não existe`;
  return null;
}

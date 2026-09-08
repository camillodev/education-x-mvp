import type { DunningRecord } from "./types";

// Negativação / inadimplentes — decisão do orientador, caso a caso.
// Status: emaviso (dentro do prazo legal) · elegivel (aguardando decisão) ·
// negativado · regularizado. Valores em centavos.
export const DUNNING_RECORDS: DunningRecord[] = [
  { id: "neg_1", resp: "Antônio Reis", aluno: "Sofia Reis", cpf: "321.654.987-00", valor: 60000, valorAtualizado: 64200, atraso: 13, status: "elegivel",
    venc: "20/05/2026", avisoEm: "27/05/2026", elegivelEm: "01/06/2026" },
  { id: "neg_5", resp: "Marcos Vieira", aluno: "Clara Vieira", cpf: "258.147.963-00", valor: 45000, valorAtualizado: 47250, atraso: 18, status: "elegivel",
    venc: "15/05/2026", avisoEm: "22/05/2026", elegivelEm: "01/06/2026" },
  { id: "neg_2", resp: "Juliana Prado", aluno: "Heitor Prado", cpf: "654.987.321-00", valor: 38000, valorAtualizado: 39140, atraso: 5, status: "emaviso",
    venc: "28/05/2026", avisoEm: "30/05/2026", prazoFim: "09/06/2026" },
  { id: "neg_3", resp: "Eduardo Matos", aluno: "Lívia Matos", cpf: "789.321.456-00", valor: 45000, valorAtualizado: 48900, atraso: 38, status: "negativado",
    venc: "25/04/2026", avisoEm: "02/05/2026", elegivelEm: "07/05/2026", negativadoEm: "09/05/2026" },
  { id: "neg_4", resp: "Sandra Melo", aluno: "Gabriel Melo", cpf: "147.258.369-00", valor: 35000, valorAtualizado: 38450, atraso: 45, status: "negativado",
    venc: "18/04/2026", avisoEm: "25/04/2026", elegivelEm: "30/04/2026", negativadoEm: "02/05/2026" },
];

import type { SchoolSettings } from "./types";

// Configuração da escola (aba "Configurações"), consolidada a partir dos
// blocos read-only hardcoded dentro de Settings/FlowA no protótipo original
// — não existia como entidade separada em data.js.
export const SCHOOL_SETTINGS: SchoolSettings = {
  dadosEscola: {
    razaoSocial: "Kumon Camargos",
    cnpj: "12.345.678/0001-90",
    endereco: "Av. Tito Fulgêncio, 420",
    cidade: "Belo Horizonte",
    uf: "MG",
    telefone: "(31) 3333-4444",
    email: "contato@kumoncamargos.com.br",
  },
  contaRepasse: {
    banco: "Banco Inter",
    agencia: "0001",
    conta: "****-5521",
    titular: "Kumon Camargos LTDA",
  },
  regrasCobranca: {
    vencimento: 10,
    fechamento: 25,
    multa: 2,
    juros: 1,
    exigeContratoAssinado: false,
  },
  cartaoAssinatura: {
    ultimosDigitos: "8842",
  },
};

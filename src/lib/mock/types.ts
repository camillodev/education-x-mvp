/**
 * Tipos de domínio para os dados mockados do frontend (porte do protótipo
 * Claude Design). Valores em centavos (Int), nunca Float — mesma regra do
 * app real (ver .claude/rules/backend.md).
 */

export type InvoiceStatus = "avencer" | "vencida" | "paga" | "contestacao";
export type EnrollmentStatus = "pendente" | "ativa" | "cancelada";
export type DunningStatus = "emaviso" | "elegivel" | "negativado" | "regularizado";
export type SchoolStatus = "ativa" | "suspensa";
export type LedgerEntryStatus = "disponivel" | "aliberar" | "concluido";
export type PlatformInvoiceStatus = "aberto" | "paga";

export type PaymentMethod = "PIX" | "Boleto" | "Cartão";
export type LedgerEntryType = "entrada" | "saida";
export type LedgerEntryOrigin = "PIX" | "Boleto" | "Cartão" | "Saque" | "Antecipação";

export type SubjectId = "matematica" | "portugues" | "ingles" | "japones";

export interface Subject {
  id: SubjectId;
  label: string;
  colorToken: string;
}

export interface School {
  id: string;
  nome: string;
  franquia: string;
  cnpj: string;
  status: SchoolStatus;
  cobrancas: number;
  inadimplencia: number;
}

export interface Student {
  nome: string;
  nascimento: string;
  materias: SubjectId[];
}

export interface Enrollment {
  id: string;
  aluno: string;
  pagante: string;
  selfPayer: boolean;
  cpf: string;
  email: string;
  tel: string;
  nascimento: string;
  materias: SubjectId[];
  plano: string;
  valor: number;
  status: EnrollmentStatus;
  recebido?: boolean;
  aceiteEm?: string;
  desde?: string;
  canceladaEm?: string;
  motivo?: string;
}

export interface Invoice {
  id: string;
  resp: string;
  aluno: string;
  valor: number;
  venc: string;
  status: InvoiceStatus;
  forma: PaymentMethod;
  desc: string;
  atraso?: number;
  pagoEm?: string;
}

export interface UpcomingDue {
  resp: string;
  alunos: string[];
  venc: string;
  valor: number;
  forma: PaymentMethod;
}

export interface DunningRecord {
  id: string;
  resp: string;
  aluno: string;
  cpf: string;
  valor: number;
  valorAtualizado: number;
  atraso: number;
  status: DunningStatus;
  venc: string;
  avisoEm: string;
  elegivelEm?: string;
  prazoFim?: string;
  negativadoEm?: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface EnrollmentPlan {
  id: string;
  nome: string;
  parcela: number;
  meses: number;
  total: number;
  desc: string;
  badge?: string;
}

export interface SchoolBalance {
  disponivel: number;
  aLiberar: number;
  pixRecebido: number;
  cartaoPendente: number;
}

export interface Receivable {
  id: string;
  origem: string;
  desc: string;
  bruto: number;
  liberaEm: string;
  dias: number;
}

export interface LedgerEntry {
  id: string;
  tipo: LedgerEntryType;
  origem: LedgerEntryOrigin;
  desc: string;
  valor: number;
  data: string;
  status: LedgerEntryStatus;
  liberaEm?: string;
}

export interface PlatformPlan {
  id: string;
  nome: string;
  preco: number;
  unidade: string;
  /** Limite mensal de cobranças; null = sem limite (plano sob medida). */
  limite: number | null;
  desc: string;
}

export interface PlatformInvoiceItem {
  desc: string;
  detalhe?: string;
  val: number;
}

export interface PlatformInvoice {
  id: string;
  mes: string;
  venc?: string;
  pago?: boolean;
  status: PlatformInvoiceStatus;
  itens: PlatformInvoiceItem[];
}

export interface NotificationChannel {
  id: string;
  label: string;
  icon: string;
}

export interface SchoolSettings {
  dadosEscola: {
    razaoSocial: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    uf: string;
    telefone: string;
    email: string;
  };
  contaRepasse: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
  };
  regrasCobranca: {
    vencimento: number;
    fechamento: number;
    multa: number;
    juros: number;
    exigeContratoAssinado: boolean;
  };
  cartaoAssinatura: {
    ultimosDigitos: string;
  };
}

export interface GuardianInvoice {
  id: string;
  desc: string;
  valor: number;
  valorAtualizado?: number;
  venc: string;
  status: InvoiceStatus;
  forma: PaymentMethod;
  atraso?: number;
  pagoEm?: string;
  /** Número da nota fiscal, quando emitida. */
  nf?: string;
}

export interface CsvImportRow {
  aluno: string;
  pagante: string;
  cpf: string;
  plano: string;
  ok: boolean;
  erro?: string;
}

// Asaas API uses REAIS (not centavos). Convert at service boundary.

export type AsaasEnv = "sandbox" | "production";
export type AsaasMode = "mock" | "live";

// Listas de valores como const (não só o type) para que consumidores como Zod (ex:
// src/app/api/webhook/route.ts) derivem o schema de validação daqui em vez de duplicar os
// literais manualmente — regra do projeto "Zod schema = fonte de tipos", aplicada ao inverso
// aqui porque este arquivo já é a fonte curada desses enums vindos da API Asaas.
export const ASAAS_BILLING_TYPES = ["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"] as const;
export type AsaasBillingType = (typeof ASAAS_BILLING_TYPES)[number];

export const ASAAS_PAYMENT_STATUSES = [
  "PENDING",
  "RECEIVED",
  "CONFIRMED",
  "OVERDUE",
  "REFUNDED",
  "RECEIVED_IN_CASH",
  "REFUND_REQUESTED",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
  "DUNNING_REQUESTED",
  "DUNNING_RECEIVED",
  "AWAITING_RISK_ANALYSIS",
] as const;
export type AsaasPaymentStatus = (typeof ASAAS_PAYMENT_STATUSES)[number];

export type AsaasNotificationEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DUEDATE_WARNING"
  | "SEND_LINHA_DIGITAVEL";

export type AsaasDunningStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type AsaasInvoiceStatus =
  | "SCHEDULED"
  | "AUTHORIZED"
  | "PROCESSING"
  | "ERROR"
  | "CANCELLED";
export type AsaasCompanyType =
  | "MEI"
  | "LIMITED"
  | "INDIVIDUAL"
  | "ASSOCIATION";

// --- Sub-account ---

export interface AsaasWebhookConfig {
  name: string;
  url: string;
  email?: string;
  sendType: "SEQUENTIALLY" | "NON_SEQUENTIALLY";
  interrupted: boolean;
  enabled: boolean;
  apiVersion: 3;
  authToken: string;
  events: AsaasNotificationEvent[];
}

export interface AsaasCreateSubAccountPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  companyType?: AsaasCompanyType;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  webhooks?: AsaasWebhookConfig[];
}

export interface AsaasSubAccountResponse {
  id: string;
  apiKey: string;
  walletId: string;
}

// --- Customer ---

export interface AsaasCreateCustomerPayload {
  name: string;
  email?: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  cpfCnpj: string;
  externalReference?: string;
}

// --- Payment ---

export interface AsaasFineConfig {
  value: number; // percentage, e.g. 2 = 2%
}

export interface AsaasInterestConfig {
  value: number; // monthly percentage, e.g. 1 = 1%
}

export interface AsaasDiscountConfig {
  value: number;
  dueDateLimitDays: number;
  type: "PERCENTAGE" | "FIXED";
}

export interface AsaasCreatePaymentPayload {
  customer: string;
  billingType: AsaasBillingType;
  value: number; // REAIS
  dueDate: string; // YYYY-MM-DD
  externalReference?: string;
  description?: string;
  fine?: AsaasFineConfig;
  interest?: AsaasInterestConfig;
  discount?: AsaasDiscountConfig;
}

export interface AsaasPayment {
  id: string;
  status: AsaasPaymentStatus;
  value: number; // REAIS
  netValue: number;
  billingType: AsaasBillingType;
  dueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  barCode?: string;
  nossoNumero?: string;
  externalReference?: string;
  description?: string;
}

export interface AsaasPaymentFilters {
  status?: AsaasPaymentStatus;
  billingType?: AsaasBillingType;
  dueDateFrom?: string;
  dueDateTo?: string;
  externalReference?: string;
  offset?: number;
  limit?: number;
}

// --- NFS-e ---

export interface AsaasCreateInvoicePayload {
  payment: string; // asaasPaymentId
}

export interface AsaasInvoice {
  id: string;
  status: AsaasInvoiceStatus;
  number?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  issuedAt?: string;
  errorDescription?: string;
}

// --- Dunning (Negativação) ---

export interface AsaasCreateDunningPayload {
  payment: string; // asaasPaymentId
  type: "CREDIT_BUREAU";
  description?: string;
}

export interface AsaasDunning {
  id: string;
  status: AsaasDunningStatus;
  dunningNumber?: number;
  requestDate: string;
  value: number;
  feeValue: number;
  netValue: number;
}

// --- Notifications ---

export interface AsaasNotificationSettings {
  enabled: boolean;
  emailEnabledForProvider?: boolean;
  emailEnabledForCustomer?: boolean;
  smsEnabledForCustomer?: boolean;
  whatsappEnabledForCustomer?: boolean;
  scheduleOffset?: number;
}

// --- Webhook event (received by our handler) ---

export interface AsaasWebhookPayload {
  // `id` do envelope (ex: "evt_..."), NÃO payment.id — é a chave de idempotência do evento
  // (Asaas usa entrega at-least-once; o mesmo `id` pode ser reenviado). Ver
  // docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks.
  id: string;
  event: string;
  dateCreated?: string;
  payment: {
    id: string;
    status: AsaasPaymentStatus;
    value: number;
    paymentDate?: string;
    clientPaymentDate?: string;
    externalReference?: string;
    // string solto (não AsaasBillingType) de propósito: nosso webhook handler não consome esse
    // campo, e a Asaas pode adicionar valores novos sem aviso — travar num enum estrito aqui
    // rejeitaria um pagamento real só por um billingType desconhecido que nunca é lido.
    billingType: string;
  };
}

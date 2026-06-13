// Asaas API uses REAIS (not centavos). Convert at service boundary.

export type AsaasEnv = "sandbox" | "production";
export type AsaasMode = "mock" | "live";

export type AsaasBillingType = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS";

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
  event: string;
  payment: {
    id: string;
    status: AsaasPaymentStatus;
    value: number;
    paymentDate?: string;
    clientPaymentDate?: string;
    externalReference?: string;
    billingType: AsaasBillingType;
  };
}

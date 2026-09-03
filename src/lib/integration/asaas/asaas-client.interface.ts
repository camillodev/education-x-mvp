import type {
  AsaasCreateCustomerPayload,
  AsaasCreateDunningPayload,
  AsaasCreateInvoicePayload,
  AsaasCreatePaymentPayload,
  AsaasCreateSubAccountPayload,
  AsaasCustomer,
  AsaasDunning,
  AsaasInvoice,
  AsaasNotificationEvent,
  AsaasNotificationSettings,
  AsaasPayment,
  AsaasPaymentFilters,
  AsaasPixQrCode,
  AsaasSubAccountResponse,
} from "./types";

export interface AsaasClient {
  // Sub-accounts (called with master API key)
  createSubAccount(
    payload: AsaasCreateSubAccountPayload,
  ): Promise<AsaasSubAccountResponse>;

  // Customers
  createCustomer(payload: AsaasCreateCustomerPayload): Promise<AsaasCustomer>;
  findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null>;

  // Payments
  createPayment(payload: AsaasCreatePaymentPayload): Promise<AsaasPayment>;
  getPayment(id: string): Promise<AsaasPayment>;
  cancelPayment(id: string): Promise<void>;
  listPayments(filters: AsaasPaymentFilters): Promise<AsaasPayment[]>;
  getPixQrCode(id: string): Promise<AsaasPixQrCode>;

  // NFS-e
  createInvoice(payload: AsaasCreateInvoicePayload): Promise<AsaasInvoice>;
  getInvoice(id: string): Promise<AsaasInvoice>;

  // Dunning (Negativação SPC/Serasa)
  createDunning(payload: AsaasCreateDunningPayload): Promise<AsaasDunning>;
  removeDunning(id: string): Promise<void>;
  getDunning(id: string): Promise<AsaasDunning>;

  // Notifications config
  updateNotificationSettings(
    event: AsaasNotificationEvent,
    settings: AsaasNotificationSettings,
  ): Promise<void>;
}

import type { AsaasClient } from "./asaas-client.interface";
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
  AsaasSubAccountResponse,
} from "./types";

let _counter = 0;
function uid(prefix: string): string {
  return `${prefix}_mock_${++_counter}`;
}

export class AsaasMockClient implements AsaasClient {
  // Exposed for test assertions
  readonly createdPayments: AsaasPayment[] = [];
  readonly createdCustomers: AsaasCustomer[] = [];
  readonly createdDunnings: AsaasDunning[] = [];
  readonly cancelledPaymentIds: string[] = [];
  readonly removedDunningIds: string[] = [];
  readonly notificationUpdates: Array<{
    event: AsaasNotificationEvent;
    settings: AsaasNotificationSettings;
  }> = [];

  async createSubAccount(
    payload: AsaasCreateSubAccountPayload,
  ): Promise<AsaasSubAccountResponse> {
    return {
      id: uid("acc"),
      apiKey: `$api_mock_${payload.cpfCnpj}`,
      walletId: uid("wallet"),
    };
  }

  async createCustomer(
    payload: AsaasCreateCustomerPayload,
  ): Promise<AsaasCustomer> {
    const customer: AsaasCustomer = {
      id: uid("cus"),
      name: payload.name,
      email: payload.email,
      cpfCnpj: payload.cpfCnpj,
      externalReference: payload.externalReference,
    };
    this.createdCustomers.push(customer);
    return customer;
  }

  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    return (
      this.createdCustomers.find((c) => c.cpfCnpj === cpfCnpj) ?? null
    );
  }

  async createPayment(
    payload: AsaasCreatePaymentPayload,
  ): Promise<AsaasPayment> {
    const payment: AsaasPayment = {
      id: uid("pay"),
      status: "PENDING",
      value: payload.value,
      netValue: payload.value,
      billingType: payload.billingType,
      dueDate: payload.dueDate,
      externalReference: payload.externalReference,
      description: payload.description,
      invoiceUrl: "https://sandbox.asaas.com/i/mock",
      bankSlipUrl: "https://sandbox.asaas.com/b/pdf/mock",
      barCode:
        "00190.00009 01014.051005 00000.000000 1 00000000000000",
    };
    this.createdPayments.push(payment);
    return payment;
  }

  async getPayment(id: string): Promise<AsaasPayment> {
    const found = this.createdPayments.find((p) => p.id === id);
    if (found) return found;
    return {
      id,
      status: "PENDING",
      value: 0,
      netValue: 0,
      billingType: "BOLETO",
      dueDate: "2099-01-01",
    };
  }

  async cancelPayment(id: string): Promise<void> {
    this.cancelledPaymentIds.push(id);
  }

  async listPayments(filters: AsaasPaymentFilters): Promise<AsaasPayment[]> {
    return this.createdPayments.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (
        filters.externalReference &&
        p.externalReference !== filters.externalReference
      )
        return false;
      return true;
    });
  }

  async createInvoice(
    payload: AsaasCreateInvoicePayload,
  ): Promise<AsaasInvoice> {
    return {
      id: uid("inv"),
      status: "SCHEDULED",
    };
  }

  async getInvoice(id: string): Promise<AsaasInvoice> {
    return {
      id,
      status: "AUTHORIZED",
      number: "NFS-001",
      pdfUrl: "https://sandbox.asaas.com/nfse/mock.pdf",
    };
  }

  async createDunning(
    payload: AsaasCreateDunningPayload,
  ): Promise<AsaasDunning> {
    const dunning: AsaasDunning = {
      id: uid("dun"),
      status: "PENDING",
      dunningNumber: this.createdDunnings.length + 1,
      requestDate: new Date().toISOString().slice(0, 10),
      value: 100,
      feeValue: 5,
      netValue: 95,
    };
    this.createdDunnings.push(dunning);
    return dunning;
  }

  async removeDunning(id: string): Promise<void> {
    this.removedDunningIds.push(id);
  }

  async getDunning(id: string): Promise<AsaasDunning> {
    return (
      this.createdDunnings.find((d) => d.id === id) ?? {
        id,
        status: "PENDING",
        requestDate: new Date().toISOString().slice(0, 10),
        value: 100,
        feeValue: 5,
        netValue: 95,
      }
    );
  }

  async updateNotificationSettings(
    event: AsaasNotificationEvent,
    settings: AsaasNotificationSettings,
  ): Promise<void> {
    this.notificationUpdates.push({ event, settings });
  }
}

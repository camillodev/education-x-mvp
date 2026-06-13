import type { AsaasClient } from "./asaas-client.interface";
import { classifyAsaasError } from "./errors";
import type {
  AsaasCreateCustomerPayload,
  AsaasCreateDunningPayload,
  AsaasCreateInvoicePayload,
  AsaasCreatePaymentPayload,
  AsaasCreateSubAccountPayload,
  AsaasCustomer,
  AsaasDunning,
  AsaasEnv,
  AsaasInvoice,
  AsaasNotificationEvent,
  AsaasNotificationSettings,
  AsaasPayment,
  AsaasPaymentFilters,
  AsaasSubAccountResponse,
} from "./types";

const BASE_URLS: Record<AsaasEnv, string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/v3",
};

export class AsaasLiveClient implements AsaasClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    env: AsaasEnv = "sandbox",
  ) {
    this.baseUrl = BASE_URLS[env];
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Asaas uses "access_token" header (not "Authorization: Bearer")
        access_token: this.apiKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw classifyAsaasError(res.status, data);
    return data as T;
  }

  private buildQuery(filters: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  async createSubAccount(
    payload: AsaasCreateSubAccountPayload,
  ): Promise<AsaasSubAccountResponse> {
    return this.request<AsaasSubAccountResponse>("POST", "/accounts", payload);
  }

  async createCustomer(
    payload: AsaasCreateCustomerPayload,
  ): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("POST", "/customers", payload);
  }

  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const res = await this.request<{ data: AsaasCustomer[] }>(
      "GET",
      `/customers${this.buildQuery({ cpfCnpj })}`,
    );
    return res.data[0] ?? null;
  }

  async createPayment(
    payload: AsaasCreatePaymentPayload,
  ): Promise<AsaasPayment> {
    return this.request<AsaasPayment>("POST", "/payments", payload);
  }

  async getPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>("GET", `/payments/${id}`);
  }

  async cancelPayment(id: string): Promise<void> {
    await this.request<void>("DELETE", `/payments/${id}`);
  }

  async listPayments(filters: AsaasPaymentFilters): Promise<AsaasPayment[]> {
    const res = await this.request<{ data: AsaasPayment[] }>(
      "GET",
      `/payments${this.buildQuery(filters as Record<string, unknown>)}`,
    );
    return res.data;
  }

  async createInvoice(
    payload: AsaasCreateInvoicePayload,
  ): Promise<AsaasInvoice> {
    return this.request<AsaasInvoice>("POST", "/invoices", payload);
  }

  async getInvoice(id: string): Promise<AsaasInvoice> {
    return this.request<AsaasInvoice>("GET", `/invoices/${id}`);
  }

  async createDunning(
    payload: AsaasCreateDunningPayload,
  ): Promise<AsaasDunning> {
    return this.request<AsaasDunning>("POST", "/paymentDunnings", payload);
  }

  async removeDunning(id: string): Promise<void> {
    await this.request<void>("DELETE", `/paymentDunnings/${id}`);
  }

  async getDunning(id: string): Promise<AsaasDunning> {
    return this.request<AsaasDunning>("GET", `/paymentDunnings/${id}`);
  }

  async updateNotificationSettings(
    event: AsaasNotificationEvent,
    settings: AsaasNotificationSettings,
  ): Promise<void> {
    await this.request<void>("PUT", `/notifications/${event}`, settings);
  }
}

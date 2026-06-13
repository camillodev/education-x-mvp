import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  AsaasAuthError,
  AsaasNotFoundError,
  AsaasRateLimitError,
  AsaasServerError,
  AsaasValidationError,
  classifyAsaasError,
} from "../errors";
import { AsaasLiveClient } from "../live-client";

function mockFetch(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    headers: new Headers(headers),
  });
}

describe("AsaasLiveClient", () => {
  const API_KEY = "test_api_key_123";
  let client: AsaasLiveClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new AsaasLiveClient(API_KEY, "sandbox");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Auth header ---

  test("sends access_token header on every request", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: [] }),
    });

    await client.listPayments({});
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["access_token"]).toBe(API_KEY);
  });

  test("uses sandbox base URL", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: [] }),
    });
    await client.listPayments({});
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("sandbox.asaas.com");
  });

  test("uses production base URL when env=production", async () => {
    const prodClient = new AsaasLiveClient(API_KEY, "production");
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: [] }),
    });
    await prodClient.listPayments({});
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api.asaas.com");
    expect(url).not.toContain("sandbox");
  });

  // --- createPayment ---

  test("createPayment sends value in REAIS and externalReference", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: "pay_1",
        status: "PENDING",
        value: 450.0,
        netValue: 440.0,
        billingType: "BOLETO",
        dueDate: "2026-07-10",
      }),
    });

    const payment = await client.createPayment({
      customer: "cus_1",
      billingType: "BOLETO",
      value: 450.0,
      dueDate: "2026-07-10",
      externalReference: "inv_abc",
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.value).toBe(450.0);
    expect(body.externalReference).toBe("inv_abc");
    expect(payment.id).toBe("pay_1");
  });

  // --- cancelPayment (204) ---

  test("cancelPayment sends DELETE and handles 204", async () => {
    fetchSpy.mockResolvedValue({ status: 204, ok: true, json: async () => null });
    await expect(client.cancelPayment("pay_1")).resolves.toBeUndefined();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(url).toContain("pay_1");
  });

  // --- Error mapping ---

  test("401 → AsaasAuthError", async () => {
    fetchSpy.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ message: "invalid_access_token" }),
    });
    await expect(
      client.createPayment({
        customer: "cus_1",
        billingType: "BOLETO",
        value: 100,
        dueDate: "2026-07-01",
      }),
    ).rejects.toBeInstanceOf(AsaasAuthError);
  });

  test("400 with errors[] → AsaasValidationError with parsed errors", async () => {
    fetchSpy.mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({
        errors: [{ code: "invalid_cpfCnpj", description: "CPF inválido" }],
      }),
    });
    const err = await client
      .createCustomer({ name: "X", cpfCnpj: "bad" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AsaasValidationError);
    expect((err as AsaasValidationError).errors).toHaveLength(1);
  });

  test("404 → AsaasNotFoundError", async () => {
    fetchSpy.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ message: "not found" }),
    });
    await expect(client.getPayment("missing")).rejects.toBeInstanceOf(
      AsaasNotFoundError,
    );
  });

  test("429 → AsaasRateLimitError", async () => {
    fetchSpy.mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({}),
    });
    await expect(client.listPayments({})).rejects.toBeInstanceOf(
      AsaasRateLimitError,
    );
  });

  test("500 → AsaasServerError", async () => {
    fetchSpy.mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({}),
    });
    await expect(
      client.createDunning({ payment: "p1", type: "CREDIT_BUREAU" }),
    ).rejects.toBeInstanceOf(AsaasServerError);
  });

  // --- findCustomerByCpfCnpj ---

  test("findCustomerByCpfCnpj returns null when data is empty", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: [] }),
    });
    const result = await client.findCustomerByCpfCnpj("12345678901");
    expect(result).toBeNull();
  });

  test("findCustomerByCpfCnpj returns first customer", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        data: [{ id: "cus_1", name: "Ana", cpfCnpj: "12345678901" }],
      }),
    });
    const result = await client.findCustomerByCpfCnpj("12345678901");
    expect(result?.id).toBe("cus_1");
  });

  test("findCustomerByCpfCnpj includes cpfCnpj as query param", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: [] }),
    });
    await client.findCustomerByCpfCnpj("99988877766");
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("cpfCnpj=99988877766");
  });

  // --- updateNotificationSettings ---

  test("updateNotificationSettings sends PUT to /notifications/{event}", async () => {
    fetchSpy.mockResolvedValue({ status: 204, ok: true, json: async () => null });
    await client.updateNotificationSettings("PAYMENT_OVERDUE", {
      enabled: true,
      whatsappEnabledForCustomer: true,
      scheduleOffset: 1,
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(url).toContain("notifications/PAYMENT_OVERDUE");
    const body = JSON.parse(init.body as string);
    expect(body.whatsappEnabledForCustomer).toBe(true);
  });

  // --- createInvoice / getInvoice ---

  test("createInvoice POSTs to /invoices with payment id", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ id: "inv_1", status: "SCHEDULED" }),
    });
    const inv = await client.createInvoice({ payment: "pay_1" });
    expect(inv.id).toBe("inv_1");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/invoices");
    expect(JSON.parse(init.body as string).payment).toBe("pay_1");
  });

  test("getInvoice GETs /invoices/{id}", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ id: "inv_2", status: "AUTHORIZED", pdfUrl: "https://x.com/nf.pdf" }),
    });
    const inv = await client.getInvoice("inv_2");
    expect(inv.status).toBe("AUTHORIZED");
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/invoices/inv_2");
  });

  // --- removeDunning ---

  test("removeDunning sends DELETE to /paymentDunnings/{id}", async () => {
    fetchSpy.mockResolvedValue({ status: 204, ok: true, json: async () => null });
    await expect(client.removeDunning("dun_1")).resolves.toBeUndefined();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(url).toContain("paymentDunnings/dun_1");
  });

  test("getDunning GETs /paymentDunnings/{id}", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ id: "dun_1", status: "CONFIRMED", requestDate: "2026-06-01", value: 200, feeValue: 10, netValue: 190 }),
    });
    const d = await client.getDunning("dun_1");
    expect(d.status).toBe("CONFIRMED");
  });

  // --- toUserMessage coverage ---

  test("AsaasRateLimitError.toUserMessage returns PT-BR message", () => {
    const err = classifyAsaasError(429);
    expect(err.toUserMessage()).toContain("Limite");
  });

  test("AsaasServerError.toUserMessage returns PT-BR message", () => {
    const err = classifyAsaasError(500);
    expect(err.toUserMessage()).toContain("indisponível");
  });

  test("AsaasNotFoundError.toUserMessage returns PT-BR message", () => {
    const err = classifyAsaasError(404);
    expect(err.toUserMessage()).toContain("encontrado");
  });

  // --- createSubAccount ---

  test("createSubAccount POSTs to /accounts with webhooks", async () => {
    fetchSpy.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: "acc_1",
        apiKey: "sub_key",
        walletId: "wallet_1",
      }),
    });

    const res = await client.createSubAccount({
      name: "Escola Teste",
      email: "x@x.com",
      cpfCnpj: "12345678000190",
      webhooks: [
        {
          name: "Payment",
          url: "https://app.com/webhooks/asaas",
          sendType: "SEQUENTIALLY",
          interrupted: false,
          enabled: true,
          apiVersion: 3,
          authToken: "secret",
          events: ["PAYMENT_RECEIVED"],
        },
      ],
    });

    expect(res.apiKey).toBe("sub_key");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/accounts");
    const body = JSON.parse(init.body as string);
    expect(body.webhooks).toHaveLength(1);
    expect(body.webhooks[0].events).toContain("PAYMENT_RECEIVED");
  });
});

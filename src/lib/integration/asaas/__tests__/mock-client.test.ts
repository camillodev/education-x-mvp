import { describe, expect, test, beforeEach } from "vitest";

import { AsaasMockClient } from "../mock-client";

describe("AsaasMockClient", () => {
  let client: AsaasMockClient;

  beforeEach(() => {
    client = new AsaasMockClient();
  });

  // --- Sub-account ---

  test("createSubAccount returns apiKey and walletId", async () => {
    const res = await client.createSubAccount({
      name: "Kumon Camargos",
      email: "financeiro@kumon.com",
      cpfCnpj: "12345678000190",
    });
    expect(res.apiKey).toBeTruthy();
    expect(res.walletId).toBeTruthy();
    expect(res.id).toBeTruthy();
  });

  test("createSubAccount includes cpfCnpj in apiKey for traceability", async () => {
    const res = await client.createSubAccount({
      name: "Escola",
      email: "x@x.com",
      cpfCnpj: "99999999000199",
    });
    expect(res.apiKey).toContain("99999999000199");
  });

  // --- Customer ---

  test("createCustomer persists and returns customer", async () => {
    const customer = await client.createCustomer({
      name: "Maria Silva",
      cpfCnpj: "12345678901",
      email: "maria@example.com",
    });
    expect(customer.id).toBeTruthy();
    expect(customer.name).toBe("Maria Silva");
    expect(client.createdCustomers).toHaveLength(1);
  });

  test("findCustomerByCpfCnpj returns null when not found", async () => {
    const result = await client.findCustomerByCpfCnpj("00000000000");
    expect(result).toBeNull();
  });

  test("findCustomerByCpfCnpj returns customer after createCustomer", async () => {
    await client.createCustomer({
      name: "João",
      cpfCnpj: "11122233344",
    });
    const found = await client.findCustomerByCpfCnpj("11122233344");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("João");
  });

  // --- Payment ---

  test("createPayment returns PENDING payment with correct value", async () => {
    const payment = await client.createPayment({
      customer: "cus_123",
      billingType: "BOLETO",
      value: 450.0,
      dueDate: "2026-07-10",
      externalReference: "inv_abc",
    });
    expect(payment.status).toBe("PENDING");
    expect(payment.value).toBe(450.0);
    expect(payment.billingType).toBe("BOLETO");
    expect(payment.externalReference).toBe("inv_abc");
    expect(payment.bankSlipUrl).toBeTruthy();
    expect(payment.barCode).toBeTruthy();
  });

  test("createPayment is recorded in createdPayments", async () => {
    await client.createPayment({
      customer: "cus_1",
      billingType: "BOLETO",
      value: 100,
      dueDate: "2026-07-01",
    });
    expect(client.createdPayments).toHaveLength(1);
  });

  test("getPayment returns created payment by id", async () => {
    const created = await client.createPayment({
      customer: "cus_1",
      billingType: "BOLETO",
      value: 200,
      dueDate: "2026-07-01",
    });
    const fetched = await client.getPayment(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.value).toBe(200);
  });

  test("getPayment returns stub for unknown id", async () => {
    const p = await client.getPayment("unknown_id");
    expect(p.id).toBe("unknown_id");
  });

  test("cancelPayment records the cancelled id", async () => {
    await client.cancelPayment("pay_xyz");
    expect(client.cancelledPaymentIds).toContain("pay_xyz");
  });

  test("cancelPayment does not throw", async () => {
    await expect(client.cancelPayment("any_id")).resolves.toBeUndefined();
  });

  test("listPayments filters by status", async () => {
    await client.createPayment({
      customer: "c1",
      billingType: "BOLETO",
      value: 100,
      dueDate: "2026-07-01",
    });
    const pending = await client.listPayments({ status: "PENDING" });
    expect(pending).toHaveLength(1);

    const received = await client.listPayments({ status: "RECEIVED" });
    expect(received).toHaveLength(0);
  });

  test("listPayments filters by externalReference", async () => {
    await client.createPayment({
      customer: "c1",
      billingType: "BOLETO",
      value: 100,
      dueDate: "2026-07-01",
      externalReference: "inv_1",
    });
    await client.createPayment({
      customer: "c2",
      billingType: "BOLETO",
      value: 200,
      dueDate: "2026-07-01",
      externalReference: "inv_2",
    });

    const result = await client.listPayments({ externalReference: "inv_1" });
    expect(result).toHaveLength(1);
    expect(result[0].externalReference).toBe("inv_1");
  });

  // --- NFS-e ---

  test("createInvoice returns SCHEDULED status", async () => {
    const inv = await client.createInvoice({ payment: "pay_1" });
    expect(inv.status).toBe("SCHEDULED");
    expect(inv.id).toBeTruthy();
  });

  test("getInvoice returns AUTHORIZED with pdf url", async () => {
    const inv = await client.getInvoice("inv_1");
    expect(inv.status).toBe("AUTHORIZED");
    expect(inv.pdfUrl).toBeTruthy();
  });

  // --- Dunning ---

  test("createDunning returns PENDING dunning", async () => {
    const d = await client.createDunning({
      payment: "pay_1",
      type: "CREDIT_BUREAU",
    });
    expect(d.status).toBe("PENDING");
    expect(d.feeValue).toBeGreaterThan(0);
    expect(client.createdDunnings).toHaveLength(1);
  });

  test("removeDunning records id", async () => {
    await client.removeDunning("dun_1");
    expect(client.removedDunningIds).toContain("dun_1");
  });

  test("getDunning returns created dunning by id", async () => {
    const created = await client.createDunning({
      payment: "pay_2",
      type: "CREDIT_BUREAU",
    });
    const fetched = await client.getDunning(created.id);
    expect(fetched.id).toBe(created.id);
  });

  test("getDunning returns stub for unknown id", async () => {
    const d = await client.getDunning("unknown_dun");
    expect(d.id).toBe("unknown_dun");
  });

  // --- Notifications ---

  test("updateNotificationSettings records the update", async () => {
    await client.updateNotificationSettings("PAYMENT_OVERDUE", {
      enabled: true,
      emailEnabledForCustomer: true,
      whatsappEnabledForCustomer: false,
    });
    expect(client.notificationUpdates).toHaveLength(1);
    expect(client.notificationUpdates[0].event).toBe("PAYMENT_OVERDUE");
    expect(client.notificationUpdates[0].settings.emailEnabledForCustomer).toBe(true);
  });

  test("updateNotificationSettings does not throw", async () => {
    await expect(
      client.updateNotificationSettings("PAYMENT_RECEIVED", { enabled: false }),
    ).resolves.toBeUndefined();
  });

  // --- Isolation ---

  test("each client instance has independent state", async () => {
    const other = new AsaasMockClient();
    await client.createPayment({
      customer: "c1",
      billingType: "BOLETO",
      value: 100,
      dueDate: "2026-07-01",
    });
    expect(other.createdPayments).toHaveLength(0);
  });
});

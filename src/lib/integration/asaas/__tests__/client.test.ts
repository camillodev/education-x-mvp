import { afterEach, describe, expect, test } from "vitest";

import { getAsaasClient, getMasterAsaasClient } from "../client";
import { AsaasLiveClient } from "../live-client";
import { AsaasMockClient } from "../mock-client";

describe("getAsaasClient factory", () => {
  afterEach(() => {
    delete process.env.ASAAS_MODE;
    delete process.env.ASAAS_ENV;
    delete process.env.ASAAS_MASTER_API_KEY;
  });

  test("returns MockClient when ASAAS_MODE is not set", () => {
    delete process.env.ASAAS_MODE;
    const client = getAsaasClient("any_key");
    expect(client).toBeInstanceOf(AsaasMockClient);
  });

  test("returns MockClient when ASAAS_MODE=mock", () => {
    process.env.ASAAS_MODE = "mock";
    const client = getAsaasClient("any_key");
    expect(client).toBeInstanceOf(AsaasMockClient);
  });

  test("returns LiveClient when ASAAS_MODE=live", () => {
    process.env.ASAAS_MODE = "live";
    const client = getAsaasClient("real_key");
    expect(client).toBeInstanceOf(AsaasLiveClient);
  });

  test("getMasterAsaasClient uses ASAAS_MASTER_API_KEY env var", () => {
    process.env.ASAAS_MASTER_API_KEY = "master_key_xyz";
    process.env.ASAAS_MODE = "mock";
    const client = getMasterAsaasClient();
    expect(client).toBeInstanceOf(AsaasMockClient);
  });

  test("getMasterAsaasClient falls back to empty string when key not set", () => {
    delete process.env.ASAAS_MASTER_API_KEY;
    process.env.ASAAS_MODE = "mock";
    expect(() => getMasterAsaasClient()).not.toThrow();
  });
});

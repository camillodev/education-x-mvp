import type { AsaasClient } from "./asaas-client.interface";
import { AsaasLiveClient } from "./live-client";
import { AsaasMockClient } from "./mock-client";
import type { AsaasEnv } from "./types";

export function getAsaasClient(apiKey: string): AsaasClient {
  const mode = process.env.ASAAS_MODE ?? "mock";
  const env = (process.env.ASAAS_ENV ?? "sandbox") as AsaasEnv;

  if (mode === "live") {
    return new AsaasLiveClient(apiKey, env);
  }
  return new AsaasMockClient();
}

export function getMasterAsaasClient(): AsaasClient {
  const masterKey = process.env.ASAAS_MASTER_API_KEY ?? "";
  return getAsaasClient(masterKey);
}

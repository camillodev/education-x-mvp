import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupAddressByPostalCode } from "@/lib/services/cep.service";

afterEach(() => vi.unstubAllGlobals());

describe("lookupAddressByPostalCode", () => {
  it("normalizes the CEP and maps the ViaCEP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cep: "01001-000",
          logradouro: "Praça da Sé",
          complemento: "lado ímpar",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "SP",
          erro: false,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupAddressByPostalCode("01001-000")).resolves.toEqual({
      postalCode: "01001-000",
      address: "Praça da Sé",
      complement: "lado ímpar",
      province: "Sé",
      city: "São Paulo",
      state: "SP",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01001000/json/",
      expect.any(Object),
    );
  });

  it("rejects malformed and unknown postal codes", async () => {
    await expect(lookupAddressByPostalCode("123")).rejects.toThrow(/CEP/);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ erro: true }), { status: 200 }),
      ),
    );
    await expect(lookupAddressByPostalCode("99999-999")).rejects.toThrow(
      /não encontrado/i,
    );
  });

  it("propagates provider/network failures as a user-safe service error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(lookupAddressByPostalCode("01001-000")).rejects.toThrow(
      /Não foi possível consultar o CEP/,
    );
  });
});

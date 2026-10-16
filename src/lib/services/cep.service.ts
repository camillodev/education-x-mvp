export interface PostalAddress {
  postalCode: string;
  address: string;
  complement: string;
  province: string;
  city: string;
  state: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export async function lookupAddressByPostalCode(
  postalCode: string,
): Promise<PostalAddress> {
  const digits = postalCode.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) throw new Error("Informe um CEP válido.");

  let response: Response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(
      "Não foi possível consultar o CEP. Tente novamente ou preencha o endereço manualmente.",
    );
  }

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP. Tente novamente.");
  }
  const result = (await response.json()) as ViaCepResponse;
  if (result.erro || !result.cep) throw new Error("CEP não encontrado.");

  return {
    postalCode: result.cep,
    address: result.logradouro ?? "",
    complement: result.complemento ?? "",
    province: result.bairro ?? "",
    city: result.localidade ?? "",
    state: result.uf ?? "",
  };
}

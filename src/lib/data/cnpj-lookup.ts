// Lookup público de CNPJ via BrasilAPI (sem API key). Best-effort:
// usado para autofill + validação de existência. Falha nunca bloqueia o cadastro.

export interface CnpjData {
  legalName: string // razão social
  tradeName: string // nome fantasia
  status: string // situação cadastral (ATIVA, BAIXADA, INAPTA...)
  cep: string
  address: string // logradouro
  number: string
  neighborhood: string
  city: string
  state: string // UF
}

export class CnpjNotFoundError extends Error {
  constructor() {
    super('CNPJ não encontrado na base da Receita')
    this.name = 'CnpjNotFoundError'
  }
}

export class CnpjLookupError extends Error {
  constructor(cause?: unknown) {
    super('Não foi possível consultar o CNPJ agora')
    this.name = 'CnpjLookupError'
    if (cause instanceof Error) this.cause = cause
  }
}

interface BrasilApiCnpj {
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  cep?: string | number
  logradouro?: string
  numero?: string
  bairro?: string
  municipio?: string
  uf?: string
}

/**
 * Busca os dados de um CNPJ (14 dígitos, só números).
 * Throws CnpjNotFoundError (404) ou CnpjLookupError (rede/5xx).
 * O caller decide como tratar (toast + console) — esta função não loga.
 */
export async function lookupCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjData> {
  const digits = cnpj.replace(/\D/g, '')
  if (!/^\d{14}$/.test(digits)) throw new CnpjNotFoundError()

  let res: Response
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { signal })
  } catch (err) {
    throw new CnpjLookupError(err)
  }

  if (res.status === 404) throw new CnpjNotFoundError()
  if (!res.ok) throw new CnpjLookupError()

  let data: BrasilApiCnpj
  try {
    data = await res.json()
  } catch (err) {
    throw new CnpjLookupError(err)
  }

  return {
    legalName: data.razao_social ?? '',
    tradeName: data.nome_fantasia ?? '',
    status: data.descricao_situacao_cadastral ?? '',
    cep: String(data.cep ?? '').replace(/\D/g, ''),
    address: data.logradouro ?? '',
    number: data.numero ?? '',
    neighborhood: data.bairro ?? '',
    city: data.municipio ?? '',
    state: data.uf ?? '',
  }
}

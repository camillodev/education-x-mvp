import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupCnpj, CnpjNotFoundError, CnpjLookupError } from '../../../src/lib/data/cnpj-lookup'

afterEach(() => vi.restoreAllMocks())

const VALID = '11222333000181'

describe('lookupCnpj', () => {
  it('mapeia os dados da BrasilAPI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          razao_social: 'Kumon Camargos LTDA',
          nome_fantasia: 'Kumon Camargos',
          descricao_situacao_cadastral: 'ATIVA',
          cep: '30130000',
          logradouro: 'Avenida Afonso Pena',
          numero: '1456',
          bairro: 'Centro',
          municipio: 'Belo Horizonte',
          uf: 'MG',
        }),
      })
    )

    const data = await lookupCnpj(VALID)
    expect(data.legalName).toBe('Kumon Camargos LTDA')
    expect(data.tradeName).toBe('Kumon Camargos')
    expect(data.status).toBe('ATIVA')
    expect(data.cep).toBe('30130000')
    expect(data.state).toBe('MG')
  })

  it('lança CnpjNotFoundError no 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }))
    await expect(lookupCnpj(VALID)).rejects.toThrow(CnpjNotFoundError)
  })

  it('lança CnpjLookupError em erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')))
    await expect(lookupCnpj(VALID)).rejects.toThrow(CnpjLookupError)
  })

  it('lança CnpjLookupError em 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }))
    await expect(lookupCnpj(VALID)).rejects.toThrow(CnpjLookupError)
  })

  it('rejeita CNPJ malformado sem chamar a rede', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(lookupCnpj('123')).rejects.toThrow(CnpjNotFoundError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

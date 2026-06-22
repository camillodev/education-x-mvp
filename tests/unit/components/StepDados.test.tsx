import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepDados } from '@/components/onboarding/StepDados'
import type { DadosState } from '@/hooks/use-onboarding'

// O StepDados é controlado: o pai detém o estado. Mockamos o toast e o
// lookup de CNPJ para isolar o comportamento de reveal/duplicar contato.
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const lookupCnpj = vi.fn()
vi.mock('@/lib/data/cnpj-lookup', () => ({
  lookupCnpj: (...args: unknown[]) => lookupCnpj(...args),
  CnpjNotFoundError: class extends Error {},
  CnpjLookupError: class extends Error {},
}))

const emptyDados: DadosState = {
  name: '',
  cnpj: '',
  legalName: '',
  tradeName: '',
  cnpjStatus: '',
  email: '',
  phone: '',
  cep: '',
  address: '',
  number: '',
  neighborhood: '',
  complement: '',
  city: '',
  state: '',
  isFranchise: false,
  franchiseParent: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
}

// Harness que propaga onChange de volta ao estado, como o hook real faz.
function Harness({ initial = emptyDados }: { initial?: Partial<DadosState> }) {
  const [dados, setDados] = useState<DadosState>({ ...emptyDados, ...initial })
  return (
    <StepDados
      dados={dados}
      onChange={(patch) => setDados((prev) => ({ ...prev, ...patch }))}
    />
  )
}

beforeEach(() => {
  lookupCnpj.mockReset()
})

describe('StepDados — CNPJ-first', () => {
  it('inicia escondendo os demais campos e oferece o escape manual', () => {
    render(<Harness />)
    // CNPJ visível; razão social ainda não.
    expect(screen.getByLabelText(/CNPJ/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Razão social/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/preencher manualmente/i)
    ).toBeInTheDocument()
  })

  it('o link manual revela os campos vazios para edição', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText(/preencher manualmente/i))
    const apelido = screen.getByLabelText(/Apelido/i) as HTMLInputElement
    expect(apelido).toBeInTheDocument()
    expect(apelido.value).toBe('')
    // Endereço e Responsável também aparecem.
    expect(screen.getByLabelText(/Logradouro/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome completo/i)).toBeInTheDocument()
  })

  it('inicia revelado ao editar um draft já preenchido', () => {
    render(<Harness initial={{ name: 'Kumon Camargos', legalName: 'Kumon LTDA' }} />)
    expect(screen.getByLabelText(/Razão social/i)).toBeInTheDocument()
    // Sem link manual, pois já está revelado.
    expect(screen.queryByText(/preencher manualmente/i)).not.toBeInTheDocument()
  })

  it('revela campos preenchidos após o lookup de CNPJ bem-sucedido', async () => {
    lookupCnpj.mockResolvedValueOnce({
      legalName: 'Kumon Camargos LTDA',
      tradeName: 'Kumon Camargos',
      status: 'ATIVA',
      cep: '30130000',
      address: 'Avenida Afonso Pena',
      number: '1456',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
    })
    render(<Harness />)
    // CNPJ válido (11.222.333/0001-81) dispara o lookup no useEffect.
    fireEvent.change(screen.getByLabelText(/CNPJ/i), {
      target: { value: '11222333000181' },
    })
    await waitFor(() => {
      const legal = screen.getByLabelText(/Razão social/i) as HTMLInputElement
      expect(legal.value).toBe('Kumon Camargos LTDA')
    })
  })
})

describe('StepDados — duplicar contato da unidade', () => {
  it('copia email e celular da unidade para o responsável', () => {
    render(
      <Harness
        initial={{
          name: 'Escola X',
          email: 'contato@escola.com',
          phone: '31999990000',
        }}
      />
    )
    fireEvent.click(screen.getByText(/Usar mesmo contato da unidade/i))
    const respEmail = screen.getByLabelText(/^E-mail/i, { selector: '#responsibleEmail' }) as HTMLInputElement
    const respPhone = screen.getByLabelText(/Celular/i, { selector: '#responsiblePhone' }) as HTMLInputElement
    expect(respEmail.value).toBe('contato@escola.com')
    expect(respPhone.value).toBe('(31) 99999-0000')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle } from '@/components/ui/toggle'
import { Segmented } from '@/components/ui/segmented'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

describe('Toggle', () => {
  it('reflects checked state via aria-checked', () => {
    render(<Toggle checked={true} onChange={() => {}} aria-label="t" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with the toggled value on click', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} aria-label="t" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} disabled aria-label="t" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Checkbox', () => {
  it('reflects checked state via aria-checked', () => {
    render(<Checkbox checked={true} onChange={() => {}} aria-label="c" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with the toggled value on click', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} aria-label="c" />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} disabled aria-label="c" />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Segmented', () => {
  const options = [
    { value: 'a' as const, label: 'Opção A' },
    { value: 'b' as const, label: 'Opção B' },
  ]

  it('marks the active option as checked', () => {
    render(<Segmented options={options} value="a" onChange={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the selected value', () => {
    const onChange = vi.fn()
    render(<Segmented options={options} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByText('Opção B'))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Badge', () => {
  it('renders content and a dot when requested', () => {
    const { container } = render(<Badge variant="success" dot>Ativa</Badge>)
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(container.querySelector('.bg-current')).toBeTruthy()
  })
})

describe('Avatar', () => {
  it('derives initials from the first two words', () => {
    render(<Avatar name="Kumon Camargos" />)
    expect(screen.getByText('KC')).toBeInTheDocument()
  })

  it('falls back to two letters for a single word', () => {
    render(<Avatar name="Wizard" />)
    expect(screen.getByText('WI')).toBeInTheDocument()
  })
})

describe('Field', () => {
  it('shows error over hint', () => {
    render(
      <Field label="CNPJ" hint="ajuda" error="inválido" required>
        <input />
      </Field>
    )
    expect(screen.getByText('inválido')).toBeInTheDocument()
    expect(screen.queryByText('ajuda')).not.toBeInTheDocument()
  })
})

describe('Input', () => {
  it('renders a plain input without icon', () => {
    render(<Input placeholder="plain" />)
    expect(screen.getByPlaceholderText('plain').tagName).toBe('INPUT')
  })

  it('renders leading icon and trailing node when provided', () => {
    render(
      <Input
        placeholder="rich"
        leadingIcon={<span data-testid="lead" />}
        trailing={<span data-testid="trail" />}
      />
    )
    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('trail')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('rich')).toBeInTheDocument()
  })
})

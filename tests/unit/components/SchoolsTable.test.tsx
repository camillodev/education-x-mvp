import { render, screen } from '@testing-library/react'
import { SchoolsTable } from '@/components/admin/SchoolsTable'
import type { SchoolListItem } from '@/hooks/use-schools'

const schools: SchoolListItem[] = [{
  id: 'abc', name: 'Kumon Camargos', cnpj: '11222333000190', city: 'BH', state: 'MG',
  status: 'ACTIVE', createdAt: new Date(), subjectCount: 2, franchiseParent: 'Kumon',
}]

it('renderiza nome, franquia, cnpj mascarado, status e link Abrir', () => {
  render(<SchoolsTable schools={schools} />)
  expect(screen.getByText('Kumon Camargos')).toBeInTheDocument()
  expect(screen.getByText('Kumon')).toBeInTheDocument()
  // CNPJ na listagem é mascarado como "•••• <últimos 5 dígitos>" (privacidade, igual protótipo).
  expect(screen.getByText('•••• 00190')).toBeInTheDocument()
  expect(screen.getByText(/ativa/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute('href', '/escolas/abc')
})

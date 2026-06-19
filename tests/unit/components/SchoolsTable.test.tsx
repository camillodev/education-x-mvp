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
  expect(screen.getByText('11.222.333/0001-90')).toBeInTheDocument()
  expect(screen.getByText(/ativa/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute('href', '/escolas/abc')
})

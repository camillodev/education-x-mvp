import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

it('renderiza header e células', () => {
  render(
    <Table>
      <TableHeader><TableRow><TableHead>Escola</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell>Kumon Camargos</TableCell></TableRow></TableBody>
    </Table>
  )
  expect(screen.getByText('Escola')).toBeInTheDocument()
  expect(screen.getByText('Kumon Camargos')).toBeInTheDocument()
  expect(screen.getByRole('table')).toBeInTheDocument()
})

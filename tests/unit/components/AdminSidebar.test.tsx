import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/escolas' }))

it('mostra logo e item Escolas', () => {
  render(<AdminSidebar />)
  expect(screen.getByText('EducationX')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /escolas/i })).toHaveAttribute('href', '/escolas')
})

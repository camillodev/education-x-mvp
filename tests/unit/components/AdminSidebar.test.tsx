import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/escolas' }))

// ProfileFooter (no rodapé da sidebar) usa hooks do Clerk — mockados aqui
// porque este teste cobre a navegação, não o card de perfil.
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isLoaded: true,
    user: { firstName: 'Fran', lastName: 'Ribeiro', publicMetadata: { role: 'orientador' } },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

it('mostra logo e item Escolas', () => {
  render(<AdminSidebar />)
  expect(screen.getByText('EducationX')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /escolas/i })).toHaveAttribute('href', '/escolas')
})

it('mostra o card de perfil no rodapé (nome, role, botão Sair)', () => {
  render(<AdminSidebar />)
  expect(screen.getByText('Fran Ribeiro')).toBeInTheDocument()
  expect(screen.getByText('Orientadora')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument()
})

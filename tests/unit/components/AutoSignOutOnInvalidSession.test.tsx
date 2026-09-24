import { render } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
import { AutoSignOutOnInvalidSession } from '@/components/auth/AutoSignOutOnInvalidSession'

const mockUseAuth = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
  useClerk: () => ({ signOut: mockSignOut }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('dispara signOut uma única vez quando a sessão ainda está ativa', () => {
  mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

  const { rerender } = render(<AutoSignOutOnInvalidSession />)
  rerender(<AutoSignOutOnInvalidSession />)

  expect(mockSignOut).toHaveBeenCalledTimes(1)
})

it('não dispara signOut enquanto o Clerk ainda está carregando', () => {
  mockUseAuth.mockReturnValue({ isLoaded: false, isSignedIn: false })

  render(<AutoSignOutOnInvalidSession />)

  expect(mockSignOut).not.toHaveBeenCalled()
})

it('não dispara signOut quando não há sessão ativa (já deslogado)', () => {
  mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false })

  render(<AutoSignOutOnInvalidSession />)

  expect(mockSignOut).not.toHaveBeenCalled()
})

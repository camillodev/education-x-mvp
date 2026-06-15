import { ClerkProvider } from '@clerk/nextjs'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Without this, `next build` (with a dummy publishable key in CI) fails trying to
// statically export pages wrapped in ClerkProvider.
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>
}

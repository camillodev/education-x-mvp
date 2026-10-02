import { ClerkProvider } from '@clerk/nextjs'

// Auth pages render Clerk's <SignIn>/<SignUp> client widgets — they need the
// provider but must never be statically prerendered (dummy key in CI would fail).
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        {children}
      </main>
    </ClerkProvider>
  )
}

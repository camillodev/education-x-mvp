import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import { AdminShell } from '@/components/admin/AdminShell'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Without this, `next build` (with a dummy publishable key in CI) fails trying to
// statically export pages wrapped in ClerkProvider.
export const dynamic = 'force-dynamic'

// O grupo (app) é a área autenticada do admin IX — toda tela vive dentro do
// AdminShell (sidebar à esquerda): lista de escolas E cadastro. O ClerkProvider
// envolve tudo para os hooks de sessão (useUser/useClerk) funcionarem no client.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </ClerkProvider>
  )
}

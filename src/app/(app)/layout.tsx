import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import { AdminShell } from '@/components/admin/AdminShell'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Without this, `next build` (with a dummy publishable key in CI) fails trying to
// statically export pages wrapped in ClerkProvider.
export const dynamic = 'force-dynamic'

// Dev-only bypass: sem ClerkProvider, o Clerk não tenta carregar a key (que
// quebraria com chave dummy). Nunca ativo em produção.
const devBypass =
  process.env.NODE_ENV !== 'production' && process.env.DISABLE_CLERK === 'true'

// O grupo (app) é a área autenticada do admin IX — toda tela vive dentro do
// AdminShell (sidebar à esquerda): lista de escolas E cadastro.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  )
  if (devBypass) return content
  return <ClerkProvider>{content}</ClerkProvider>
}

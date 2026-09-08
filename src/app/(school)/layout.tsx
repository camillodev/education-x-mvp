import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Sem isso, `next build` (com publishable key dummy em CI) falha tentando
// exportar estaticamente páginas envolvidas em ClerkProvider.
export const dynamic = 'force-dynamic'

// O grupo (school) é a área autenticada do Orientador da escola: dashboard,
// matrículas, cobranças, configurações — chrome via SchoolShell (sidebar
// própria). Distinto de (app), que hoje hospeda o Admin IX (AdminShell).
export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ToastProvider>{children}</ToastProvider>
    </ClerkProvider>
  )
}

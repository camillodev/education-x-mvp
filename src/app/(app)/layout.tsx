import { redirect } from 'next/navigation'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import { AdminShell } from '@/components/admin/AdminShell'
import { getUnitContext, UnauthorizedError, ForbiddenError, type UnitContext } from '@/lib/auth/unit-context'
import { landingPathForRole, SIGN_IN_ROUTE, SIGN_IN_INVALID_SESSION_ROUTE } from '@/lib/auth/auth'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Without this, `next build` (with a dummy publishable key in CI) fails trying to
// statically export pages wrapped in ClerkProvider.
export const dynamic = 'force-dynamic'

// O grupo (app) é a área autenticada do admin IX — toda tela vive dentro do
// AdminShell (sidebar à esquerda): lista de escolas E cadastro. O ClerkProvider
// envolve tudo para os hooks de sessão (useUser/useClerk) funcionarem no client.
//
// Role guard (EDU-81, ADR-0009): anyone who isn't admin must never reach the
// admin-only screens below. A valid role in the wrong group redirects to its own
// area (never signs out — the session is still legitimate). An invalid role/unitId
// signs out with an alert, via /sign-in?error=invalid_session.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: UnitContext
  try {
    ctx = await getUnitContext()
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect(SIGN_IN_ROUTE)
    if (err instanceof ForbiddenError) redirect(SIGN_IN_INVALID_SESSION_ROUTE)
    throw err
  }

  if (ctx.role !== 'admin') redirect(landingPathForRole(ctx.role))

  return (
    <ClerkProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </ClerkProvider>
  )
}

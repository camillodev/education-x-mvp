import { redirect } from 'next/navigation'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/toast'
import { getUnitContext, UnauthorizedError, ForbiddenError, type UnitContext } from '@/lib/auth/unit-context'
import { landingPathForRole, SIGN_IN_ROUTE, SIGN_IN_INVALID_SESSION_ROUTE } from '@/lib/auth/auth'

// Authenticated routes depend on the Clerk session — never prerender statically.
// Sem isso, `next build` (com publishable key dummy em CI) falha tentando
// exportar estaticamente páginas envolvidas em ClerkProvider.
export const dynamic = 'force-dynamic'

// O grupo (school) é a área autenticada do Orientador da escola: dashboard,
// matrículas, cobranças, configurações — chrome via SchoolShell (sidebar
// própria). Distinto de (app), que hoje hospeda o Admin IX (AdminShell).
//
// Role guard (EDU-81, ADR-0009): anyone who isn't orientador must never reach
// the orientador-only screens below. A valid role in the wrong group redirects
// to its own area (never signs out — the session is still legitimate). An
// invalid role/unitId signs out with an alert, via /sign-in?error=invalid_session.
export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  let ctx: UnitContext
  try {
    ctx = await getUnitContext()
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect(SIGN_IN_ROUTE)
    if (err instanceof ForbiddenError) redirect(SIGN_IN_INVALID_SESSION_ROUTE)
    throw err
  }

  if (ctx.role !== 'orientador') redirect(landingPathForRole(ctx.role))

  return (
    <ClerkProvider>
      <ToastProvider>{children}</ToastProvider>
    </ClerkProvider>
  )
}

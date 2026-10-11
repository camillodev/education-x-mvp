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

// Admin-only area: a valid role in the wrong group redirects to its own area (never signs out);
// an invalid role/unitId signs out via /sign-in?error=invalid_session. See ADR-0009.
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

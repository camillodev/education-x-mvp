import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getUnitContext, UnauthorizedError, ForbiddenError, type UnitContext } from "@/lib/auth/unit-context";
import { landingPathForRole, SIGN_IN_INVALID_SESSION_ROUTE } from "@/lib/auth/auth";

// Post-login dispatcher (EDU-81, ADR-0009): a user with a valid session is
// redirected straight to their role's area. An anonymous visitor sees the
// landing below normally. A session with invalid role/unitId signs out with an alert.
export const dynamic = "force-dynamic";

export default async function Home() {
  let ctx: UnitContext | null = null;
  try {
    ctx = await getUnitContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      // anonymous visitor — falls through to the public landing below
    } else if (err instanceof ForbiddenError) {
      redirect(SIGN_IN_INVALID_SESSION_ROUTE);
    } else {
      throw err;
    }
  }

  if (ctx) redirect(landingPathForRole(ctx.role));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
        Education X
      </h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Gestão financeira escolar
      </p>
      <div className="flex gap-3">
        <Link href="/escolas" className={buttonVariants()}>
          Gestão de escolas
        </Link>
        <Link href="/onboarding" className={buttonVariants({ variant: "secondary" })}>
          Nova escola
        </Link>
      </div>
    </main>
  );
}

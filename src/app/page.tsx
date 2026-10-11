import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getUnitContext, UnauthorizedError, ForbiddenError, type UnitContext } from "@/lib/auth/unit-context";
import { landingPathForRole, SIGN_IN_INVALID_SESSION_ROUTE } from "@/lib/auth/auth";

// A signed-in user is sent to their role's area; anonymous visitors see the landing below.
// See ADR-0009.
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

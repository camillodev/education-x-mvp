import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
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
        <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
          Nova escola
        </Link>
      </div>
    </main>
  );
}

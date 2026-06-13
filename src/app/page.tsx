import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
        Education X
      </h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Gestão financeira escolar
      </p>
      <Button>Começar</Button>
    </main>
  );
}

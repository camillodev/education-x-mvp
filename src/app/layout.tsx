import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Education X",
  description: "Plataforma de gestão financeira escolar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SchoolSidebar } from "./SchoolSidebar";
import { Topbar, type TopbarProps } from "./Topbar";

export interface SchoolShellProps extends TopbarProps {
  children: ReactNode;
  maxWidth?: number;
}

/**
 * Chrome da área autenticada da escola (Orientador): sidebar + topbar.
 * Distinto de AdminShell (Admin IX — gestão de escolas na plataforma).
 *
 * Responsivo: a coluna de sidebar fica fixa a partir de `lg` (1024px); abaixo
 * disso vira drawer, aberto pelo botão de menu da Topbar (regra do projeto:
 * "Sidebar colapsa em drawer/hambúrguer no mobile/tablet" — .claude/rules/frontend.md).
 */
export function SchoolShell({
  children,
  maxWidth = 1180,
  ...topbarProps
}: SchoolShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      <div className="hidden border-r border-(--color-border) lg:block">
        <div className="sticky top-0 h-screen">
          <SchoolSidebar />
        </div>
      </div>

      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 border-r border-(--color-border) bg-(--color-bg) shadow-(--shadow-lg) duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Menu de navegação</DialogPrimitive.Title>
            <SchoolSidebar onNavigate={() => setMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar {...topbarProps} onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto px-4 pt-5 pb-[72px] sm:px-7 sm:pt-7" style={{ maxWidth }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

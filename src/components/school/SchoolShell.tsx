import type { ReactNode } from "react";
import { SchoolSidebar } from "./SchoolSidebar";
import { Topbar, type TopbarProps } from "./Topbar";

export interface SchoolShellProps extends TopbarProps {
  children: ReactNode;
  maxWidth?: number;
}

/**
 * Chrome da área autenticada da escola (Orientador): sidebar + topbar.
 * Distinto de AdminShell (Admin IX — gestão de escolas na plataforma).
 */
export function SchoolShell({
  children,
  maxWidth = 1180,
  ...topbarProps
}: SchoolShellProps) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <SchoolSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar {...topbarProps} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto px-7 pt-7 pb-[72px]" style={{ maxWidth }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

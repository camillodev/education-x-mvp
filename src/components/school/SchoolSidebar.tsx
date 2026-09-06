"use client";

import { Fragment } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserPlus, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileFooter } from "@/components/admin/ProfileFooter";

type NavItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  section?: boolean;
};

const NAV: NavItem[] = [
  { href: "/painel/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/matriculas", label: "Matrículas", icon: UserPlus },
  { href: "/painel/cobrancas", label: "Cobranças", icon: Receipt },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings, section: true },
];

export interface SchoolSidebarProps {
  /** Fecha o drawer mobile ao navegar. Sem efeito no desktop (sempre visível). */
  onNavigate?: () => void;
}

/**
 * Sidebar da área autenticada da escola (Orientador). Distinta de
 * AdminSidebar (Admin IX — gestão de escolas na plataforma).
 *
 * Conteúdo único, reusado tanto na coluna fixa do desktop quanto dentro do
 * drawer mobile (ver SchoolShell) — evita duas fontes de verdade do NAV.
 */
export function SchoolSidebar({ onNavigate }: SchoolSidebarProps = {}) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-[244px] shrink-0 flex-col bg-(--color-bg)">
      <div className="px-5 pt-5 pb-[18px]">
        <div className="inline-flex items-center gap-[9px]">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-(--color-primary) text-lg font-extrabold tracking-[-0.04em] text-white">
            X
          </span>
          <span className="text-xl font-extrabold tracking-[-0.03em] text-(--color-text)">
            Education<span className="text-(--color-primary)">X</span>
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-[3px] px-3 py-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Fragment key={item.href}>
              {item.section && <div className="mx-2 my-2.5 h-px bg-(--color-border-muted)" />}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-(--radius-md) px-3 py-[10px] text-[14.5px] font-medium transition-colors",
                  active
                    ? "bg-(--color-primary-soft) font-semibold text-(--color-primary-hover)"
                    : "text-(--color-text-muted) hover:bg-(--color-surface)"
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--color-primary) px-1.5 text-[11.5px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            </Fragment>
          );
        })}
      </nav>
      <div className="m-3 rounded-(--radius-md) bg-(--color-surface) p-3.5">
        <ProfileFooter />
      </div>
    </aside>
  );
}

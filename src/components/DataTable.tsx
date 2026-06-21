'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Button } from "./ui/button";
import { initials } from "./ui/avatar";

// ── Section heading ──────────────────────────────────────────────────────────

export interface SectionHeadProps {
  title: string;
  description?: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHead({ title, description, sub, action, className }: SectionHeadProps) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div>
        <h3 className="m-0 text-[17px] font-bold tracking-[-0.01em] text-(--color-text)">{title}</h3>
        {(description ?? sub) && (
          <p className="mt-[3px] text-[13px] text-(--color-text-subtle)">{description ?? sub}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Col definition ───────────────────────────────────────────────────────────

export interface Col {
  label: string;
  align?: "left" | "right" | "center";
  w?: number | string;
}

// ── Table primitives ─────────────────────────────────────────────────────────

export type TdProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
};

export function Td({ className, align, children, style, ...props }: TdProps) {
  return (
    <td
      className={cn("px-[18px] py-3.5 text-[14px] text-(--color-text)", className)}
      style={{ textAlign: align, ...style }}
      {...props}
    >
      {children}
    </td>
  );
}

export type TrHoverProps = React.HTMLAttributes<HTMLTableRowElement> & {
  onClick?: () => void;
};

export function TrHover({ className, onClick, children, ...props }: TrHoverProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "border-b border-(--color-border-muted) transition-colors duration-100",
        className
      )}
      style={{
        cursor: onClick ? "pointer" : "default",
        background: hovered && onClick ? "var(--color-surface)" : "transparent",
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

// ── Person cell ──────────────────────────────────────────────────────────────

export interface PersonProps {
  name: string;
  sub?: string;
  className?: string;
}

export function Person({ name, sub, className }: PersonProps) {
  return (
    <div className={cn("flex items-center gap-[11px]", className)}>
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-(--color-primary-soft) text-[12.5px] font-bold text-(--color-primary-hover)">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-(--color-text)">{name}</div>
        {sub && <div className="text-[12.5px] text-(--color-text-subtle)">{sub}</div>}
      </div>
    </div>
  );
}

// ── DataTable ────────────────────────────────────────────────────────────────

export interface DataTableProps {
  cols?: Col[];
  head?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ cols, head, children, className }: DataTableProps) {
  const thead = head ?? (
    cols?.map((c, i) => (
      <th
        key={i}
        className="border-b border-(--color-border) px-[18px] py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--color-text-subtle)"
        style={{ textAlign: c.align ?? "left", width: c.w }}
      >
        {c.label}
      </th>
    ))
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-(--color-surface)">{thead}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
  className?: string;
}

export function DataTablePagination({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
  className,
}: DataTablePaginationProps) {
  return (
    <div className={cn("flex items-center justify-between px-[18px] py-3", className)}>
      <Button variant="tertiary" size="sm" onClick={onPrev} disabled={page <= 1} aria-label="Página anterior" iconLeft="chevron-left">
        Anterior
      </Button>
      <span className="text-sm text-(--color-text-subtle)">
        {label ?? `Página ${page} de ${totalPages}`}
      </span>
      <Button variant="tertiary" size="sm" onClick={onNext} disabled={page >= totalPages} aria-label="Próxima página" iconRight="chevron-right">
        Próxima
      </Button>
    </div>
  );
}

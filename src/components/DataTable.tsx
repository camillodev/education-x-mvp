'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";

// ── Section heading ──────────────────────────────────────────────────────────

export interface SectionHeadProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHead({ title, description, action, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <h2 className="text-base font-semibold text-(--color-text)">{title}</h2>
        {description && (
          <p className="text-sm text-(--color-text-subtle)">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Table primitives ─────────────────────────────────────────────────────────

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function Td({ className, children, ...props }: TdProps) {
  return (
    <td
      className={cn("px-4 py-3 text-sm text-(--color-text)", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export interface TrHoverProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export function TrHover({ className, children, ...props }: TrHoverProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <tr
      className={cn(
        "border-b border-(--color-border-muted) transition-colors",
        hovered ? "bg-(--color-surface)" : "bg-white",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar name={name} size="sm" style={{ width: 34, height: 34 }} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-(--color-text)">{name}</p>
        {sub && <p className="truncate text-xs text-(--color-text-subtle)">{sub}</p>}
      </div>
    </div>
  );
}

// ── DataTable ────────────────────────────────────────────────────────────────

export interface DataTableProps {
  head: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ head, children, className }: DataTableProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-(--color-surface) text-left">
            {head}
          </tr>
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
    <div className={cn("flex items-center justify-between px-4 py-3", className)}>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Página anterior"
        iconLeft="chevron-left"
      >
        Anterior
      </Button>
      <span className="text-sm text-(--color-text-subtle)">
        {label ?? `Página ${page} de ${totalPages}`}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Próxima página"
        iconRight="chevron-right"
      >
        Próxima
      </Button>
    </div>
  );
}

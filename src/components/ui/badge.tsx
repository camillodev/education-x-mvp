import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]",
  warning: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]",
  danger: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]",
  info: "bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]",
  primary: "bg-(--color-primary-soft) text-(--color-primary-hover)",
  neutral: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: "sm" | "md";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "neutral", dot, size = "md", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-semibold leading-none whitespace-nowrap",
          size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-xs",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {dot && (
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

// ── Status map ───────────────────────────────────────────────────────────────

export const STATUS: Record<string, BadgeVariant> = {
  ativa: "success",
  ativo: "success",
  aprovado: "success",
  pago: "success",
  inadimplente: "danger",
  cancelado: "danger",
  bloqueado: "danger",
  inativo: "neutral",
  pendente: "warning",
  aguardando: "warning",
  trial: "info",
  gratuito: "info",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
}

export function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const key = status.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const variant: BadgeVariant = STATUS[key] ?? "neutral";
  return (
    <Badge variant={variant} dot {...props}>
      {children ?? status}
    </Badge>
  );
}

export { Badge };

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  color?: string;
  icon?: string;
  size?: "sm" | "md";
}

export function Chip({ className, active, color, icon, size = "md", children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] font-medium transition-colors",
        size === "sm" ? "px-2.5 py-0.5 text-[11.5px]" : "px-3 py-1 text-xs",
        active
          ? "border-(--color-primary) bg-(--color-primary-softer) text-(--color-primary)"
          : "border-(--color-border) bg-(--color-surface) text-(--color-text-subtle)",
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={12} />}
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

import * as React from "react";
import { Icon } from "./Icon";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  color?: string;
  icon?: string;
  size?: "sm" | "md";
}

export function Chip({ className, active, color, icon, size = "md", children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center gap-[7px] rounded-full border-[1.5px] font-semibold transition-all duration-150",
        size === "sm" ? "h-[34px] px-3 text-xs" : "h-10 px-4 text-[14.5px]",
        active
          ? "border-(--color-primary) bg-(--color-primary) text-white"
          : "border-(--color-border-input) bg-(--color-bg) text-(--color-text-muted) hover:bg-(--color-primary-softer) hover:border-(--color-primary)",
        className ?? "",
      ].join(" ")}
      {...props}
    >
      {color && <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: color }} />}
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name; initials are derived from the first two words. */
  name: string;
  size?: "sm" | "md" | "lg";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, name, size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] font-semibold",
          "bg-[var(--color-primary-softer)] text-[var(--color-primary)]",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {initials(name)}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, initials };

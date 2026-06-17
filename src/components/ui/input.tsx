import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error state (red border + ring) and sets aria-invalid. */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={ariaInvalid ?? error ?? undefined}
        className={cn(
          "w-full rounded-md border bg-transparent px-3 py-2 text-sm text-[var(--color-text)] transition-colors",
          "placeholder:text-[var(--color-text-subtle)]",
          "focus:outline-none focus:ring-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]"
            : "border-[var(--color-border-input)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

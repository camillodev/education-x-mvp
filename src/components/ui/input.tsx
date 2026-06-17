import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error state (red border + ring) and sets aria-invalid. */
  error?: boolean;
  /** Lucide icon rendered at the left of the input. */
  leadingIcon?: React.ReactNode;
  /** Node rendered at the right (e.g. a unit label or button). */
  trailing?: React.ReactNode;
}

const baseInput =
  "w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, error, leadingIcon, trailing, type = "text", "aria-invalid": ariaInvalid, ...props },
    ref
  ) => {
    const borderState = error
      ? "border-[var(--color-danger)] focus-within:border-[var(--color-danger)] focus-within:ring-[var(--color-danger)]"
      : "border-[var(--color-border-input)] focus-within:border-[var(--color-primary)] focus-within:ring-[var(--color-primary)]";

    // Plain input when there's no icon/trailing — keeps it light.
    if (!leadingIcon && !trailing) {
      return (
        <input
          type={type}
          ref={ref}
          aria-invalid={ariaInvalid ?? error ?? undefined}
          className={cn(
            "rounded-md border px-3 py-2 transition-colors focus:ring-1",
            baseInput,
            error
              ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]"
              : "border-[var(--color-border-input)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]",
            className
          )}
          {...props}
        />
      );
    }

    // Wrapper variant with leading icon and/or trailing node.
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-md border px-3.5 transition-colors focus-within:ring-1",
          "h-[46px]",
          borderState,
          className
        )}
      >
        {leadingIcon && (
          <span className="flex shrink-0 text-[var(--color-text-subtle)]" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          aria-invalid={ariaInvalid ?? error ?? undefined}
          className={cn(baseInput, "min-w-0 flex-1")}
          {...props}
        />
        {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

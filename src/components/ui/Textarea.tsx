import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Renders the error state (red border + ring) and sets aria-invalid. */
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={ariaInvalid ?? error ?? undefined}
        className={cn(
          "w-full rounded-md border px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
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
Textarea.displayName = "Textarea";

export { Textarea };

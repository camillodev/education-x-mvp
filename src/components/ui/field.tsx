import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label?: string;
  /** Error message; takes precedence over hint and renders in danger color. */
  error?: string;
  /** Helper text shown below the field when there's no error. */
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[13px] font-semibold text-[var(--color-text)]">
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-danger)]">
          <AlertCircle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-subtle)]">{hint}</span>
      ) : null}
    </div>
  );
}

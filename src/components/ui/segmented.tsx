import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Optional secondary line below the label. */
  description?: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn("grid gap-3", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      {...props}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={cn(
              "flex flex-col items-start rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1",
              active
                ? "border-[var(--color-primary)] bg-[var(--color-primary-softer)]"
                : "border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)]",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {opt.label}
            </span>
            {opt.description && (
              <span className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

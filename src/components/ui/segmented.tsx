import * as React from "react";
import { cn } from "@/lib/utils";

// ── Tab-style Segmented (filtros, navegação) ─────────────────────────────────

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  disabled,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("flex border-b border-(--color-border)", className)}
      {...props}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-1",
              size === "sm" ? "h-[26px] px-3 text-[11.5px]" : "h-[32px] px-4 text-sm",
              active
                ? "text-(--color-primary) after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-(--color-primary)"
                : "text-(--color-text-subtle) hover:text-(--color-text)",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  active
                    ? "bg-(--color-primary-softer) text-(--color-primary)"
                    : "bg-(--color-surface) text-(--color-text-subtle)"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Card-style SegmentedCard (seleção de plano, onboarding) ──────────────────

export interface SegmentedCardOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface SegmentedCardProps<T extends string> {
  options: SegmentedCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SegmentedCard<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  ...props
}: SegmentedCardProps<T>) {
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
              "flex flex-col items-start rounded-(--radius-md) border px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-1",
              active
                ? "border-(--color-primary) bg-(--color-primary-softer)"
                : "border-(--color-border) bg-(--color-bg) hover:bg-(--color-surface)",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <span className="text-sm font-semibold text-(--color-text)">{opt.label}</span>
            {opt.description && (
              <span className="mt-0.5 text-xs text-(--color-text-subtle)">{opt.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

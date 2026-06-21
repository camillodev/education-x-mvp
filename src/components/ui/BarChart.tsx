import * as React from "react";
import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface BarChartProps {
  data: BarDatum[];
  fmt?: (v: number) => string;
  maxHeight?: number;
  className?: string;
}

export function BarChart({ data, fmt = String, maxHeight = 120, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height: maxHeight + 24 }}>
      {data.map((d, i) => {
        const height = Math.max((d.value / max) * maxHeight, 4);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-(--color-text-subtle)">{fmt(d.value)}</span>
            <div
              className={cn(
                "w-full rounded-t-sm transition-all",
                d.highlight
                  ? "bg-(--color-primary)"
                  : "bg-(--color-primary-softer)"
              )}
              style={{ height }}
            />
            <span className="text-[10px] text-(--color-text-subtle) truncate max-w-full">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

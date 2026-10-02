import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";
import { Icon } from "./Icon";

export interface MetricProps {
  label: string;
  value: string | number;
  icon?: string;
  iconBg?: string;
  trend?: "up" | "down";
  trendValue?: string;
  className?: string;
}

export function Metric({ label, value, icon, iconBg, trend, trendValue, className }: MetricProps) {
  return (
    <Card className={cn("flex flex-col gap-3 p-4", className)}>
      {icon && (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={iconBg ? { background: iconBg } : undefined}
        >
          <Icon name={icon} size={18} className="text-(--color-primary)" />
        </span>
      )}
      <div>
        <p className="text-xs text-(--color-text-subtle)">{label}</p>
        <p className="text-[30px] font-bold leading-tight text-(--color-text)">{value}</p>
      </div>
      {(trend || trendValue) && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend === "up" ? "text-(--color-success)" : "text-(--color-danger)"
          )}
        >
          {trend === "up" && <TrendingUp size={14} />}
          {trend === "down" && <TrendingDown size={14} />}
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </Card>
  );
}

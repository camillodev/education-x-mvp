import * as React from "react";
import { initials } from "@/components/ui/avatar";

export interface PersonProps {
  name: string;
  sub?: React.ReactNode;
}

export function Person({ name, sub }: PersonProps) {
  return (
    <div className="flex items-center gap-[11px]">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-(--color-primary-soft) text-[12.5px] font-bold text-(--color-primary-hover)">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{name}</div>
        {sub && <div className="text-[12.5px] text-(--color-text-subtle)">{sub}</div>}
      </div>
    </div>
  );
}

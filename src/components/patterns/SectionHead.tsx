import * as React from "react";

export interface SectionHeadProps {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHead({ title, sub, action }: SectionHeadProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="m-0 text-[17px] font-bold tracking-[-0.01em]">{title}</h3>
        {sub && <p className="mt-[3px] text-[13px] text-(--color-text-subtle)">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

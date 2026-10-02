import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  active?: boolean;
}

export function Card({ className, interactive, active, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-(--radius-lg) border border-(--color-border) bg-white shadow-(--shadow-card)",
        interactive && "cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)",
        active && "border-2 border-(--color-primary)",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

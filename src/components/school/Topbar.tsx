"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TopbarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export function Topbar({ title, subtitle, actions, onBack }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-(--color-border) bg-(--color-bg) px-7">
      <div className="flex min-w-0 items-center gap-[14px]">
        {onBack && (
          <Button variant="secondary" size="icon" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={18} />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="m-0 truncate text-[21px] font-bold tracking-[-0.02em] text-(--color-text)">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 text-[13px] text-(--color-text-subtle)">{subtitle}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}

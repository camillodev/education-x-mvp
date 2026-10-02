"use client";

import { User, Building2 } from "lucide-react";

export type FeePayer = "responsavel" | "escola";

const OPTIONS = [
  {
    value: "responsavel" as const,
    title: "Responsável paga",
    desc: "Somada à cobrança do pai",
    Icon: User,
  },
  {
    value: "escola" as const,
    title: "Escola assume",
    desc: "Descontada do seu repasse",
    Icon: Building2,
  },
];

interface FeeChoiceProps {
  label: string;
  hint?: string;
  value: FeePayer;
  onChange: (value: FeePayer) => void;
}

/** Escolha de quem arca com uma taxa: responsável ou escola. */
export function FeeChoice({ label, hint, value, onChange }: FeeChoiceProps) {
  return (
    <div className="rounded-(--radius-md) border border-(--color-border) p-4">
      <div className="mb-3">
        <div className="text-[14.5px] font-semibold">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] text-(--color-text-subtle)">{hint}</div>}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {OPTIONS.map(({ value: v, title, desc, Icon }) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(v)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-(--radius-md) border-[1.5px] px-3.5 py-3 text-left ${
                on
                  ? "border-(--color-primary) bg-(--color-primary-softer)"
                  : "border-(--color-border-input) bg-(--color-bg)"
              }`}
            >
              <span
                className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  on ? "border-(--color-primary)" : "border-(--color-border-input)"
                }`}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-(--color-primary)" />}
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                  <Icon
                    size={14}
                    className={on ? "text-(--color-primary)" : "text-(--color-text-subtle)"}
                  />
                  {title}
                </div>
                <div className="mt-0.5 text-xs text-(--color-text-subtle)">{desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

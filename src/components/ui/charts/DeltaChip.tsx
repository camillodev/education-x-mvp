import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { GoodWhen } from "./types";

interface DeltaChipProps {
  text: string;
  /** Sinal da variação: 1 subiu, -1 caiu, 0 estável. */
  dir: number;
  /** Qual direção representa melhora — decide verde vs vermelho. */
  goodWhen: GoodWhen;
}

/** Pílula de variação entre dois pontos. Cor semântica, não literal. */
export function DeltaChip({ text, dir, goodWhen }: DeltaChipProps) {
  const zero = dir === 0;
  const good = zero ? null : goodWhen === "up" ? dir > 0 : dir < 0;

  const fg = zero
    ? "var(--color-text-subtle)"
    : good
      ? "var(--badge-success-fg)"
      : "var(--badge-danger-fg)";
  const bg = zero
    ? "var(--color-surface)"
    : good
      ? "var(--badge-success-bg)"
      : "var(--badge-danger-bg)";

  const Icon = zero ? Minus : dir > 0 ? ArrowUp : ArrowDown;

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-[5px] py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      <Icon size={9} />
      {text}
    </span>
  );
}

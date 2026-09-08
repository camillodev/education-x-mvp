import type { TipContent } from "./types";

/** Tooltip flutuante de um ponto do gráfico. Posicionado pelo pai. */
export function ChartTip({ title, body }: TipContent) {
  return (
    <div
      className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-[210px] -translate-x-1/2 rounded-[10px] bg-(--color-text) px-[13px] py-[11px] text-xs leading-normal text-(--color-bg) shadow-(--shadow-lg)"
      role="tooltip"
    >
      <div className="mb-[3px] font-bold">{title}</div>
      <div className="opacity-90">{body}</div>
    </div>
  );
}

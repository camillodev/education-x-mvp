"use client";

import { useState } from "react";
import { DeltaChip } from "./DeltaChip";
import { ChartTip } from "./ChartTip";
import type { BaseChartProps, GoodWhen } from "./types";

const HEIGHT = 190;
const SPAN = HEIGHT - 50;

interface RichBarsProps extends BaseChartProps {
  goodWhen?: GoodWhen;
  /** Formata a variação entre dois pontos (ex.: "+4,2%"). */
  deltaFmt?: (current: number, previous: number) => string;
  /** Valor da linha de média tracejada. */
  avg?: number;
  avgLabel?: string;
}

export function RichBars({
  data,
  fmt,
  accent,
  tip,
  goodWhen = "up",
  deltaFmt,
  avg,
  avgLabel,
}: RichBarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  // min inclui 0 para que barras positivas partam da base, não do menor valor.
  const min = Math.min(...values, 0);
  const barHeight = (v: number) => ((v - min) / (max - min || 1)) * SPAN + 6;
  const avgTop = avg != null ? 30 + (SPAN + 6 - barHeight(avg)) : null;

  return (
    <div className="relative pt-[30px]">
      {avg != null && avgTop != null && (
        <div
          className="pointer-events-none absolute right-0 left-0 z-[2] border-t-2 border-dashed border-(--color-border-strong)"
          style={{ top: avgTop }}
        >
          {avgLabel && (
            <span className="absolute -top-2.5 right-0 bg-(--color-bg) px-1.5 text-[11px] font-bold text-(--color-text-muted)">
              {avgLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex items-end gap-3.5" style={{ height: HEIGHT }}>
        {data.map((d, i) => {
          const prev = i > 0 ? data[i - 1] : null;
          return (
            <div
              key={d.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex h-full flex-1 flex-col items-center justify-end gap-[5px]"
            >
              {prev && deltaFmt && (
                <DeltaChip
                  text={deltaFmt(d.value, prev.value)}
                  dir={Math.sign(d.value - prev.value)}
                  goodWhen={goodWhen}
                />
              )}
              <span
                className="text-[11.5px] font-bold"
                style={{ color: d.highlight ? accent : "var(--color-text-muted)" }}
              >
                {fmt(d.value)}
              </span>
              <div
                className="z-[1] w-full max-w-[42px] rounded-t-lg rounded-b transition-[height] duration-300"
                style={{
                  height: barHeight(d.value),
                  background: d.highlight
                    ? accent
                    : `color-mix(in srgb, ${accent} 24%, white)`,
                }}
              />
              <span
                className="text-xs text-(--color-text-subtle)"
                style={{ fontWeight: d.highlight ? 700 : 500 }}
              >
                {d.label}
              </span>
              {hovered === i && tip && <ChartTip {...tip(d, i)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

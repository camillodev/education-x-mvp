"use client";

import { useState } from "react";
import { TrendingDown } from "lucide-react";
import { ChartTip } from "./ChartTip";
import type { BaseChartProps } from "./types";

const HEIGHT = 200;

interface RichLineProps extends BaseChartProps {
  /** Pílula no canto superior direito (ex.: "−26%" no período). */
  endTag?: string;
}

/**
 * Série temporal como linha + área.
 *
 * O SVG usa `viewBox="0 0 100 100"` com `preserveAspectRatio="none"`, então as
 * coordenadas são percentuais e esticam com o container. Os pontos e rótulos
 * ficam FORA do SVG, posicionados em % pelas mesmas funções `xPct`/`yPct` —
 * é o que mantém marcador e linha alinhados em qualquer largura. Alterar uma
 * das escalas sem a outra desalinha o gráfico.
 */
export function RichLine({ data, fmt, accent, tip, endTag }: RichLineProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // 8..92 no eixo X deixa margem para os rótulos das pontas não cortarem.
  const xPct = (i: number) => (i / (data.length - 1)) * 84 + 8;
  // 22..78 no eixo Y reserva espaço para o valor acima e o label abaixo.
  const yPct = (v: number) => (1 - (v - min) / range) * 56 + 22;

  const line = data.map((d, i) => `${xPct(i)},${yPct(d.value)}`).join(" ");
  const area = `8,${yPct(data[0].value)} ${line} 92,${yPct(
    data[data.length - 1].value
  )} 92,100 8,100`;

  return (
    <div className="relative" style={{ height: HEIGHT }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <polygon points={area} fill={accent} opacity="0.10" />
        <polyline
          points={line}
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {data.map((d, i) => (
        <div
          key={d.label}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="absolute top-0 bottom-0 flex w-[46px] -translate-x-1/2 justify-center"
          style={{ left: `${xPct(i)}%` }}
        >
          <div
            className="absolute left-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] bg-(--color-bg)"
            style={{
              top: `${yPct(d.value)}%`,
              width: d.highlight ? 13 : 9,
              height: d.highlight ? 13 : 9,
              borderColor: accent,
            }}
          />
          <div
            className="absolute text-xs font-bold whitespace-nowrap"
            style={{
              top: `calc(${yPct(d.value)}% - 24px)`,
              color: d.highlight ? accent : "var(--color-text-muted)",
            }}
          >
            {fmt(d.value)}
          </div>
          <div
            className="absolute bottom-0 text-xs text-(--color-text-subtle)"
            style={{ fontWeight: d.highlight ? 700 : 500 }}
          >
            {d.label}
          </div>
          {hovered === i && tip && (
            <div
              className="absolute left-1/2"
              style={{ top: `calc(${yPct(d.value)}% - 34px)` }}
            >
              <ChartTip {...tip(d, i)} />
            </div>
          )}
        </div>
      ))}

      {endTag && (
        <div className="absolute top-1 right-0.5 inline-flex items-center gap-1 rounded-full bg-(--badge-success-bg) px-2.5 py-[5px] text-xs font-bold text-(--badge-success-fg)">
          <TrendingDown size={13} />
          {endTag}
        </div>
      )}
    </div>
  );
}

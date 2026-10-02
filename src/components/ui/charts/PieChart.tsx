import type { BaseChartProps } from "./types";

const RADIUS = 33;
const CENTER = 50;
/** Tons decrescentes do accent, para distinguir fatias sem paleta extra. */
const SHADES = [100, 80, 62, 47, 34, 24];

/** Donut de composição. Sem hover — a legenda já mostra todos os valores. */
export function PieChart({ data, fmt, accent }: Omit<BaseChartProps, "tip">) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  const polar = (angle: number): [number, number] => [
    CENTER + RADIUS * Math.cos(angle),
    CENTER + RADIUS * Math.sin(angle),
  ];

  // Começa às 12h (-90°) e avança no sentido horário.
  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const fraction = d.value / total;
    const next = angle + fraction * Math.PI * 2;
    const [x0, y0] = polar(angle);
    const [x1, y1] = polar(next);
    const largeArc = fraction > 0.5 ? 1 : 0;
    angle = next;
    return {
      path: `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x1} ${y1}`,
      color: `color-mix(in srgb, ${accent} ${SHADES[i % SHADES.length]}%, white)`,
      point: d,
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-7 py-4">
      <svg viewBox="0 0 100 100" className="h-[172px] w-[172px] shrink-0" aria-hidden="true">
        {arcs.map((a) => (
          <path key={a.point.label} d={a.path} fill="none" stroke={a.color} strokeWidth="15" />
        ))}
      </svg>
      <div className="grid min-w-[220px] flex-1 grid-cols-1 gap-x-[22px] gap-y-[9px] sm:grid-cols-2">
        {arcs.map((a) => (
          <div key={a.point.label} className="flex items-center gap-2 text-[13px]">
            <span
              className="h-[11px] w-[11px] shrink-0 rounded-[3px]"
              style={{ background: a.color }}
            />
            <span className="flex-1 text-(--color-text-muted)">{a.point.label}</span>
            <span className="font-bold">{fmt(a.point.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

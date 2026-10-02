import type { ChartPoint } from "@/lib/mock/types";

/** Direção que representa melhora — define a cor do delta. */
export type GoodWhen = "up" | "down";

/** Formatador de valor do eixo/rótulo (ex.: formatBRL, "3,1%"). */
export type ValueFormatter = (value: number) => string;

/** Conteúdo do tooltip de um ponto. */
export interface TipContent {
  title: string;
  body: string;
}

export type TipBuilder = (point: ChartPoint, index: number) => TipContent;

export interface BaseChartProps {
  data: ChartPoint[];
  fmt: ValueFormatter;
  accent: string;
  tip?: TipBuilder;
}

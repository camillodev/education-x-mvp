"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { SectionHead } from "@/components/patterns/SectionHead";
import { RichBars } from "./RichBars";
import { RichLine } from "./RichLine";
import { PieChart } from "./PieChart";
import type { BaseChartProps, GoodWhen } from "./types";

type ChartKind = "barra" | "linha" | "pizza";

const CHART_KINDS: SegmentedOption<ChartKind>[] = [
  { value: "barra", label: "Barras" },
  { value: "linha", label: "Linha" },
  { value: "pizza", label: "Pizza" },
];

interface ChartCardProps extends BaseChartProps {
  title: string;
  sub?: string;
  /** Faixa de narrativa acima do gráfico (StoryBanner). */
  banner?: ReactNode;
  goodWhen?: GoodWhen;
  deltaFmt?: (current: number, previous: number) => string;
  avg?: number;
  avgLabel?: string;
  endTag?: string;
  defaultKind?: ChartKind;
}

/** Card de relatório com seletor Barras / Linha / Pizza sobre a mesma série. */
export function ChartCard({
  title,
  sub,
  banner,
  data,
  fmt,
  accent,
  tip,
  goodWhen = "up",
  deltaFmt,
  avg,
  avgLabel,
  endTag,
  defaultKind = "barra",
}: ChartCardProps) {
  const [kind, setKind] = useState<ChartKind>(defaultKind);

  return (
    <Card className="p-[22px]">
      <SectionHead
        title={title}
        sub={sub}
        action={
          <Segmented size="sm" value={kind} onChange={setKind} options={CHART_KINDS} />
        }
      />
      {banner}
      <div className="mt-3">
        {kind === "barra" && (
          <RichBars
            data={data}
            fmt={fmt}
            accent={accent}
            tip={tip}
            goodWhen={goodWhen}
            deltaFmt={deltaFmt}
            avg={avg}
            avgLabel={avgLabel}
          />
        )}
        {kind === "linha" && (
          <RichLine data={data} fmt={fmt} accent={accent} tip={tip} endTag={endTag} />
        )}
        {kind === "pizza" && <PieChart data={data} fmt={fmt} accent={accent} />}
      </div>
    </Card>
  );
}

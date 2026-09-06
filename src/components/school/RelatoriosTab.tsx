"use client";

import { useMemo, type ReactNode } from "react";
import { Metric } from "@/components/ui/Metric";
import { ChartCard } from "@/components/ui/charts/ChartCard";
import { StoryBanner } from "@/components/ui/charts/StoryBanner";
import type { TipBuilder, ValueFormatter, GoodWhen } from "@/components/ui/charts/types";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { ChartPoint } from "@/lib/mock/types";
import type { ReportSummary } from "@/lib/mock/report-summaries";

interface RelatoriosResponse {
  faturamento: ChartPoint[];
  inadimplencia: ChartPoint[];
  alunos: ChartPoint[];
  churn: ChartPoint[];
  resumos: ReportSummary[];
}

// ── Formatadores ────────────────────────────────────────────────────────────

/** Centavos → "R$ 38,4k". Escala curta cabe no rótulo da barra. */
const brlShort: ValueFormatter = (cents) =>
  `R$ ${(cents / 100 / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;

const percent: ValueFormatter = (v) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`;

const plain: ValueFormatter = (v) => String(v);

const pctDelta = (current: number, previous: number) => {
  const x = ((current - previous) / previous) * 100;
  return `${x >= 0 ? "+" : ""}${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

const countDelta = (current: number, previous: number) =>
  `${current - previous >= 0 ? "+" : ""}${current - previous}`;

const ppDelta = (current: number, previous: number) =>
  `${current - previous >= 0 ? "+" : ""}${(current - previous).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
  })} p.p.`;

/** Renderiza `**trecho**` como negrito. */
function renderStory(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

// ── Configuração de cada relatório ──────────────────────────────────────────

interface ChartConfig {
  fmt: ValueFormatter;
  accent: string;
  goodWhen: GoodWhen;
  deltaFmt: (c: number, p: number) => string;
  avg?: number;
  avgLabel?: string;
  endTag?: string;
  defaultKind?: "barra" | "linha";
  tip: TipBuilder;
}

const CHART_CONFIG: Record<ReportSummary["id"], ChartConfig> = {
  cobranca: {
    fmt: brlShort,
    accent: "var(--color-primary)",
    goodWhen: "up",
    deltaFmt: pctDelta,
    avg: 3550000,
    avgLabel: "Média R$ 35,5k",
    tip: (d) => ({
      title: `${d.label}: ${formatBRL(d.value)}`,
      body: d.highlight
        ? "Você recebeu 97% do que foi emitido no mês — excelente consistência."
        : "Faturamento recebido neste mês.",
    }),
  },
  inadimplencia: {
    fmt: percent,
    accent: "var(--badge-danger-fg)",
    goodWhen: "down",
    deltaFmt: ppDelta,
    endTag: "−26% desde Jan",
    defaultKind: "linha",
    tip: (d) => ({
      title: `Atrasos em ${d.label}: ${percent(d.value)}`,
      body: d.highlight
        ? "Isso representa só R$ 1.200 em aberto — risco de caixa muito baixo."
        : "Percentual de cobranças em atraso no mês.",
    }),
  },
  crescimento: {
    fmt: plain,
    accent: "var(--color-primary)",
    goodWhen: "up",
    deltaFmt: countDelta,
    tip: (d) => ({
      title: `${d.label}: ${d.value} alunos ativos`,
      body: d.highlight
        ? "Sua maior base histórica registrada até hoje."
        : "Total de alunos ativos no mês.",
    }),
  },
  cancelamentos: {
    fmt: percent,
    accent: "var(--color-success)",
    goodWhen: "down",
    deltaFmt: ppDelta,
    tip: (d) => ({
      title: `Cancelamentos em ${d.label}: ${percent(d.value)}`,
      body: d.highlight
        ? "Apenas 2 saídas. Com 1 reativação, a perda real foi de 1 aluno."
        : "Percentual de alunos que saíram no mês.",
    }),
  },
};

export function RelatoriosTab() {
  const { data, loading, error } = useMockResource<RelatoriosResponse>("/api/mock/relatorios");

  const seriesById = useMemo(
    () => ({
      cobranca: data?.faturamento ?? [],
      inadimplencia: data?.inadimplencia ?? [],
      crescimento: data?.alunos ?? [],
      cancelamentos: data?.churn ?? [],
    }),
    [data]
  );

  if (loading) {
    return <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>;
  }
  if (error || !data) {
    return (
      <p className="py-8 text-center text-sm text-(--color-danger-primary)">
        {error ?? "Não foi possível carregar os relatórios."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {data.resumos.map((summary, index) => {
        const config = CHART_CONFIG[summary.id];
        const series = seriesById[summary.id];
        return (
          <div key={summary.id} className="flex flex-col gap-[18px]">
            {index > 0 && <div className="h-px bg-(--color-border-muted)" />}

            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {summary.metrics.map((m) => (
                <Metric
                  key={m.label}
                  label={m.label}
                  value={m.valueCents != null ? formatBRL(m.valueCents) : m.value}
                  icon={m.icon}
                  iconBg={m.iconBg}
                  trend={m.trend}
                  trendValue={m.sub}
                />
              ))}
            </div>

            <ChartCard
              title={summary.chartTitle}
              sub={summary.chartSub}
              data={series}
              fmt={config.fmt}
              accent={config.accent}
              goodWhen={config.goodWhen}
              deltaFmt={config.deltaFmt}
              avg={config.avg}
              avgLabel={config.avgLabel}
              endTag={config.endTag}
              defaultKind={config.defaultKind}
              tip={config.tip}
              banner={
                <StoryBanner
                  icon={summary.story.icon}
                  color={summary.story.color}
                  bg={summary.story.bg}
                >
                  {renderStory(summary.story.text)}
                </StoryBanner>
              }
            />
          </div>
        );
      })}
    </div>
  );
}

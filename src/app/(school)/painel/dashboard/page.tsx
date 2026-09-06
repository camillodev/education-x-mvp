"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SchoolShell } from "@/components/school/SchoolShell";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Metric } from "@/components/ui/Metric";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/patterns/DataTable";
import { FinanceiroBody } from "@/components/school/FinanceiroBody";
import { ExtratoTab } from "@/components/school/ExtratoTab";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { PaymentMethod, UpcomingDue } from "@/lib/mock/types";

type DashTab = "visao" | "relatorios" | "extrato";

const DASH_TABS: SegmentedOption<DashTab>[] = [
  { value: "visao", label: "Dashboard" },
  { value: "relatorios", label: "Relatórios" },
  { value: "extrato", label: "Extrato" },
];

type FormaFilter = "todas" | PaymentMethod;

const FORMA_OPTIONS: SegmentedOption<FormaFilter>[] = [
  { value: "todas", label: "Todas" },
  { value: "PIX", label: "PIX" },
  { value: "Boleto", label: "Boleto" },
  { value: "Cartão", label: "Cartão" },
];

const UPCOMING_COLUMNS: ColumnDef<UpcomingDue, unknown>[] = [
  {
    id: "resp",
    header: "Responsável",
    accessorFn: (row) => row.resp,
    cell: ({ row }) => <span className="font-semibold whitespace-nowrap">{row.original.resp}</span>,
  },
  {
    id: "alunos",
    header: "Alunos",
    accessorFn: (row) => row.alunos.join(" "),
    sortingFn: (a, b) => a.original.alunos.length - b.original.alunos.length,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1.5">
        {row.original.alunos.slice(0, 5).map((aluno) => (
          <Badge key={aluno} variant="primary" size="sm">
            {aluno}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "venc",
    header: "Vencimento",
    accessorFn: (row) => {
      const [dd, mm] = row.venc.split("/").map(Number);
      return mm * 100 + dd;
    },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-(--color-text-muted)">
        {row.original.venc}
        <span className="ml-2 text-[12.5px] text-(--color-text-subtle)">· {row.original.forma}</span>
      </span>
    ),
  },
  {
    id: "valor",
    header: "Valor",
    accessorFn: (row) => row.valor,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-bold">{formatBRL(row.original.valor)}</span>
    ),
  },
];

interface CobrancasResponse {
  upcomingDues: UpcomingDue[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<DashTab>("visao");
  const [forma, setForma] = useState<FormaFilter>("todas");
  const { data, loading, error } = useMockResource<CobrancasResponse>("/api/mock/cobrancas");

  const upcomingDues = data?.upcomingDues ?? [];
  const filteredByForma =
    forma === "todas" ? upcomingDues : upcomingDues.filter((d) => d.forma === forma);

  return (
    <SchoolShell
      title="Dashboard"
      subtitle="Visão da unidade Kumon Camargos"
      actions={
        <Button variant="secondary" iconLeft="download">
          Exportar
        </Button>
      }
    >
      <div className="mb-[22px] overflow-x-auto pb-0.5">
        <Segmented options={DASH_TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "visao" && (
        <>
          <div className="mb-[26px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Recebido no mês"
              value={formatBRL(3840000)}
              icon="wallet"
              iconBg="var(--badge-success-bg)"
              trend="up"
              trendValue="+4,2% vs. maio"
            />
            <Metric
              label="A vencer"
              value={formatBRL(1260000)}
              icon="clock"
              iconBg="var(--badge-warning-bg)"
              trendValue="28 cobranças"
            />
            <Metric
              label="Vencido"
              value={formatBRL(120000)}
              icon="alert-circle"
              iconBg="var(--badge-danger-bg)"
              trend="down"
              trendValue="3 em atraso"
            />
            <Metric
              label="Alunos ativos"
              value="84"
              icon="users"
              iconBg="var(--color-primary-soft)"
              trend="up"
              trendValue="+5 este mês"
            />
          </div>

          <FinanceiroBody />

          <Card className="overflow-hidden p-5">
            {loading && (
              <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>
            )}
            {error && (
              <p className="py-8 text-center text-sm text-(--color-danger-primary)">{error}</p>
            )}
            {!loading && !error && (
              <DataTable
                title="Próximos vencimentos"
                action={
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() => router.push("/painel/cobrancas")}
                  >
                    Ver todas
                  </Button>
                }
                columns={UPCOMING_COLUMNS}
                data={filteredByForma}
                searchPlaceholder="Buscar por responsável ou aluno"
                filterOptions={FORMA_OPTIONS}
                filterValue={forma}
                onFilterChange={setForma}
                pageSize={6}
                emptyMessage="Nenhum vencimento encontrado."
                onRowClick={() => router.push("/painel/cobrancas")}
              />
            )}
          </Card>
        </>
      )}

      {tab === "relatorios" && (
        <p className="text-sm text-(--color-text-subtle)">
          Relatórios — próxima fatia desta branch.
        </p>
      )}
      {tab === "extrato" && <ExtratoTab />}
    </SchoolShell>
  );
}

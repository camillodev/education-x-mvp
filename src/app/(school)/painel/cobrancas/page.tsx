"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SchoolShell } from "@/components/school/SchoolShell";
import type { SegmentedOption } from "@/components/ui/segmented";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/patterns/DataTable";
import { Person } from "@/components/patterns/Person";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { Invoice, InvoiceStatus } from "@/lib/mock/types";

type CobrancasTab = "cobrancas" | "negativacao";
type StatusFilter = "todas" | "avencer" | "pagas" | "vencidas";

const STATUS_TO_FILTER: Record<InvoiceStatus, StatusFilter | null> = {
  avencer: "avencer",
  paga: "pagas",
  vencida: "vencidas",
  contestacao: null,
};

const COLUMNS: ColumnDef<Invoice, unknown>[] = [
  {
    id: "resp",
    header: "Responsável",
    accessorFn: (row) => `${row.resp} ${row.aluno} ${row.desc}`,
    cell: ({ row }) => <Person name={row.original.resp} />,
  },
  {
    id: "aluno",
    header: "Aluno",
    accessorFn: (row) => row.aluno,
    cell: ({ row }) => <span className="text-(--color-text-muted)">{row.original.aluno}</span>,
  },
  {
    id: "valor",
    header: "Valor",
    accessorFn: (row) => row.valor,
    cell: ({ row }) => <span className="font-bold">{formatBRL(row.original.valor)}</span>,
  },
  {
    id: "venc",
    header: "Vencimento",
    accessorFn: (row) => row.venc,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <span
          className={
            c.status === "vencida"
              ? "font-semibold text-(--badge-danger-fg)"
              : "text-(--color-text-muted)"
          }
        >
          {c.venc}
          {c.atraso ? ` · ${c.atraso}d atraso` : ""}
        </span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "acao",
    header: "",
    enableSorting: false,
    accessorFn: () => "",
    cell: () => (
      <Button variant="tertiary" size="sm" iconLeft="eye">
        Visualizar
      </Button>
    ),
  },
];

interface CobrancasResponse {
  invoices: Invoice[];
}

export default function CobrancasPage() {
  const [tab, setTab] = useState<CobrancasTab>("cobrancas");
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const { data, loading, error } = useMockResource<CobrancasResponse>("/api/mock/cobrancas");
  const invoices = useMemo(() => data?.invoices ?? [], [data]);

  const counts = useMemo(
    () => ({
      todas: invoices.length,
      avencer: invoices.filter((c) => c.status === "avencer").length,
      pagas: invoices.filter((c) => c.status === "paga").length,
      vencidas: invoices.filter((c) => c.status === "vencida").length,
    }),
    [invoices]
  );

  const filterOptions: SegmentedOption<StatusFilter>[] = [
    { value: "todas", label: "Todas", count: counts.todas },
    { value: "avencer", label: "A vencer", count: counts.avencer },
    { value: "pagas", label: "Pagas", count: counts.pagas },
    { value: "vencidas", label: "Vencidas", count: counts.vencidas },
  ];

  const filtered =
    filter === "todas" ? invoices : invoices.filter((c) => STATUS_TO_FILTER[c.status] === filter);

  const tabOptions: SegmentedOption<CobrancasTab>[] = [
    { value: "cobrancas", label: "Cobranças" },
    { value: "negativacao", label: "Negativação" },
  ];

  return (
    <SchoolShell
      title="Cobranças"
      subtitle={
        tab === "cobrancas"
          ? "Mensalidades e cobranças avulsas da unidade"
          : "Você decide quem negativar, caso a caso — a lei é garantida pelo sistema"
      }
      actions={tab === "cobrancas" ? <Button iconLeft="plus">Nova cobrança extra</Button> : undefined}
    >
      <div className="mb-[22px]">
        <Segmented options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab === "negativacao" ? (
        <p className="text-sm text-(--color-text-subtle)">
          Negativação — próxima fatia desta branch.
        </p>
      ) : (
        <Card className="overflow-hidden p-5">
          {loading && (
            <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>
          )}
          {error && (
            <p className="py-8 text-center text-sm text-(--color-danger-primary)">{error}</p>
          )}
          {!loading && !error && (
            <DataTable
              title="Todas as cobranças"
              columns={COLUMNS}
              data={filtered}
              searchPlaceholder="Buscar por responsável ou aluno…"
              filterOptions={filterOptions}
              filterValue={filter}
              onFilterChange={setFilter}
              pageSize={6}
              emptyMessage="Nenhuma cobrança encontrada."
            />
          )}
        </Card>
      )}
    </SchoolShell>
  );
}

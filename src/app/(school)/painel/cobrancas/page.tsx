"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SchoolShell } from "@/components/school/SchoolShell";
import type { SegmentedOption } from "@/components/ui/segmented";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/patterns/DataTable";
import { Person } from "@/components/patterns/Person";
import { NegativacaoBody } from "@/components/school/NegativacaoBody";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { DunningRecord, Invoice, InvoiceStatus } from "@/lib/mock/types";

type CobrancasTab = "cobrancas" | "negativacao";
type StatusFilter = "todas" | "avencer" | "pagas" | "vencidas";

const STATUS_TO_FILTER: Record<InvoiceStatus, StatusFilter | null> = {
  avencer: "avencer",
  paga: "pagas",
  vencida: "vencidas",
  contestacao: null,
};

function buildColumns(onView: (id: string) => void): ColumnDef<Invoice, unknown>[] {
  return [
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
      cell: ({ row }) => (
        <Button
          variant="tertiary"
          size="sm"
          iconLeft="eye"
          onClick={(e) => {
            e.stopPropagation();
            onView(row.original.id);
          }}
        >
          Visualizar
        </Button>
      ),
    },
  ];
}

interface CobrancasResponse {
  invoices: Invoice[];
}

export default function CobrancasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: CobrancasTab = searchParams.get("tab") === "negativacao" ? "negativacao" : "cobrancas";
  const [tab, setTab] = useState<CobrancasTab>(initialTab);
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const { data, loading, error } = useMockResource<CobrancasResponse>("/api/mock/cobrancas");
  const invoices = useMemo(() => data?.invoices ?? [], [data]);
  const goToDetail = useCallback((id: string) => router.push(`/painel/cobrancas/${id}`), [router]);
  const columns = useMemo(() => buildColumns(goToDetail), [goToDetail]);
  const { data: dunningRecords } = useMockResource<DunningRecord[]>("/api/mock/negativacao");
  const eligibleCount = (dunningRecords ?? []).filter((r) => r.status === "elegivel").length;

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
    { value: "negativacao", label: "Negativação", count: eligibleCount || undefined },
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
        <NegativacaoBody />
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
              columns={columns}
              data={filtered}
              searchPlaceholder="Buscar por responsável ou aluno…"
              filterOptions={filterOptions}
              filterValue={filter}
              onFilterChange={setFilter}
              pageSize={6}
              emptyMessage="Nenhuma cobrança encontrada."
              onRowClick={(row) => goToDetail(row.id)}
            />
          )}
        </Card>
      )}
    </SchoolShell>
  );
}

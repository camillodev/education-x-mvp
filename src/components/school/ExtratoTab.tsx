"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import type { SegmentedOption } from "@/components/ui/segmented";
import { DataTable } from "@/components/patterns/DataTable";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { LedgerEntry, LedgerEntryOrigin } from "@/lib/mock/types";

type TipoFilter = "todos" | "entradas" | "saidas";

const ORIGEM_ICON: Record<LedgerEntryOrigin, string> = {
  PIX: "qr-code",
  Boleto: "barcode",
  Cartão: "credit-card",
  Saque: "arrow-up-right",
  Antecipação: "zap",
};

const FILTER_OPTIONS: SegmentedOption<TipoFilter>[] = [
  { value: "todos", label: "Todos" },
  { value: "entradas", label: "Entradas" },
  { value: "saidas", label: "Saídas" },
];

const COLUMNS: ColumnDef<LedgerEntry, unknown>[] = [
  {
    id: "origem",
    header: "Origem",
    accessorFn: (row) => `${row.origem} ${row.desc}`,
    cell: ({ row }) => {
      const e = row.original;
      return (
        <span className="inline-flex items-center gap-2 font-semibold">
          <span
            className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-(--color-surface) ${
              e.tipo === "saida" ? "text-(--color-text-muted)" : "text-(--color-primary)"
            }`}
          >
            <Icon name={ORIGEM_ICON[e.origem] ?? "circle"} size={15} />
          </span>
          {e.origem}
        </span>
      );
    },
  },
  {
    id: "desc",
    header: "Descrição",
    accessorFn: (row) => row.desc,
    cell: ({ row }) => <span className="text-(--color-text-muted)">{row.original.desc}</span>,
  },
  {
    id: "data",
    header: "Data",
    accessorFn: (row) => row.data,
    cell: ({ row }) => <span className="text-(--color-text-subtle)">{row.original.data}</span>,
  },
  {
    id: "status",
    header: "Situação",
    accessorFn: (row) => row.status,
    cell: ({ row }) => {
      const e = row.original;
      if (e.status === "disponivel")
        return (
          <Badge variant="success" dot size="sm">
            Disponível
          </Badge>
        );
      if (e.status === "aliberar")
        return (
          <Badge variant="warning" dot size="sm">
            Libera {e.liberaEm}
          </Badge>
        );
      return (
        <Badge variant="neutral" size="sm">
          Concluído
        </Badge>
      );
    },
  },
  {
    id: "valor",
    header: "Valor",
    accessorFn: (row) => row.valor,
    cell: ({ row }) => {
      const e = row.original;
      return (
        <span
          className={`font-bold ${
            e.tipo === "saida" ? "text-(--color-text-muted)" : "text-(--badge-success-fg)"
          }`}
        >
          {e.tipo === "saida" ? "−" : "+"}
          {formatBRL(e.valor)}
        </span>
      );
    },
  },
];

interface FinanceiroResponse {
  extrato: LedgerEntry[];
}

export function ExtratoTab() {
  const [filter, setFilter] = useState<TipoFilter>("todos");
  const { data, loading, error } = useMockResource<FinanceiroResponse>("/api/mock/financeiro");
  const entries = useMemo(() => data?.extrato ?? [], [data]);

  const filtered =
    filter === "todos"
      ? entries
      : entries.filter((e) => (filter === "entradas" ? e.tipo === "entrada" : e.tipo === "saida"));

  return (
    <Card className="overflow-hidden p-5">
      {loading && <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>}
      {error && <p className="py-8 text-center text-sm text-(--color-danger-primary)">{error}</p>}
      {!loading && !error && (
        <DataTable
          title="Extrato"
          sub="Entradas e saídas da conta da unidade"
          columns={COLUMNS}
          data={filtered}
          searchPlaceholder="Buscar por responsável ou descrição…"
          filterOptions={FILTER_OPTIONS}
          filterValue={filter}
          onFilterChange={setFilter}
          pageSize={6}
          emptyMessage="Nenhum lançamento encontrado."
        />
      )}
    </Card>
  );
}

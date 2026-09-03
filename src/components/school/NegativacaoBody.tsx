"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { Metric } from "@/components/ui/Metric";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/patterns/DataTable";
import { Person } from "@/components/patterns/Person";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL, maskCpfDisplay } from "@/lib/format";
import type { DunningRecord, DunningStatus } from "@/lib/mock/types";

type DunningFilter = "todos" | DunningStatus;

function buildColumns(onView: (id: string) => void): ColumnDef<DunningRecord, unknown>[] {
  return [
  {
    id: "resp",
    header: "Responsável",
    accessorFn: (row) => `${row.resp} ${row.aluno}`,
    cell: ({ row }) => <Person name={row.original.resp} sub={maskCpfDisplay(row.original.cpf)} />,
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
    accessorFn: (row) => row.valorAtualizado,
    cell: ({ row }) => (
      <div>
        <span className="font-bold">{formatBRL(row.original.valorAtualizado)}</span>
        <div className="text-xs text-(--color-text-subtle)">era {formatBRL(row.original.valor)}</div>
      </div>
    ),
  },
  {
    id: "atraso",
    header: "Atraso",
    accessorFn: (row) => row.atraso,
    cell: ({ row }) => (
      <span
        className={
          row.original.atraso > 30
            ? "font-bold text-(--badge-danger-fg)"
            : "font-bold text-(--badge-warning-fg)"
        }
      >
        {row.original.atraso} dias
      </span>
    ),
  },
  {
    id: "status",
    header: "Status SPC",
    accessorFn: (row) => row.status,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "acao",
    header: "",
    enableSorting: false,
    accessorFn: () => "",
    cell: ({ row }) => (
      <div className="inline-flex justify-end gap-2">
        <Button
          variant="tertiary"
          size="sm"
          iconLeft="eye"
          onClick={(e) => {
            e.stopPropagation();
            onView(row.original.id);
          }}
        >
          Ver
        </Button>
        {row.original.status === "elegivel" && (
          <Button
            variant="danger"
            size="sm"
            iconLeft="gavel"
            onClick={(e) => {
              e.stopPropagation();
              onView(row.original.id);
            }}
          >
            Negativar
          </Button>
        )}
      </div>
    ),
  },
  ];
}

export function NegativacaoBody() {
  const router = useRouter();
  const [filter, setFilter] = useState<DunningFilter>("todos");
  const { data, loading, error } = useMockResource<DunningRecord[]>("/api/mock/negativacao");
  const records = useMemo(() => data ?? [], [data]);
  const goToDetail = useCallback(
    (id: string) => router.push(`/painel/negativacao/${id}`),
    [router]
  );
  const columns = useMemo(() => buildColumns(goToDetail), [goToDetail]);

  const emAviso = records.filter((r) => r.status === "emaviso");
  const elegiveis = records.filter((r) => r.status === "elegivel");
  const negativados = records.filter((r) => r.status === "negativado");
  const totalEleg = elegiveis.reduce((s, r) => s + r.valor, 0);
  const totalNeg = negativados.reduce((s, r) => s + r.valor, 0);

  const filterOptions = [
    { value: "todos" as const, label: "Todos" },
    { value: "elegivel" as const, label: "Elegíveis" },
    { value: "emaviso" as const, label: "Em aviso" },
    { value: "negativado" as const, label: "Negativados" },
  ];

  const filtered = filter === "todos" ? records : records.filter((r) => r.status === filter);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Em aviso"
          value={emAviso.length}
          trendValue="dentro do prazo legal"
          icon="bell-ring"
          iconBg="var(--badge-warning-bg)"
        />
        <Metric
          label="Elegíveis p/ negativar"
          value={elegiveis.length}
          trendValue={`${formatBRL(totalEleg)} aguardando você`}
          icon="gavel"
          iconBg="var(--badge-danger-bg)"
        />
        <Metric
          label="Negativados"
          value={negativados.length}
          trendValue={`${formatBRL(totalNeg)} no SPC/Serasa`}
          icon="file-x"
          iconBg="var(--badge-danger-bg)"
        />
        <Metric
          label="Regularizados (mês)"
          value="3"
          trend="up"
          trendValue="baixa automática ao pagar"
          icon="check-circle-2"
          iconBg="var(--badge-success-bg)"
        />
      </div>

      <Card className="mb-[22px] flex items-center gap-3 border border-(--color-primary-soft) bg-(--color-toast-info-bg) p-4">
        <ShieldCheck size={20} className="shrink-0 text-(--color-primary)" />
        <p className="m-0 text-[13.5px] leading-normal text-(--color-text-muted)">
          O aviso prévio é <strong className="text-(--color-text)">automático e obrigatório</strong> (CDC).
          Passado o prazo legal, o responsável fica{" "}
          <strong className="text-(--color-text)">elegível</strong> — mas a negativação só acontece
          quando <strong className="text-(--color-text)">você decide</strong>, um a um.
        </p>
      </Card>

      <Card className="overflow-hidden p-5">
        {loading && <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>}
        {error && <p className="py-8 text-center text-sm text-(--color-danger-primary)">{error}</p>}
        {!loading && !error && (
          <DataTable
            title="Inadimplentes"
            sub="Decida a negativação dos elegíveis"
            columns={columns}
            data={filtered}
            searchPlaceholder="Buscar responsável…"
            filterOptions={filterOptions}
            filterValue={filter}
            onFilterChange={setFilter}
            pageSize={6}
            emptyMessage="Nenhum inadimplente neste filtro."
            onRowClick={(row) => goToDetail(row.id)}
          />
        )}
      </Card>
    </>
  );
}

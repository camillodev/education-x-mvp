"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SchoolShell } from "@/components/school/SchoolShell";
import type { SegmentedOption } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/patterns/DataTable";
import { Person } from "@/components/patterns/Person";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import { subjectLabel } from "@/lib/mock/subjects";
import type { Enrollment, EnrollmentStatus } from "@/lib/mock/types";

type StatusFilter = "todas" | "ativas" | "pendentes" | "canceladas";

const STATUS_TO_FILTER: Record<EnrollmentStatus, Exclude<StatusFilter, "todas">> = {
  ativa: "ativas",
  pendente: "pendentes",
  cancelada: "canceladas",
};

const SUBJECT_COLOR_TOKEN: Record<string, string> = {
  matematica: "--color-subject-math",
  portugues: "--color-subject-portuguese",
  ingles: "--color-subject-english",
  japones: "--color-subject-japanese",
};

function buildColumns(onView: (id: string) => void): ColumnDef<Enrollment, unknown>[] {
  return [
  {
    id: "pagante",
    header: "Pagante",
    accessorFn: (row) => `${row.pagante} ${row.aluno} ${row.email} ${row.cpf}`,
    cell: ({ row }) => (
      <Person
        name={row.original.pagante}
        sub={row.original.selfPayer ? "Próprio aluno · paga a si" : row.original.tel}
      />
    ),
  },
  {
    id: "aluno",
    header: "Aluno",
    accessorFn: (row) => row.aluno,
    cell: ({ row }) => (
      <div>
        <span className="text-sm font-semibold">{row.original.aluno}</span>
        <div className="mt-[5px] flex flex-wrap gap-1">
          {row.original.materias.map((mat) => {
            const token = SUBJECT_COLOR_TOKEN[mat];
            return (
              <span
                key={mat}
                className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: `color-mix(in srgb, var(${token}) 15%, transparent)`,
                  color: `var(${token})`,
                  borderColor: `color-mix(in srgb, var(${token}) 40%, transparent)`,
                }}
              >
                {subjectLabel(mat)}
              </span>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    id: "plano",
    header: "Plano",
    accessorFn: (row) => row.plano,
    cell: ({ row }) => (
      <div>
        <span className="font-semibold">{row.original.plano}</span>
        <div className="text-[12.5px] text-(--color-text-subtle)">
          {formatBRL(row.original.valor)}
          {row.original.plano !== "Mensal" ? " total" : "/mês"}
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => {
      const m = row.original;
      if (m.status === "pendente") return <Badge variant="warning" dot>Pendente</Badge>;
      if (m.status === "cancelada")
        return (
          <div className="flex flex-col items-start gap-[3px]">
            <Badge variant="neutral" dot>Cancelada</Badge>
            {m.motivo && <span className="text-[11.5px] text-(--color-text-subtle)">{m.motivo}</span>}
          </div>
        );
      return <Badge variant="success" dot>Ativa</Badge>;
    },
  },
  {
    id: "acao",
    header: "",
    enableSorting: false,
    accessorFn: () => "",
    cell: ({ row }) => {
      const m = row.original;
      const open = (e: React.MouseEvent) => {
        e.stopPropagation();
        onView(m.id);
      };
      if (m.status === "pendente")
        return (
          <Button size="sm" iconRight="chevron-right" onClick={open}>
            Revisar
          </Button>
        );
      if (m.status === "cancelada")
        return (
          <Button variant="tertiary" size="sm" iconLeft="eye" onClick={open}>
            Ver
          </Button>
        );
      return (
        <Button variant="tertiary" size="sm" iconLeft="pencil" onClick={open}>
          Editar
        </Button>
      );
    },
  },
  ];
}

export default function PainelMatriculasPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const { data, loading, error } = useMockResource<Enrollment[]>("/api/mock/matriculas");
  const enrollments = useMemo(() => data ?? [], [data]);
  const goToDetail = useCallback(
    (id: string) => router.push(`/painel/matriculas/${id}`),
    [router]
  );
  const columns = useMemo(() => buildColumns(goToDetail), [goToDetail]);

  const counts = useMemo(
    () => ({
      todas: enrollments.length,
      ativas: enrollments.filter((m) => m.status === "ativa").length,
      pendentes: enrollments.filter((m) => m.status === "pendente").length,
      canceladas: enrollments.filter((m) => m.status === "cancelada").length,
    }),
    [enrollments]
  );

  const filterOptions: SegmentedOption<StatusFilter>[] = [
    { value: "todas", label: "Todas", count: counts.todas },
    { value: "ativas", label: "Ativas", count: counts.ativas },
    { value: "pendentes", label: "Pendentes", count: counts.pendentes },
    { value: "canceladas", label: "Canceladas", count: counts.canceladas },
  ];

  const filtered =
    filter === "todas" ? enrollments : enrollments.filter((m) => STATUS_TO_FILTER[m.status] === filter);

  return (
    <SchoolShell
      title="Matrículas"
      actions={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            iconLeft="upload"
            onClick={() => router.push("/painel/importar")}
          >
            Importar CSV
          </Button>
          <Button variant="secondary" iconLeft="link">
            Gerar link
          </Button>
          <Button iconLeft="plus" onClick={() => router.push("/painel/matriculas/nova")}>
            Nova matrícula
          </Button>
        </div>
      }
    >
      <Card className="overflow-hidden p-5">
        {loading && <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>}
        {error && <p className="py-8 text-center text-sm text-(--color-danger-primary)">{error}</p>}
        {!loading && !error && (
          <DataTable
            title="Todas as matrículas"
            columns={columns}
            data={filtered}
            searchPlaceholder="Buscar por nome, e-mail ou CPF…"
            filterOptions={filterOptions}
            filterValue={filter}
            onFilterChange={setFilter}
            pageSize={8}
            emptyMessage="Nenhuma matrícula encontrada."
          />
        )}
      </Card>
    </SchoolShell>
  );
}

"use client";

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { SectionHead } from "@/components/patterns/SectionHead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Organismo único de tabela — implementa o contrato obrigatório do protótipo
 * (design-handoff/project/CLAUDE.md): título+ação, busca+filtro (reset de
 * página), headers ordenáveis, paginação sempre visível, empty state.
 * Toda tela do produto define só `columns`+`data`; nunca uma <table> nova.
 */
export interface DataTableProps<TData, TFilter extends string = string> {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  filterOptions?: SegmentedOption<TFilter>[];
  filterValue?: TFilter;
  onFilterChange?: (value: TFilter) => void;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  /**
   * Esconde busca e paginação internas (client-side) — usar quando `data` já
   * chega filtrada/paginada por uma fonte externa (API com busca/paginação
   * server-side). A tabela em si e o empty state continuam funcionando normal.
   */
  hideBuiltinControls?: boolean;
}

export function DataTable<TData, TFilter extends string = string>({
  title,
  sub,
  action,
  columns,
  data,
  searchPlaceholder = "Buscar...",
  filterOptions,
  filterValue,
  onFilterChange,
  pageSize = 8,
  emptyMessage = "Nenhum resultado encontrado.",
  onRowClick,
  hideBuiltinControls = false,
}: DataTableProps<TData, TFilter>) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<
    { id: string; desc: boolean }[]
  >([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Qualquer mudança de filtro/busca reseta a página para 0 (contrato do protótipo).
  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const { pageIndex } = pagination;
  const pageCount = table.getPageCount();
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(totalRows, (pageIndex + 1) * pageSize);

  return (
    <div>
      <SectionHead title={title} sub={sub} action={action} />

      {!hideBuiltinControls && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <Input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                resetPage();
              }}
              placeholder={searchPlaceholder}
              leadingIcon={<Icon name="search" size={16} />}
            />
          </div>
          {filterOptions && filterValue !== undefined && onFilterChange && (
            <Segmented
              options={filterOptions}
              value={filterValue}
              onChange={(v) => {
                onFilterChange(v);
                resetPage();
              }}
            />
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    onClick={
                      canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={canSort ? "cursor-pointer select-none" : undefined}
                    style={{
                      color: sortDir ? "var(--color-primary)" : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {canSort && (
                        <Icon
                          name={
                            sortDir === "asc"
                              ? "chevron-up"
                              : sortDir === "desc"
                                ? "chevron-down"
                                : "chevrons-up-down"
                          }
                          size={13}
                        />
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-(--color-text-subtle)">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!hideBuiltinControls && totalRows > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-(--color-text-subtle)">
            {from}–{to} de {totalRows}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="tertiary"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Anterior
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i).map((i) => (
              <Button
                key={i}
                variant={i === pageIndex ? "primary" : "tertiary"}
                size="sm"
                onClick={() => table.setPageIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="tertiary"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Paginação server-side (quando a fonte de dados já pagina fora do DataTable) ──

export interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
  className?: string;
}

export function DataTablePagination({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
  className,
}: DataTablePaginationProps) {
  return (
    <div className={`flex items-center justify-between px-[18px] py-3 ${className ?? ""}`}>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Página anterior"
        iconLeft="chevron-left"
      >
        Anterior
      </Button>
      <span className="text-sm text-(--color-text-subtle)">
        {label ?? `Página ${page} de ${totalPages}`}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Próxima página"
        iconRight="chevron-right"
      >
        Próxima
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileUp,
  FolderOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stepper } from "@/components/patterns/Stepper";
import { DataTable } from "@/components/patterns/DataTable";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { maskCpf } from "@/lib/format";
import { CPF_RE, validateRow } from "@/lib/csv-validation";
import type { CsvImportRow } from "@/lib/mock/types";

const STEPS = [{ label: "Arquivo" }, { label: "Validação" }, { label: "Concluído" }];

/** Linhas válidas do resto da base, não exibidas na prévia. */
const EXTRA_VALID = 21;

interface ImportResponse {
  rows: CsvImportRow[];
  planosValidos: string[];
}

export default function ImportarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);
  const [rows, setRows] = useState<CsvImportRow[] | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<CsvImportRow | null>(null);

  const { data } = useMockResource<ImportResponse>("/api/mock/import-csv");
  const validPlans = useMemo(() => data?.planosValidos ?? [], [data]);

  useEffect(() => {
    if (data && !rows) setRows(data.rows);
  }, [data, rows]);

  const current = rows ?? [];
  const errorCount = current.filter((r) => !r.ok).length;
  const validCount = current.filter((r) => r.ok).length + EXTRA_VALID;
  const total = validCount + errorCount;

  // Erros primeiro — o operador vê o que precisa corrigir sem rolar.
  const sorted = [...current].sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));

  const openEdit = (row: CsvImportRow) => {
    setEditIdx(current.indexOf(row));
    setDraft({ ...row });
  };

  const saveEdit = () => {
    if (!draft || editIdx === null) return;
    const erro = validateRow(draft, validPlans);
    const fixed: CsvImportRow = { ...draft, ok: !erro, erro: erro ?? undefined };
    setRows((prev) => (prev ?? []).map((r, i) => (i === editIdx ? fixed : r)));
    setEditIdx(null);
    if (fixed.ok) toast(`${fixed.aluno} corrigido — pronto para importar`, "success");
  };

  const columns: ColumnDef<CsvImportRow, unknown>[] = [
    {
      id: "aluno",
      header: "Aluno",
      accessorFn: (r) => r.aluno,
      cell: ({ row }) => <span className="font-semibold">{row.original.aluno}</span>,
    },
    {
      id: "pagante",
      header: "Pagante",
      accessorFn: (r) => r.pagante,
      cell: ({ row }) => (
        <span
          className={
            !row.original.pagante ? "text-(--badge-danger-fg)" : "text-(--color-text-muted)"
          }
        >
          {row.original.pagante || "—"}
        </span>
      ),
    },
    {
      id: "cpf",
      header: "CPF",
      accessorFn: (r) => r.cpf,
      cell: ({ row }) => {
        const r = row.original;
        const invalid = !r.ok && !CPF_RE.test(r.cpf.trim());
        return (
          <span
            className={`font-mono text-[13px] ${
              invalid ? "text-(--badge-danger-fg)" : "text-(--color-text-muted)"
            }`}
          >
            {r.cpf ? maskCpf(r.cpf) : "—"}
          </span>
        );
      },
    },
    {
      id: "plano",
      header: "Plano",
      accessorFn: (r) => r.plano,
      cell: ({ row }) => {
        const r = row.original;
        const invalid = !r.ok && !validPlans.includes(r.plano);
        return (
          <span className={invalid ? "text-(--badge-danger-fg)" : "text-(--color-text-muted)"}>
            {r.plano}
          </span>
        );
      },
    },
    {
      id: "validacao",
      header: "Validação",
      accessorFn: (r) => (r.ok ? "ok" : "erro"),
      cell: ({ row }) => {
        const r = row.original;
        if (r.ok)
          return (
            <Badge variant="success" dot>
              OK
            </Badge>
          );
        // Só revela a mensagem depois que o operador tenta importar.
        if (!tried)
          return (
            <Badge variant="warning" dot>
              Pendente
            </Badge>
          );
        return (
          <span className="inline-flex items-center gap-[7px]">
            <Badge variant="danger" dot>
              Erro
            </Badge>
            <span className="text-[12.5px] text-(--badge-danger-fg)">{r.erro}</span>
          </span>
        );
      },
    },
    {
      id: "acao",
      header: "",
      enableSorting: false,
      accessorFn: () => "",
      cell: ({ row }) =>
        row.original.ok ? (
          <span className="text-[12.5px] text-(--color-text-subtle)">—</span>
        ) : (
          <Button
            size="sm"
            iconLeft="pencil"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            Corrigir
          </Button>
        ),
    },
  ];

  const handleImport = () => {
    if (errorCount > 0) {
      setTried(true);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const importLabel = loading
    ? "Importando…"
    : errorCount > 0
      ? `Ver ${errorCount} erro${errorCount > 1 ? "s" : ""} antes de importar`
      : `Importar ${validCount} matrículas`;

  return (
    <SchoolShell
      title="Importação de matrículas"
      subtitle="Suba a base da escola em CSV — validamos e você corrige antes de importar"
      onBack={() => (step === 0 ? router.push("/painel/matriculas") : setStep(step - 1))}
      maxWidth={880}
    >
      <div className="mb-[26px] max-w-[520px]">
        <Stepper steps={STEPS} current={step + 1} />
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-[18px]">
          <Card className="overflow-hidden p-0">
            <div className="m-5 rounded-(--radius-md) border-2 border-dashed border-(--color-border-input) bg-(--color-surface) p-10 text-center">
              <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-[14px] bg-(--color-primary-soft)">
                <FileUp size={28} className="text-(--color-primary)" />
              </div>
              <div className="text-base font-bold">Arraste o arquivo CSV aqui</div>
              <div className="mt-1.5 mb-[18px] text-[13.5px] text-(--color-text-subtle)">
                ou selecione do computador · até 5.000 linhas
              </div>
              <Button
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    setStep(1);
                  }, 900);
                }}
              >
                <FolderOpen size={16} />
                {loading ? "Lendo arquivo…" : "Selecionar arquivo"}
              </Button>
            </div>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-md) border border-(--color-primary-soft) bg-(--color-toast-info-bg) px-[18px] py-3.5">
            <span className="inline-flex items-center gap-[9px] text-[13.5px] text-(--color-text-muted)">
              <Info size={17} className="shrink-0 text-(--color-primary)" />
              Colunas esperadas:{" "}
              <strong className="text-(--color-text)">
                aluno, nascimento, pagante, cpf, email, telefone, plano, materias
              </strong>
            </span>
            <Button
              variant="tertiary"
              size="sm"
              iconLeft="download"
              onClick={() => toast("Baixando modelo CSV…", "info")}
            >
              Baixar modelo
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-wrap items-center gap-3.5">
            <Badge variant="neutral">
              <FileSpreadsheet size={14} />
              matriculas-kumon-camargos.csv
            </Badge>
            <span className="text-[13.5px] text-(--color-text-subtle)">{total} linhas lidas</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Card className="flex items-center gap-3.5 border border-(--badge-success-fg)/30 bg-(--badge-success-bg) p-[18px]">
              <CheckCircle2 size={26} className="text-(--badge-success-fg)" />
              <div>
                <div className="text-2xl leading-none font-extrabold text-(--badge-success-fg)">
                  {validCount}
                </div>
                <div className="mt-[3px] text-[13px] text-(--badge-success-fg)">
                  prontas para importar
                </div>
              </div>
            </Card>
            <Card
              className={`flex items-center gap-3.5 border p-[18px] ${
                errorCount
                  ? "border-(--badge-warning-fg)/30 bg-(--badge-warning-bg)"
                  : "border-(--badge-success-fg)/30 bg-(--badge-success-bg)"
              }`}
            >
              {errorCount ? (
                <AlertTriangle size={26} className="text-(--badge-warning-fg)" />
              ) : (
                <CheckCircle2 size={26} className="text-(--badge-success-fg)" />
              )}
              <div>
                <div
                  className={`text-2xl leading-none font-extrabold ${
                    errorCount ? "text-(--badge-warning-fg)" : "text-(--badge-success-fg)"
                  }`}
                >
                  {errorCount}
                </div>
                <div
                  className={`mt-[3px] text-[13px] ${
                    errorCount ? "text-(--badge-warning-fg)" : "text-(--badge-success-fg)"
                  }`}
                >
                  {errorCount ? "com erro — corrija para incluir" : "tudo corrigido!"}
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden p-5">
            <DataTable
              title="Linhas do arquivo"
              sub={`+ ${EXTRA_VALID} linhas válidas não exibidas`}
              columns={columns}
              data={sorted}
              searchPlaceholder="Buscar por aluno ou pagante…"
              pageSize={8}
              emptyMessage="Nenhuma linha encontrada."
            />
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setStep(0)}>
              Trocar arquivo
            </Button>
            <Button size="lg" iconRight="arrow-right" disabled={loading} onClick={handleImport}>
              {importLabel}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="mb-[22px] flex h-[76px] w-[76px] items-center justify-center rounded-full bg-(--badge-success-bg)">
            <Check size={40} strokeWidth={3} className="text-(--badge-success-fg)" />
          </div>
          <h2 className="m-0 text-[25px] font-bold tracking-[-0.02em]">
            {validCount} matrículas importadas
          </h2>
          <p className="mt-3 max-w-[440px] text-[15px] leading-normal text-(--color-text-muted)">
            Já aparecem em Matrículas como ativas.{" "}
            {errorCount > 0
              ? `${errorCount} linha(s) ainda com erro ficaram de fora — corrija e reenvie quando quiser.`
              : "Nenhuma linha ficou de fora — base 100% importada."}
          </p>
          <div className="mt-7 flex gap-3">
            {errorCount > 0 && (
              <Button
                variant="secondary"
                size="lg"
                iconLeft="download"
                onClick={() => toast("Baixando relatório de erros (CSV)…", "info")}
              >
                Relatório de erros
              </Button>
            )}
            <Button
              size="lg"
              iconRight="arrow-right"
              onClick={() => router.push("/painel/matriculas")}
            >
              Ver matrículas
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editIdx !== null} onOpenChange={(open) => !open && setEditIdx(null)}>
        <DialogContent className="sm:max-w-[460px]">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>Corrigir cadastro</DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px] text-(--color-text-muted)">
                Linha {(editIdx ?? 0) + 1} · {draft.aluno}
              </p>
              <div className="flex flex-col gap-4">
                <Field label="Aluno" required>
                  <Input
                    value={draft.aluno}
                    onChange={(e) => setDraft({ ...draft, aluno: e.target.value })}
                  />
                </Field>
                <Field label="Pagante (responsável financeiro)" required>
                  <Input
                    value={draft.pagante}
                    onChange={(e) => setDraft({ ...draft, pagante: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </Field>
                <Field label="CPF" required hint="Formato 000.000.000-00">
                  <Input
                    value={draft.cpf}
                    onChange={(e) => setDraft({ ...draft, cpf: e.target.value })}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                  />
                </Field>
                <Field label="Plano" required hint="Mensal · Trimestral · Semestral · Anual">
                  <Segmented
                    size="sm"
                    value={validPlans.includes(draft.plano) ? draft.plano : ""}
                    onChange={(plano) => setDraft({ ...draft, plano })}
                    options={validPlans.map((p) => ({ value: p, label: p }))}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="tertiary" onClick={() => setEditIdx(null)}>
                  Cancelar
                </Button>
                <Button iconLeft="check" onClick={saveEdit}>
                  Salvar e revalidar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

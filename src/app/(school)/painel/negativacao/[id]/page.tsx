"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel,
  CalendarX,
  BellRing,
  Clock,
  FileX,
  CheckCircle2,
  ShieldOff,
  Lock,
  FileCheck2,
  Send,
} from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionHead } from "@/components/patterns/SectionHead";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL, maskCpfDisplay } from "@/lib/format";
import type { DunningRecord } from "@/lib/mock/types";

type StepTone = "ok" | "warn" | "danger" | undefined;
type StepState = "done" | "current" | "future";

interface Step {
  label: string;
  date: string;
  icon: React.ReactNode;
  state: StepState;
  tone?: StepTone;
}

function buildSteps(record: DunningRecord): Step[] {
  const isNeg = record.status === "negativado";
  const isElig = record.status === "elegivel";
  const isAviso = record.status === "emaviso";

  const steps: Step[] = [
    { label: "Cobrança vencida", date: record.venc, icon: <CalendarX size={18} />, state: "done", tone: "warn" },
    { label: "Aviso prévio enviado", date: record.avisoEm, icon: <BellRing size={18} />, state: "done", tone: "warn" },
  ];
  if (isAviso) {
    steps.push({
      label: "Prazo legal em curso",
      date: `elegível a partir de ${record.prazoFim}`,
      icon: <Clock size={18} />,
      state: "current",
      tone: "warn",
    });
    steps.push({
      label: "Decisão de negativar",
      date: "você decide, após o prazo",
      icon: <Gavel size={18} />,
      state: "future",
      tone: "danger",
    });
  }
  if (isElig) {
    steps.push({
      label: "Elegível para negativação",
      date: `desde ${record.elegivelEm} · aguardando sua decisão`,
      icon: <Gavel size={18} />,
      state: "current",
      tone: "danger",
    });
  }
  if (isNeg) {
    steps.push({
      label: "Negativado no SPC/Serasa",
      date: record.negativadoEm ?? "",
      icon: <FileX size={18} />,
      state: "done",
      tone: "danger",
    });
  }
  steps.push({
    label: "Regularizado",
    date: "baixa automática ao pagar",
    icon: <CheckCircle2 size={18} />,
    state: "future",
    tone: "ok",
  });
  return steps;
}

const TONE_FG: Record<NonNullable<StepTone> | "default", string> = {
  ok: "var(--badge-success-fg)",
  warn: "var(--badge-warning-fg)",
  danger: "var(--badge-danger-fg)",
  default: "var(--color-primary)",
};
const TONE_BG: Record<NonNullable<StepTone> | "default", string> = {
  ok: "var(--badge-success-bg)",
  warn: "var(--badge-warning-bg)",
  danger: "var(--badge-danger-bg)",
  default: "var(--color-primary-soft)",
};

export default function NegativacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [modal, setModal] = useState<"negativar" | "optout" | null>(null);
  const { data, loading, error } = useMockResource<DunningRecord[]>("/api/mock/negativacao");
  const records = useMemo(() => data ?? [], [data]);
  const record = records.find((r) => r.id === id);

  const goToList = () => router.push("/painel/cobrancas?tab=negativacao");

  if (loading) {
    return (
      <SchoolShell title="Detalhe da negativação" onBack={goToList}>
        <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>
      </SchoolShell>
    );
  }

  if (error || !record) {
    return (
      <SchoolShell title="Detalhe da negativação" onBack={goToList}>
        <p className="py-8 text-center text-sm text-(--color-danger-primary)">
          {error ?? "Registro não encontrado."}
        </p>
      </SchoolShell>
    );
  }

  const isElig = record.status === "elegivel";
  const isAviso = record.status === "emaviso";
  const isNeg = record.status === "negativado";
  const steps = buildSteps(record);

  return (
    <SchoolShell
      title="Detalhe da negativação"
      subtitle={`${record.resp} · ${maskCpfDisplay(record.cpf)}`}
      onBack={goToList}
      maxWidth={920}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-[18px]">
          <Card className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="label mb-2">Valor atualizado</div>
                <div className="text-[36px] leading-none font-extrabold tracking-[-0.03em] text-(--badge-danger-fg)">
                  {formatBRL(record.valorAtualizado)}
                </div>
                <div className="mt-2 text-[13px] text-(--color-text-subtle)">
                  {formatBRL(record.valor)} + multa 2% + juros · {record.atraso} dias
                </div>
              </div>
              <StatusBadge status={record.status} size="md" />
            </div>
            <div className="flex flex-col border-t border-(--color-border-muted) pt-[18px]">
              {[
                ["Responsável", record.resp],
                ["CPF", maskCpfDisplay(record.cpf)],
                ["Aluno", record.aluno],
                ["Venceu em", record.venc],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-(--color-border-muted) py-2.5 text-sm"
                >
                  <span className="text-(--color-text-subtle)">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3.5 text-[13px] font-semibold text-(--color-text-muted)">Ações</div>
            {isElig && (
              <div className="mb-3.5 flex gap-2.5 rounded-(--radius-md) bg-(--badge-danger-bg) p-3.5">
                <Gavel size={18} className="mt-px shrink-0 text-(--badge-danger-fg)" />
                <span className="text-[12.5px] leading-normal text-(--badge-danger-fg)">
                  Aviso prévio cumprido. Você pode negativar agora — a decisão é sua.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {isElig && (
                <Button variant="danger" block onClick={() => setModal("negativar")}>
                  <Gavel size={16} />
                  Negativar agora
                </Button>
              )}
              {isAviso && (
                <Button variant="secondary" block disabled>
                  <Lock size={16} />
                  Negativar (aguardando prazo)
                </Button>
              )}
              {isNeg && (
                <Button
                  variant="secondary"
                  block
                  onClick={() => toast("Solicitação de baixa enviada ao SPC/Serasa", "success")}
                >
                  <FileCheck2 size={16} />
                  Solicitar baixa
                </Button>
              )}
              <Button block onClick={() => toast(`Cobrança reenviada para ${record.resp}`, "success")}>
                <Send size={16} />
                Reenviar cobrança
              </Button>
              {!isNeg && (
                <Button
                  variant="tertiary"
                  block
                  className="text-(--color-danger-primary)"
                  onClick={() => setModal("optout")}
                >
                  <ShieldOff size={16} />
                  Não negativar (opt-out)
                </Button>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <SectionHead title="Linha do tempo" sub="Cada etapa fica registrada como prova" />
          <div className="relative mt-1">
            {steps.map((s, idx) => {
              const done = s.state === "done";
              const current = s.state === "current";
              const future = s.state === "future";
              const fg = TONE_FG[s.tone ?? "default"];
              const bg = TONE_BG[s.tone ?? "default"];
              return (
                <div
                  key={idx}
                  className="relative flex gap-4"
                  style={{ paddingBottom: idx < steps.length - 1 ? 26 : 0 }}
                >
                  {idx < steps.length - 1 && (
                    <div
                      className="absolute top-9 bottom-0 left-[17px] w-0.5"
                      style={{
                        background: done ? "var(--color-primary-soft)" : "var(--color-border)",
                        opacity: future ? 0.6 : 1,
                      }}
                    />
                  )}
                  <div
                    className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      opacity: future ? 0.55 : 1,
                      background: done || current ? bg : "var(--color-surface)",
                      border: future
                        ? "1.5px dashed var(--color-border-strong)"
                        : current
                          ? `2px solid ${fg}`
                          : "none",
                      color: done || current ? fg : "var(--color-text-subtle)",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div className="pt-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[14.5px] font-semibold"
                        style={{ color: done || current ? "var(--color-text)" : "var(--color-text-subtle)" }}
                      >
                        {s.label}
                      </span>
                      {current && (
                        <span
                          className="rounded-full px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.06em] uppercase"
                          style={{ color: fg, background: bg }}
                        >
                          Agora
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] text-(--color-text-subtle)">{s.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Dialog open={modal === "negativar"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--badge-danger-bg)">
            <Gavel size={22} className="text-(--badge-danger-fg)" />
          </div>
          <DialogHeader>
            <DialogTitle>Negativar {record.resp}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-normal text-(--color-text-muted)">
            O nome será registrado no SPC/Serasa pelo débito de{" "}
            <strong className="text-(--color-text)">{formatBRL(record.valorAtualizado)}</strong>. Aviso
            prévio enviado em {record.avisoEm} — prazo legal de{" "}
            <strong className="text-(--color-text)">10 dias (CDC art. 43)</strong> já cumprido.
          </p>
          <div className="flex gap-2.5 rounded-(--radius-md) bg-(--badge-success-bg) p-3">
            <CheckCircle2 size={17} className="shrink-0 text-(--badge-success-fg)" />
            <span className="text-[12.5px] leading-normal text-(--badge-success-fg)">
              Permitido por lei. A baixa é automática se o responsável pagar.
            </span>
          </div>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setModal(null);
                toast(`${record.resp} negativado no SPC/Serasa`, "success");
                goToList();
              }}
            >
              <Gavel size={16} />
              Confirmar negativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "optout"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--color-danger-soft)">
            <ShieldOff size={22} className="text-(--color-danger-primary)" />
          </div>
          <DialogHeader>
            <DialogTitle>Não negativar este responsável?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-normal text-(--color-text-muted)">
            {record.resp} sai da régua de negativação permanentemente. A dívida segue ativa, mas sem
            registro no SPC/Serasa.
          </p>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setModal(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setModal(null);
                toast("Responsável removido da negativação", "success");
                goToList();
              }}
            >
              Confirmar opt-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

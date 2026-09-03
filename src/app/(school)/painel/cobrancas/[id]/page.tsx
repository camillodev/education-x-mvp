"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  XCircle,
  Gavel,
  FilePlus,
  Send,
  CheckCircle2,
  Receipt,
  CalendarX,
  BellRing,
  MessageSquareWarning,
  Search,
  Clock,
  Bell,
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
import { QrCode } from "@/components/patterns/QrCode";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { Invoice } from "@/lib/mock/types";

interface CobrancasResponse {
  invoices: Invoice[];
}

interface CopyRowProps {
  label: string;
  value: string;
}

function CopyRow({ label, value }: CopyRowProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    toast("Copiado para a área de transferência", "info");
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex items-center gap-2.5 rounded-(--radius-md) border border-(--color-border-input) bg-(--color-surface) px-3.5 py-[11px]">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[11.5px] font-semibold text-(--color-text-subtle)">{label}</div>
        <div className="truncate font-mono text-[13.5px] font-medium text-(--color-text)">{value}</div>
      </div>
      <Button variant="secondary" size="sm" iconLeft={copied ? "check" : "copy"} onClick={copy}>
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

type HistoryTone = "ok" | "warn" | "danger" | undefined;
type HistoryState = "done" | "current" | "scheduled";

interface HistoryEvent {
  label: string;
  date: string;
  icon: React.ReactNode;
  state: HistoryState;
  tone?: HistoryTone;
}

/** dd/mm/yyyy + delta de dias, com rollover correto de mês/ano. */
function addDaysBR(dateBR: string, days: number): string {
  const [dd, mm, yyyy] = dateBR.split("/").map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function buildHistory(invoice: Invoice): HistoryEvent[] {
  const [, mm, yyyy] = invoice.venc.split("/");
  const emit = `01/${mm}/${yyyy}`;
  const hist: HistoryEvent[] = [
    { label: "Cobrança emitida", date: `${emit} · 08:00`, icon: <FilePlus size={16} />, state: "done" },
    { label: "Enviada (WhatsApp · e-mail · SMS)", date: `${emit} · 08:01`, icon: <Send size={16} />, state: "done" },
  ];
  if (invoice.status === "paga") {
    hist.push({ label: "Pagamento confirmado", date: invoice.pagoEm ?? "", icon: <CheckCircle2 size={16} />, state: "done", tone: "ok" });
    hist.push({ label: "Nota fiscal emitida", date: invoice.pagoEm ?? "", icon: <Receipt size={16} />, state: "done", tone: "ok" });
  } else if (invoice.status === "vencida") {
    hist.push({ label: "Cobrança vencida", date: invoice.venc, icon: <CalendarX size={16} />, state: "done", tone: "warn" });
    hist.push({ label: "Aviso de atraso enviado", date: addDaysBR(invoice.venc, 1), icon: <BellRing size={16} />, state: "done", tone: "warn" });
    hist.push({ label: "Reenvio de cobrança agendado", date: "02/06/2026", icon: <Send size={16} />, state: "scheduled" });
    hist.push({ label: "Elegível p/ negativação", date: `a partir de ${addDaysBR(invoice.venc, 15)}`, icon: <Gavel size={16} />, state: "scheduled", tone: "danger" });
  } else if (invoice.status === "contestacao") {
    hist.push({ label: "Contestação aberta pelo responsável", date: "12/05/2026", icon: <MessageSquareWarning size={16} />, state: "done", tone: "warn" });
    hist.push({ label: "Em análise", date: "aguardando resposta", icon: <Search size={16} />, state: "current", tone: "warn" });
  } else {
    hist.push({ label: "Aguardando pagamento", date: `vence em ${invoice.venc}`, icon: <Clock size={16} />, state: "current" });
    hist.push({ label: "Lembrete agendado", date: `${addDaysBR(invoice.venc, -3)} · 3 dias antes`, icon: <Bell size={16} />, state: "scheduled" });
  }
  return hist;
}

const TONE_FG: Record<NonNullable<HistoryTone> | "default", string> = {
  ok: "var(--badge-success-fg)",
  warn: "var(--badge-warning-fg)",
  danger: "var(--badge-danger-fg)",
  default: "var(--color-primary)",
};
const TONE_BG: Record<NonNullable<HistoryTone> | "default", string> = {
  ok: "var(--badge-success-bg)",
  warn: "var(--badge-warning-bg)",
  danger: "var(--badge-danger-bg)",
  default: "var(--color-primary-soft)",
};

export default function CobrancaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const { data, loading, error } = useMockResource<CobrancasResponse>("/api/mock/cobrancas");
  const invoices = useMemo(() => data?.invoices ?? [], [data]);
  const invoice = invoices.find((c) => c.id === id);

  if (loading) {
    return (
      <SchoolShell title="Detalhe da cobrança" onBack={() => router.push("/painel/cobrancas")}>
        <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>
      </SchoolShell>
    );
  }

  if (error || !invoice) {
    return (
      <SchoolShell title="Detalhe da cobrança" onBack={() => router.push("/painel/cobrancas")}>
        <p className="py-8 text-center text-sm text-(--color-danger-primary)">
          {error ?? "Cobrança não encontrada."}
        </p>
      </SchoolShell>
    );
  }

  const vencida = invoice.status === "vencida";
  const paga = invoice.status === "paga";
  const hist = buildHistory(invoice);
  const total = vencida ? invoice.valor + 4200 : invoice.valor;

  return (
    <SchoolShell
      title="Detalhe da cobrança"
      subtitle={`#${invoice.id.replace("cob_", "")} · ${invoice.desc}`}
      onBack={() => router.push("/painel/cobrancas")}
      maxWidth={960}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-[18px]">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="label mb-2">Valor {vencida ? "atualizado" : ""}</div>
                <div
                  className="text-[40px] leading-none font-extrabold tracking-[-0.03em]"
                  style={{ color: vencida ? "var(--badge-danger-fg)" : "var(--color-text)" }}
                >
                  {formatBRL(total)}
                </div>
                {vencida && (
                  <div className="mt-2 text-[13px] text-(--color-text-subtle)">
                    {formatBRL(invoice.valor)} + multa 2% + juros ·{" "}
                    <strong className="text-(--badge-danger-fg)">{invoice.atraso} dias em atraso</strong>
                  </div>
                )}
              </div>
              <StatusBadge status={invoice.status} size="md" />
            </div>
            <div className="mt-5 flex gap-5 border-t border-(--color-border-muted) pt-[18px]">
              {[
                ["Responsável", invoice.resp],
                ["Aluno", invoice.aluno],
                ["Vencimento", invoice.venc],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="mb-[3px] text-xs text-(--color-text-subtle)">{k}</div>
                  <div className="text-sm font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <SectionHead title="Pagamento" sub="Boleto, linha digitável e PIX" />
            <div className="flex gap-5">
              <div className="flex flex-1 flex-col gap-3">
                <Button
                  variant="secondary"
                  block
                  onClick={() => toast("Abrindo boleto em PDF…", "info")}
                >
                  Ver boleto (PDF)
                </Button>
                <CopyRow
                  label="Linha digitável"
                  value="34191.79001 01043.510047 91020.150008 1 98770000045000"
                />
                <CopyRow
                  label="PIX copia-e-cola"
                  value="00020126580014br.gov.bcb.pix0136a1f3c2…5204000053039865802BR"
                />
              </div>
              <div className="shrink-0 text-center">
                <QrCode size={132} />
                <div className="mt-1.5 text-[11.5px] text-(--color-text-subtle)">Aponte a câmera</div>
              </div>
            </div>
          </Card>

          {paga && (
            <Card className="p-6">
              <SectionHead
                title="Nota fiscal"
                sub={`NFS-e nº 0000${invoice.id.replace("cob_", "")} · emitida em ${invoice.pagoEm}`}
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  iconLeft="download"
                  onClick={() => toast("Baixando NFS-e (PDF)…", "info")}
                >
                  Baixar PDF
                </Button>
                <Button
                  variant="secondary"
                  iconLeft="file-code-2"
                  onClick={() => toast("Baixando NFS-e (XML)…", "info")}
                >
                  Baixar XML
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          <Card className="p-6">
            <SectionHead title="Histórico" sub="Status até agora e próximos passos confirmados" />
            <div className="relative">
              {hist.map((h, i) => {
                const done = h.state === "done";
                const current = h.state === "current";
                const scheduled = h.state === "scheduled";
                const fg = TONE_FG[h.tone ?? "default"];
                const bg = TONE_BG[h.tone ?? "default"];
                return (
                  <div key={i} className="relative flex gap-3.5" style={{ paddingBottom: i < hist.length - 1 ? 22 : 0 }}>
                    {i < hist.length - 1 && (
                      <div
                        className="absolute top-[30px] bottom-0 left-[15px] w-0.5"
                        style={{
                          background: done ? "var(--color-primary-soft)" : "var(--color-border)",
                          opacity: scheduled ? 0.6 : 1,
                        }}
                      />
                    )}
                    <div
                      className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: done || current ? bg : "var(--color-surface)",
                        border: scheduled
                          ? "1.5px dashed var(--color-border-strong)"
                          : current
                            ? `1.5px solid ${fg}`
                            : "none",
                        color: done || current ? fg : "var(--color-text-subtle)",
                        opacity: scheduled ? 0.85 : 1,
                      }}
                    >
                      {h.icon}
                    </div>
                    <div className="pt-[5px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: done || current ? "var(--color-text)" : "var(--color-text-subtle)" }}
                        >
                          {h.label}
                        </span>
                        {scheduled && (
                          <span className="rounded-full border border-(--color-border) bg-(--color-surface) px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-(--color-text-subtle) uppercase">
                            Agendado
                          </span>
                        )}
                        {current && (
                          <span
                            className="rounded-full px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.06em] uppercase"
                            style={{ color: fg, background: bg }}
                          >
                            Agora
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-(--color-text-subtle)">{h.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {!paga && (
            <Card className="p-5">
              <div className="mb-3.5 text-[13px] font-semibold text-(--color-text-muted)">Ações</div>
              <div className="flex flex-col gap-2.5">
                <Button
                  block
                  onClick={() =>
                    toast(`Cobrança reenviada para ${invoice.resp} (WhatsApp · e-mail · SMS)`, "success")
                  }
                >
                  Reenviar cobrança
                </Button>
                <Button
                  variant="tertiary"
                  block
                  className="text-(--color-danger-primary)"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar cobrança
                </Button>
              </div>
              {vencida && (
                <div className="mt-4 flex gap-2.5 rounded-(--radius-md) bg-(--badge-warning-bg) p-3.5">
                  <Gavel size={18} className="mt-px shrink-0 text-(--badge-warning-fg)" />
                  <div className="text-[12.5px] leading-normal text-(--badge-warning-fg)">
                    Atraso elegível para negativação após aviso prévio.{" "}
                    <button
                      onClick={() => router.push("/painel/cobrancas?tab=negativacao")}
                      className="cursor-pointer border-none bg-transparent p-0 font-bold text-(--badge-warning-fg) underline"
                    >
                      Ver negativação
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--color-danger-soft)">
            <XCircle size={22} className="text-(--color-danger-primary)" />
          </div>
          <DialogHeader>
            <DialogTitle>Cancelar cobrança?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-normal text-(--color-text-muted)">
            A cobrança de {invoice.resp} no valor de {formatBRL(invoice.valor)} será cancelada. O
            responsável é avisado automaticamente.
          </p>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setCancelOpen(false);
                toast("Cobrança cancelada", "error");
                router.push("/painel/cobrancas");
              }}
            >
              Cancelar cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

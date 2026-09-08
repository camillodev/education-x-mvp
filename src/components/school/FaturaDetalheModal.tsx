"use client";

import { useEffect, useState } from "react";
import { Copy, Check, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QrCode } from "@/components/patterns/QrCode";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/format";
import type { PlatformInvoice } from "@/lib/mock/types";

interface FaturaDetalheModalProps {
  fatura: PlatformInvoice | null;
  onClose: () => void;
}

export function FaturaDetalheModal({ fatura, onClose }: FaturaDetalheModalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"detalhe" | "pix">("detalhe");
  const [copied, setCopied] = useState(false);

  // Cada fatura reabre no detalhamento, nunca no PIX da anterior.
  useEffect(() => {
    if (fatura) setView("detalhe");
  }, [fatura]);

  if (!fatura) return null;

  const total = fatura.itens.reduce((s, i) => s + i.val, 0);
  const aberto = fatura.status === "aberto";

  return (
    <Dialog open={Boolean(fatura)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <div className="mb-[18px] flex items-start justify-between">
          <div>
            <div className="eyebrow mb-1.5">Fatura Education X</div>
            <h3 className="m-0 text-xl font-bold">{fatura.mes}</h3>
            <div className="mt-[3px] text-[13px] text-(--color-text-subtle)">
              {aberto ? `Vence em ${fatura.venc}` : "Paga"}
            </div>
          </div>
          {aberto ? (
            <Badge variant="warning" dot>
              Em aberto
            </Badge>
          ) : (
            <Badge variant="success" dot>
              Paga
            </Badge>
          )}
        </div>

        <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
          {fatura.itens.map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 border-b border-(--color-border-muted) px-4 py-3"
            >
              <div>
                <div className="text-[13.5px] font-semibold">{item.desc}</div>
                {item.detalhe && (
                  <div className="mt-0.5 text-xs text-(--color-text-subtle)">{item.detalhe}</div>
                )}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{formatBRL(item.val)}</span>
            </div>
          ))}
          <div className="flex justify-between bg-(--color-primary-softer) px-4 py-3">
            <span className="text-[14.5px] font-bold">Total</span>
            <span className="text-base font-extrabold text-(--color-primary)">
              {formatBRL(total)}
            </span>
          </div>
        </div>

        {!aberto && (
          <Button
            block
            variant="secondary"
            iconLeft="download"
            onClick={() => toast("Baixando fatura (PDF)…", "info")}
          >
            Baixar PDF
          </Button>
        )}

        {aberto && view === "detalhe" && (
          <div className="flex flex-col gap-2.5">
            <Button block iconLeft="qr-code" onClick={() => setView("pix")}>
              Pagar com PIX
            </Button>
            <Button
              block
              variant="secondary"
              iconLeft="credit-card"
              onClick={() => {
                onClose();
                toast("Pagamento no cartão •••• 8842 confirmado", "success");
              }}
            >
              Pagar com cartão •••• 8842
            </Button>
          </div>
        )}

        {aberto && view === "pix" && (
          <div className="flex flex-col items-center text-center">
            <div className="text-[26px] font-extrabold tracking-[-0.02em]">{formatBRL(total)}</div>
            <div className="mt-1 mb-[18px] text-[13px] text-(--color-text-subtle)">
              {fatura.mes} · fatura Education X
            </div>
            <QrCode size={172} />
            <div className="my-3.5 text-[13px] text-(--color-text-subtle)">
              Abra o app do banco e escaneie
            </div>
            <button
              type="button"
              onClick={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className={`flex h-12 w-full cursor-pointer items-center justify-center gap-[9px] rounded-(--radius-md) border-[1.5px] border-(--color-primary) text-[15px] font-semibold text-(--color-primary) ${
                copied ? "bg-(--color-primary-softer)" : "bg-(--color-bg)"
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </button>
            <Button
              block
              size="lg"
              className="mt-2.5"
              onClick={() => {
                onClose();
                toast("Pagamento confirmado — fatura quitada", "success");
              }}
            >
              <CheckCircle size={16} />
              Já paguei
            </Button>
            <button
              type="button"
              onClick={() => setView("detalhe")}
              className="mt-2.5 cursor-pointer border-none bg-transparent text-[13px] text-(--color-text-subtle)"
            >
              Voltar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

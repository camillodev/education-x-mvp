"use client";

import { FileText, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  /** O que está sendo exportado, usado na mensagem ("relatório", "extrato"). */
  what?: string;
}

const FORMATS = [
  { label: "PDF", Icon: FileText, desc: "Pronto para imprimir" },
  { label: "CSV", Icon: FileSpreadsheet, desc: "Abre no Excel / Sheets" },
];

/** Ponto único de exportação — escolhe o formato do arquivo. */
export function ExportModal({ open, onClose, what = "relatório" }: ExportModalProps) {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Exportar {what}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-(--color-text-muted)">Escolha o formato do arquivo.</p>
        <div className="grid grid-cols-2 gap-3">
          {FORMATS.map(({ label, Icon, desc }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClose();
                toast(`Exportando ${what} em ${label}…`, "info");
              }}
              className="flex cursor-pointer flex-col items-center gap-[9px] rounded-(--radius-md) border-[1.5px] border-(--color-border-input) bg-(--color-bg) px-4 py-[22px] transition-colors hover:border-(--color-primary)"
            >
              <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--color-primary-soft)">
                <Icon size={22} className="text-(--color-primary)" />
              </span>
              <span className="text-base font-bold text-(--color-text)">{label}</span>
              <span className="text-[12.5px] text-(--color-text-subtle)">{desc}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Bell, BellRing, AlertTriangle, Trash2, Plus, MessageCircle, Mail, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHead } from "@/components/patterns/SectionHead";
import { useToast } from "@/components/ui/toast";
import type { NotificationChannel } from "@/lib/mock/types";

export type ReguaQuando = "antes" | "dia" | "depois";
export type CanalId = "whatsapp" | "email" | "sms";

export interface ReguaStep {
  id: string;
  quando: ReguaQuando;
  /** Dias de distância do vencimento (0 quando `quando` é "dia"). */
  dias: number;
  canais: CanalId[];
}

const CHANNEL_ICON: Record<string, typeof Mail> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
};

const TONE: Record<ReguaQuando, { bg: string; fg: string; Icon: typeof Bell; sub: string }> = {
  antes: { bg: "var(--color-primary-soft)", fg: "var(--color-primary-hover)", Icon: Bell, sub: "antes do vencimento" },
  dia: { bg: "var(--badge-warning-bg)", fg: "var(--badge-warning-fg)", Icon: BellRing, sub: "no dia" },
  depois: { bg: "var(--badge-danger-bg)", fg: "var(--badge-danger-fg)", Icon: AlertTriangle, sub: "após o vencimento" },
};

/** Rótulo humano da etapa a partir de quando/dias. */
export function stepLabel(step: ReguaStep): string {
  if (step.quando === "dia") return "No dia do vencimento";
  const plural = step.dias === 1 ? "dia" : "dias";
  return step.quando === "antes"
    ? `${step.dias} ${plural} antes`
    : `${step.dias} ${plural} depois`;
}

const DEFAULT_STEPS: ReguaStep[] = [
  { id: "s1", quando: "antes", dias: 3, canais: ["whatsapp", "email"] },
  { id: "s2", quando: "dia", dias: 0, canais: ["whatsapp"] },
  { id: "s3", quando: "depois", dias: 3, canais: ["whatsapp", "email", "sms"] },
];

interface ReguaAvisosProps {
  channels: NotificationChannel[];
}

export function ReguaAvisos({ channels }: ReguaAvisosProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ReguaStep[]>(DEFAULT_STEPS);

  const patch = (id: string, next: Partial<ReguaStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const toggleCanal = (id: string, canal: CanalId) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              canais: s.canais.includes(canal)
                ? s.canais.filter((c) => c !== canal)
                : [...s.canais, canal],
            }
          : s
      )
    );

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { id: `s${Date.now()}`, quando: "depois", dias: 7, canais: ["whatsapp"] },
    ]);

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="flex flex-col gap-[18px]">
      <Card className="flex items-center gap-3 border border-(--color-primary-soft) bg-(--color-toast-info-bg) p-4">
        <Bell size={18} className="shrink-0 text-(--color-primary)" />
        <span className="text-[13.5px] leading-normal text-(--color-text-muted)">
          Defina quando e por onde avisar o responsável sobre cada cobrança. O{" "}
          <strong className="text-(--color-text)">aviso prévio de negativação</strong> é obrigatório
          por lei (CDC) e enviado à parte — não depende desta régua.
        </span>
      </Card>

      <Card className="p-6">
        <SectionHead
          title="Régua de avisos"
          sub="Vale para todas as cobranças da unidade"
          action={
            <Button variant="secondary" size="sm" onClick={addStep}>
              <Plus size={15} />
              Adicionar etapa
            </Button>
          }
        />

        <div className="flex flex-col gap-2.5">
          {steps.map((step) => {
            const tone = TONE[step.quando];
            const ToneIcon = tone.Icon;
            return (
              <div
                key={step.id}
                className="flex flex-wrap items-center gap-4 rounded-(--radius-md) border border-(--color-border) bg-(--color-bg) px-4 py-3.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  <ToneIcon size={19} />
                </span>

                <div className="min-w-[150px] shrink-0">
                  <div className="text-[14.5px] font-semibold">{stepLabel(step)}</div>
                  <div className="text-[12.5px] text-(--color-text-subtle)">{tone.sub}</div>
                </div>

                {step.quando !== "dia" && (
                  <Input
                    className="w-[92px]"
                    value={String(step.dias)}
                    onChange={(e) =>
                      patch(step.id, { dias: Number(e.target.value.replace(/\D/g, "")) || 0 })
                    }
                    inputMode="numeric"
                    aria-label={`Dias — ${stepLabel(step)}`}
                    trailing={
                      <span className="text-[12.5px] font-semibold text-(--color-text-muted)">d</span>
                    }
                  />
                )}

                <div className="flex flex-1 flex-wrap gap-2">
                  {channels.map((c) => {
                    const on = step.canais.includes(c.id as CanalId);
                    const ChannelIcon = CHANNEL_ICON[c.id] ?? Mail;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggleCanal(step.id, c.id as CanalId)}
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-[11px] text-[12.5px] font-semibold transition-all ${
                          on
                            ? "border-(--color-primary) bg-(--color-primary) text-white"
                            : "border-(--color-border-input) bg-(--color-bg) text-(--color-text-subtle)"
                        }`}
                      >
                        <ChannelIcon size={13} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    aria-label={`Remover etapa ${stepLabel(step)}`}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-(--color-text-subtle) hover:text-(--color-danger-primary)"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-[18px] flex justify-end">
          <Button iconLeft="check" onClick={() => toast("Régua de avisos salva", "success")}>
            Salvar régua
          </Button>
        </div>
      </Card>
    </div>
  );
}

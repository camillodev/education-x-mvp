"use client";

import { useMemo, useState } from "react";
import { Wallet, Building, Zap, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { Receivable, SchoolBalance } from "@/lib/mock/types";

/** Taxa de antecipação Education X: 1,99% a.m., proporcional aos dias até liberar. */
const TAXA_MES = 0.0199;

/** Taxa de um recebível, em centavos (pro-rata por dias). */
export function anticipationFeeCents(receivable: Receivable): number {
  return Math.round(receivable.bruto * TAXA_MES * (receivable.dias / 30));
}

interface FinanceiroResponse {
  saldo: SchoolBalance;
  recebiveis: Receivable[];
}

export function FinanceiroBody() {
  const { toast } = useToast();
  const [saqueOpen, setSaqueOpen] = useState(false);
  const [antecipOpen, setAntecipOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<string[] | null>(null);

  const { data, loading, error } = useMockResource<FinanceiroResponse>("/api/mock/financeiro");
  const saldo = data?.saldo;
  const recebiveis = useMemo(() => data?.recebiveis ?? [], [data]);

  // Default: todos marcados. `null` = ainda não interagiu, segue o default.
  const sel = selecionados ?? recebiveis.map((r) => r.id);
  // Updater funcional: cliques em sequência rápida não perdem atualização.
  const toggleSel = (id: string) =>
    setSelecionados((prev) => {
      const base = prev ?? recebiveis.map((r) => r.id);
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });

  const escolhidos = recebiveis.filter((r) => sel.includes(r.id));
  const brutoTotal = escolhidos.reduce((s, r) => s + r.bruto, 0);
  const taxaTotal = escolhidos.reduce((s, r) => s + anticipationFeeCents(r), 0);
  const liquido = brutoTotal - taxaTotal;

  if (loading) {
    return (
      <Card className="mb-[18px] p-6">
        <p className="text-sm text-(--color-text-subtle)">Carregando saldo…</p>
      </Card>
    );
  }

  if (error || !saldo) {
    return (
      <Card className="mb-[18px] p-6">
        <p className="text-sm text-(--color-danger-primary)">
          {error ?? "Não foi possível carregar o saldo."}
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-[18px] bg-(--color-primary) p-[26px] text-white">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-[12.5px] font-semibold tracking-[0.1em] uppercase opacity-85">
              Saldo atual
            </div>
            <div className="mt-2 text-[44px] leading-none font-extrabold tracking-[-0.02em]">
              {formatBRL(saldo.disponivel)}
            </div>
          </div>
          <Wallet size={28} className="opacity-90" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="lg"
            iconLeft="arrow-up-right"
            onClick={() => setSaqueOpen(true)}
            className="bg-white text-(--color-primary) hover:bg-white/90"
          >
            Transferir para banco
          </Button>
          <Button
            size="lg"
            iconLeft="zap"
            onClick={() => setAntecipOpen(true)}
            className="border-[1.5px] border-white/55 bg-transparent text-white shadow-none hover:bg-white/10"
          >
            Antecipar recebíveis
          </Button>
        </div>
      </Card>

      <Dialog open={saqueOpen} onOpenChange={setSaqueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar saldo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-(--color-text-muted)">
            Transferência via PIX para a conta cadastrada da escola.
          </p>
          <Field label="Valor do saque">
            <Input
              defaultValue={(saldo.disponivel / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
              inputMode="decimal"
            />
          </Field>
          <div className="flex items-center gap-[11px] rounded-(--radius-md) bg-(--color-surface) px-3.5 py-3">
            <Building size={18} className="text-(--color-text-subtle)" />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold">Banco Inter · Ag 0001</div>
              <div className="text-[12.5px] text-(--color-text-subtle)">
                Conta ****-5521 · CNPJ Kumon Camargos
              </div>
            </div>
            <Badge variant="success" size="sm" dot>
              PIX na hora
            </Badge>
          </div>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setSaqueOpen(false)}>
              Cancelar
            </Button>
            <Button
              iconLeft="arrow-up-right"
              onClick={() => {
                setSaqueOpen(false);
                toast(`${formatBRL(saldo.disponivel)} resgatado via PIX`, "success");
              }}
            >
              Confirmar resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={antecipOpen} onOpenChange={setAntecipOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-[11px]">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-(--color-primary-soft) text-(--color-primary)">
                <Zap size={20} />
              </span>
              <DialogTitle>Antecipar recebíveis</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-[13.5px] leading-normal text-(--color-text-muted)">
            Receba hoje o que está preso no cartão. A taxa de antecipação Education X (1,99%
            a.m.) incide proporcional aos dias até a liberação.
          </p>

          <div className="flex flex-col gap-2">
            {recebiveis.map((r) => {
              const on = sel.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleSel(r.id)}
                  aria-pressed={on}
                  className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border-[1.5px] px-3.5 py-3 text-left ${
                    on
                      ? "border-(--color-primary) bg-(--color-primary-softer)"
                      : "border-(--color-border-input) bg-(--color-bg)"
                  }`}
                >
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] ${
                      on
                        ? "border-(--color-primary) bg-(--color-primary)"
                        : "border-(--color-border-input) bg-transparent"
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} className="text-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">{r.desc}</div>
                    <div className="text-xs text-(--color-text-subtle)">
                      Libera em {r.liberaEm} · {r.dias} dias · taxa {formatBRL(anticipationFeeCents(r))}
                    </div>
                  </div>
                  <span className="text-[14.5px] font-bold">{formatBRL(r.bruto)}</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
            {(
              [
                ["Valor bruto selecionado", formatBRL(brutoTotal), false],
                ["Taxa de antecipação (Education X)", `− ${formatBRL(taxaTotal)}`, false],
                ["Você recebe hoje", formatBRL(liquido), true],
              ] as const
            ).map(([label, value, highlight]) => (
              <div
                key={label}
                className={`flex justify-between px-4 py-[11px] ${
                  highlight
                    ? "border-t border-(--color-border) bg-(--color-primary-softer) text-[15px]"
                    : "bg-(--color-bg) text-[13.5px]"
                }`}
              >
                <span
                  className={
                    highlight ? "font-bold text-(--color-text)" : "text-(--color-text-subtle)"
                  }
                >
                  {label}
                </span>
                <span
                  className={
                    highlight ? "font-extrabold text-(--color-primary)" : "font-semibold"
                  }
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="tertiary" onClick={() => setAntecipOpen(false)}>
              Cancelar
            </Button>
            <Button
              iconLeft="zap"
              disabled={escolhidos.length === 0}
              onClick={() => {
                setAntecipOpen(false);
                toast(`${formatBRL(liquido)} antecipados — disponíveis para saque`, "success");
              }}
            >
              Antecipar {formatBRL(liquido)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

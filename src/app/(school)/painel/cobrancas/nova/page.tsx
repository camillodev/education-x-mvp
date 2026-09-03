"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { SectionHead } from "@/components/patterns/SectionHead";
import { Person } from "@/components/patterns/Person";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import { computeDiscountedCents, parsePtBrNumber, type DiscountType } from "@/lib/pricing";
import type { Enrollment } from "@/lib/mock/types";

type DiscountMode = "none" | "PERCENT" | "FIXED";

const DISCOUNT_OPTIONS: SegmentedOption<DiscountMode>[] = [
  { value: "none", label: "Nenhum" },
  { value: "PERCENT", label: "%" },
  { value: "FIXED", label: "R$" },
];

export default function NovaCobrancaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [guardian, setGuardian] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountValue, setDiscountValue] = useState("0");

  const { data } = useMockResource<Enrollment[]>("/api/mock/matriculas");
  const enrollments = useMemo(() => data ?? [], [data]);

  // Responsáveis únicos das matrículas ativas (fonte real do mock, não lista fixa).
  const guardians = useMemo(() => {
    const names = enrollments.filter((e) => e.status === "ativa").map((e) => e.pagante);
    return Array.from(new Set(names));
  }, [enrollments]);

  const candidates = search
    ? guardians.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : [];

  const baseCents = Math.round(parsePtBrNumber(valor) * 100);
  const { discountCents, finalCents } =
    discountMode === "none"
      ? { discountCents: 0, finalCents: baseCents }
      : computeDiscountedCents(baseCents, discountMode as DiscountType, discountValue);

  const canSubmit = Boolean(guardian) && baseCents > 0 && desc.trim().length > 0;

  return (
    <SchoolShell
      title="Nova cobrança extra"
      subtitle="Multa, taxa avulsa ou item fora da mensalidade"
      onBack={() => router.push("/painel/cobrancas")}
      maxWidth={760}
    >
      <div className="flex flex-col gap-[18px]">
        <Card className="p-6">
          <SectionHead title="Responsável" sub="Busque por nome" />
          {guardian ? (
            <div className="flex items-center justify-between rounded-(--radius-md) border border-(--color-primary-soft) bg-(--color-primary-softer) p-3.5">
              <Person name={guardian} sub="Responsável financeiro" />
              <Button variant="tertiary" size="sm" onClick={() => setGuardian(null)}>
                <X size={16} />
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex.: Maria Silva"
                leadingIcon={<Search size={16} />}
              />
              {search && (
                <div className="mt-2.5 overflow-hidden rounded-(--radius-md) border border-(--color-border)">
                  {candidates.length > 0 ? (
                    candidates.map((name, i) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setGuardian(name);
                          setSearch("");
                        }}
                        className={`flex w-full cursor-pointer items-center gap-[11px] bg-(--color-bg) px-3.5 py-[11px] text-left hover:bg-(--color-surface) ${
                          i < candidates.length - 1 ? "border-b border-(--color-border-muted)" : ""
                        }`}
                      >
                        <Person name={name} />
                      </button>
                    ))
                  ) : (
                    <div className="p-3.5 text-[13.5px] text-(--color-text-subtle)">
                      Nenhum responsável encontrado.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="p-6">
          <SectionHead title="Cobrança" />
          <div className="flex flex-col gap-4">
            <Field label="Descrição" required>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex.: Multa de cancelamento"
              />
            </Field>
            <Field label="Valor" required>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder="250,00"
                trailing={<span className="text-[13px] text-(--color-text-subtle)">BRL</span>}
              />
            </Field>
            <Field label="Desconto (opcional)">
              <div className="flex items-center gap-2.5">
                <Segmented
                  options={DISCOUNT_OPTIONS}
                  value={discountMode}
                  onChange={setDiscountMode}
                />
                {discountMode !== "none" && (
                  <Input
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    inputMode="decimal"
                    className="flex-1"
                    placeholder={discountMode === "PERCENT" ? "10" : "50,00"}
                  />
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card className="flex items-center justify-between bg-(--color-primary) p-5 text-white">
          <div>
            <div className="text-[13px] font-semibold opacity-85">Total da cobrança</div>
            {discountCents > 0 && (
              <div className="mt-0.5 text-[12.5px] opacity-80">
                {formatBRL(baseCents)} − {formatBRL(discountCents)} desconto
              </div>
            )}
          </div>
          <div className="text-[32px] font-extrabold tracking-[-0.02em]">
            {formatBRL(finalCents)}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="tertiary" onClick={() => router.push("/painel/cobrancas")}>
            Cancelar
          </Button>
          <Button
            size="lg"
            iconRight="arrow-right"
            disabled={!canSubmit}
            onClick={() => {
              toast(`Cobrança de ${formatBRL(finalCents)} gerada para ${guardian}`, "success");
              router.push("/painel/cobrancas");
            }}
          >
            Gerar cobrança
          </Button>
        </div>
      </div>
    </SchoolShell>
  );
}

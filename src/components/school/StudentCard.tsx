"use client";

import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Segmented } from "@/components/ui/segmented";
import { SubjectChips } from "@/components/school/SubjectChips";
import { formatBRL } from "@/lib/format";
import { computeDiscountedCents, type DiscountType } from "@/lib/pricing";
import type { EnrollmentPlan, SubjectId } from "@/lib/mock/types";

/** Um aluno em edição, dentro do form de matrícula. */
export interface StudentDraft {
  aluno: string;
  nascimento: string;
  materias: SubjectId[];
  plano: string;
  desconto: boolean;
  descontoTipo: DiscountType;
  descontoVal: string;
}

export function emptyStudent(): StudentDraft {
  return {
    aluno: "",
    nascimento: "",
    materias: ["matematica"],
    plano: "Mensal",
    desconto: false,
    descontoTipo: "PERCENT",
    descontoVal: "0",
  };
}

/** Plano do aluno (fallback no primeiro da lista). */
export function planOf(student: StudentDraft, plans: EnrollmentPlan[]): EnrollmentPlan | undefined {
  return plans.find((p) => p.nome === student.plano) ?? plans[0];
}

/** Mensalidade do aluno já com desconto, em centavos. */
export function monthlyOf(student: StudentDraft, plans: EnrollmentPlan[]): number {
  const plan = planOf(student, plans);
  if (!plan) return 0;
  if (!student.desconto) return plan.parcela;
  return computeDiscountedCents(plan.parcela, student.descontoTipo, student.descontoVal).finalCents;
}

interface StudentCardProps {
  index: number;
  student: StudentDraft;
  plans: EnrollmentPlan[];
  onChange: (patch: Partial<StudentDraft>) => void;
  onRemove?: () => void;
  /** Oculta plano e desconto (C6 escolhe o plano uma vez, global). */
  hidePlan?: boolean;
}

export function StudentCard({
  index,
  student,
  plans,
  onChange,
  onRemove,
  hidePlan,
}: StudentCardProps) {
  const plan = planOf(student, plans);
  const base = plan?.parcela ?? 0;
  const { discountCents, finalCents } = student.desconto
    ? computeDiscountedCents(base, student.descontoTipo, student.descontoVal)
    : { discountCents: 0, finalCents: base };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-[9px] text-[16.5px] font-bold tracking-[-0.01em]">
          <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-(--color-primary-soft) text-[13px] font-bold text-(--color-primary-hover)">
            {index + 1}
          </span>
          Aluno {index + 1}
        </h3>
        {onRemove && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={onRemove}
            className="text-(--color-danger-primary)"
          >
            <Trash2 size={15} />
            Remover
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do aluno" required>
            <Input
              value={student.aluno}
              onChange={(e) => onChange({ aluno: e.target.value })}
              placeholder="Ex.: João Silva"
            />
          </Field>
          <Field label="Data de nascimento">
            <Input
              value={student.nascimento}
              onChange={(e) => onChange({ nascimento: e.target.value })}
              placeholder="DD/MM/AAAA"
              inputMode="numeric"
            />
          </Field>
        </div>

        <SubjectChips
          value={student.materias}
          onChange={(materias) => onChange({ materias })}
        />

        {!hidePlan && plan && (
          <>
            <div>
              <label className="mb-2.5 block text-[13px] font-semibold text-(--color-text-muted-strong)">
                Plano
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Segmented
                  size="sm"
                  value={student.plano}
                  onChange={(plano) => onChange({ plano })}
                  options={plans.map((p) => ({ value: p.nome, label: p.nome }))}
                />
                <div className="text-right">
                  <div className="text-xs text-(--color-text-subtle)">Mensalidade cheia</div>
                  <div className="text-xl font-extrabold tracking-[-0.02em]">
                    {formatBRL(plan.parcela)}
                    <span className="text-[12.5px] font-medium text-(--color-text-subtle)">/mês</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-(--color-border-muted) pt-4">
              <div className={`flex items-center justify-between ${student.desconto ? "mb-3.5" : ""}`}>
                <div>
                  <div className="text-[13.5px] font-semibold">Desconto de negociação</div>
                  <div className="mt-0.5 text-xs text-(--color-text-subtle)">Por aluno · em % ou R$</div>
                </div>
                <Toggle
                  checked={student.desconto}
                  onChange={(v) => onChange({ desconto: v, descontoVal: "0" })}
                />
              </div>

              {student.desconto && (
                <>
                  <div className="flex items-center gap-2.5">
                    <Segmented
                      size="sm"
                      value={student.descontoTipo}
                      onChange={(descontoTipo) => onChange({ descontoTipo })}
                      options={[
                        { value: "PERCENT" as DiscountType, label: "%" },
                        { value: "FIXED" as DiscountType, label: "R$" },
                      ]}
                    />
                    <Input
                      className="flex-1"
                      value={student.descontoVal}
                      onChange={(e) => onChange({ descontoVal: e.target.value })}
                      inputMode="decimal"
                      placeholder={student.descontoTipo === "PERCENT" ? "10" : "50,00"}
                      trailing={
                        student.descontoTipo === "PERCENT" ? (
                          <span className="text-[13.5px] font-semibold text-(--color-text-muted)">%</span>
                        ) : undefined
                      }
                    />
                  </div>

                  <div className="mt-3.5 overflow-hidden rounded-(--radius-md) border border-(--color-border)">
                    {(
                      [
                        ["Mensalidade cheia", formatBRL(base), false],
                        ["Desconto", `− ${formatBRL(discountCents)}`, false],
                        ["Mensalidade com desconto", formatBRL(finalCents), true],
                      ] as const
                    ).map(([label, value, highlight]) => (
                      <div
                        key={label}
                        className={`flex justify-between px-3.5 py-2.5 ${
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
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

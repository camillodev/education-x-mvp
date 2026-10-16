"use client";

import { Repeat, Wallet } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SectionHead } from "@/components/patterns/SectionHead";
import { formatBRL } from "@/lib/format";
import type {
  EnrollmentFormValues,
  EnrollmentPlan,
} from "../enrollment-form.schema";

interface StepPlanProps {
  plans: EnrollmentPlan[];
  selectedPlan?: EnrollmentPlan;
  baseMonthlyCents: number;
  globalDiscount: { discountCents: number; finalCents: number };
  annualSavings: number;
}

export function StepPlan(
  { plans, selectedPlan, baseMonthlyCents, globalDiscount, annualSavings }:
    StepPlanProps,
) {
  const { control, register, setValue, formState: { errors } } = useFormContext<
    EnrollmentFormValues
  >();
  const planValues = useWatch({ control, name: "plan" });
  const students = useWatch({ control, name: "students" });
  const planErrors = errors.plan;

  return (
    <div className="flex flex-col gap-[18px]">
      <Card className="p-6">
        <SectionHead
          title="Plano"
          sub="Quanto mais longo o período, maior o desconto"
        />
        <Controller
          name="plan.plan"
          control={control}
          render={({ field }) => (
            <div
              className="flex flex-col gap-2.5"
              role="radiogroup"
              aria-label="Plano de cobrança"
            >
              {plans.map((plan) => {
                const active = field.value === plan.nome;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(plan.nome)}
                    className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border-2 px-4 py-[15px] text-left ${
                      active
                        ? "border-(--color-primary) bg-(--color-primary-softer)"
                        : "border-(--color-border-input) bg-(--color-bg)"
                    }`}
                  >
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                        active
                          ? "border-(--color-primary)"
                          : "border-(--color-border-input)"
                      }`}
                    >
                      {active && (
                        <span className="h-[11px] w-[11px] rounded-full bg-(--color-primary)" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[15px] font-bold">
                        {plan.nome}
                      </span>
                      <span className="text-[13px] text-(--color-text-subtle)">
                        {plan.desc}
                      </span>
                    </span>
                    <span className="text-right font-bold">
                      {formatBRL(plan.parcela)}
                      <span className="block text-[11px] font-normal text-(--color-text-subtle)">
                        /mês
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {planErrors?.plan?.message && (
          <p className="mt-1 text-xs text-(--color-danger-primary)">
            {planErrors.plan.message}
          </p>
        )}
        <div className="mt-3.5 flex items-start gap-2 rounded-(--radius-md) bg-(--color-surface) px-3.5 py-3 text-xs text-(--color-text-muted)">
          <Repeat size={15} className="shrink-0 text-(--color-primary)" />
          <span>
            Cobrança recorrente como <strong>assinatura</strong>{" "}
            — sem parcelamento. Pagamento via cartão, boleto ou PIX.
          </span>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHead
          title="Desconto de negociação"
          sub="Aplicado sobre a mensalidade"
        />
        <div className="flex items-center gap-2.5">
          <Controller
            name="plan.discountType"
            control={control}
            render={({ field }) => (
              <Segmented
                size="sm"
                value={field.value}
                onChange={field.onChange}
                options={[{ value: "PERCENT", label: "%" }, {
                  value: "FIXED",
                  label: "R$",
                }]}
              />
            )}
          />
          <Input
            {...register("plan.discountValue")}
            className="flex-1"
            inputMode="decimal"
            placeholder={planValues.discountType === "PERCENT" ? "10" : "50,00"}
            trailing={planValues.discountType === "PERCENT"
              ? <span className="font-semibold">%</span>
              : undefined}
          />
        </div>
      </Card>

      <Card className="p-6">
        <SectionHead
          title="Vencimento da fatura"
          sub="Vem das configurações da escola — ajuste se precisar"
        />
        <Field
          label="Dia do vencimento"
          hint="Todo mês o boleto vence neste dia"
          error={planErrors?.dueDate?.message}
        >
          <Input
            {...register("plan.dueDate", {
              onChange: (event) =>
                setValue(
                  "plan.dueDate",
                  event.target.value.replace(/\D/g, "").slice(0, 2),
                  { shouldDirty: true, shouldValidate: true },
                ),
            })}
            className="max-w-[220px]"
            inputMode="numeric"
            error={Boolean(planErrors?.dueDate)}
            trailing={
              <span className="whitespace-nowrap text-[13.5px]">
                de cada mês
              </span>
            }
          />
        </Field>
      </Card>

      <Card className="p-6">
        <SectionHead
          title="Resumo da cobrança"
          sub={`${students.length} aluno(s) · plano ${planValues.plan} · vence dia ${planValues.dueDate}`}
        />
        <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
          {[["Mensalidade cheia", formatBRL(baseMonthlyCents)], [
            `Desconto do plano ${planValues.plan}`,
            `− ${
              formatBRL(
                Math.max(0, baseMonthlyCents - (selectedPlan?.parcela ?? 0)),
              )
            }`,
          ], [
            "Desconto de negociação",
            `− ${formatBRL(globalDiscount.discountCents)}`,
          ], ["Economia anual total", formatBRL(annualSavings)]].map((
            [label, value],
          ) => (
            <div
              key={label}
              className="flex justify-between bg-(--color-bg) px-4 py-3 text-[13.5px]"
            >
              <span className="text-(--color-text-subtle)">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex items-center justify-between rounded-(--radius-md) bg-(--color-primary) p-[18px] text-white">
          <span className="inline-flex items-center gap-2">
            <Wallet size={18} />Total mensal a pagar
          </span>
          <strong className="text-2xl">
            {formatBRL(globalDiscount.finalCents)}
          </strong>
        </div>
      </Card>
    </div>
  );
}

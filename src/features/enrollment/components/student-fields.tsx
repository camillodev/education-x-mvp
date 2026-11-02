"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SubjectChips } from "@/components/school/SubjectChips";
import { formatBRL, maskCpf, maskPhone } from "@/lib/format";
import { maskBirthDate } from "@/components/onboarding/dados-masks";
import { computeDiscountedCents, type DiscountType } from "@/lib/pricing";
import type {
  EnrollmentFormValues,
  EnrollmentPlan,
} from "../enrollment-form.schema";

interface StudentFieldsProps {
  index: number;
  plans: EnrollmentPlan[];
  hidePlan: boolean;
  canRemove: boolean;
  onRemove: () => void;
}

export function StudentFields(
  { index, plans, hidePlan, canRemove, onRemove }: StudentFieldsProps,
) {
  const { register, control, setValue, formState: { errors } } = useFormContext<
    EnrollmentFormValues
  >();
  const studentPath = `students.${index}` as const;
  const student = useWatch({ control, name: studentPath });
  const studentErrors = errors.students?.[index];
  const plan = plans.find((item) => item.nome === student.plan) ?? plans[0];
  const baseCents = plan?.parcela ?? 0;
  const discount = student.discount
    ? computeDiscountedCents(
      baseCents,
      student.discountType,
      student.discountValue,
    )
    : { discountCents: 0, finalCents: baseCents };

  const maskInput = (
    name: "cpf" | "mobilePhone",
    mask: (value: string) => string,
  ) => ({
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue(`students.${index}.${name}`, mask(event.target.value), {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-base font-bold">
          <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-(--color-primary-soft) text-(--color-primary-hover)">
            {index + 1}
          </span>Aluno {index + 1}
        </h3>
        {canRemove && (
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={onRemove}
            className="text-(--color-danger-primary)"
          >
            <Trash2 size={15} />Remover
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Nome completo"
            htmlFor={`student-${index}-name`}
            required
            error={studentErrors?.name?.message}
          >
            <Input
              {...register(`students.${index}.name`)}
              id={`student-${index}-name`}
              placeholder="Ex.: João Silva"
              error={Boolean(studentErrors?.name)}
            />
          </Field>
          <Field
            label="Data de nascimento"
            htmlFor={`student-${index}-birth-date`}
            required
            error={studentErrors?.birthDate?.message}
          >
            <Input
              {...register(`students.${index}.birthDate`, {
                onChange: (event) =>
                  setValue(
                    `students.${index}.birthDate`,
                    maskBirthDate(event.target.value),
                    { shouldDirty: true, shouldValidate: true },
                  ),
              })}
              id={`student-${index}-birth-date`}
              placeholder="DD/MM/AAAA"
              inputMode="numeric"
              maxLength={10}
              error={Boolean(studentErrors?.birthDate)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="E-mail (opcional)"
            htmlFor={`student-${index}-email`}
            error={studentErrors?.email?.message}
          >
            <Input
              {...register(`students.${index}.email`)}
              id={`student-${index}-email`}
              type="email"
              placeholder="aluno@email.com"
              error={Boolean(studentErrors?.email)}
            />
          </Field>
          <Field
            label="CPF (opcional)"
            htmlFor={`student-${index}-cpf`}
            error={studentErrors?.cpf?.message}
          >
            <Input
              {...register(`students.${index}.cpf`, maskInput("cpf", maskCpf))}
              id={`student-${index}-cpf`}
              inputMode="numeric"
              maxLength={14}
              error={Boolean(studentErrors?.cpf)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Celular (opcional)"
            htmlFor={`student-${index}-mobile`}
            error={studentErrors?.mobilePhone?.message}
          >
            <Input
              {...register(
                `students.${index}.mobilePhone`,
                maskInput("mobilePhone", maskPhone),
              )}
              id={`student-${index}-mobile`}
              inputMode="tel"
              maxLength={15}
              error={Boolean(studentErrors?.mobilePhone)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RG (opcional)" htmlFor={`student-${index}-rg`}>
              <Input
                {...register(`students.${index}.rg`)}
                id={`student-${index}-rg`}
              />
            </Field>
            <Field label="Órgão emissor" htmlFor={`student-${index}-rg-issuer`}>
              <Input
                {...register(`students.${index}.rgIssuer`)}
                id={`student-${index}-rg-issuer`}
                placeholder="SSP/MG"
              />
            </Field>
          </div>
        </div>
        <div>
          <Controller
            name={`students.${index}.subjectIds`}
            control={control}
            render={({ field }) => (
              <SubjectChips value={field.value} onChange={field.onChange} />
            )}
          />
          {studentErrors?.subjectIds?.message && (
            <p className="mt-1 text-xs text-(--color-danger-primary)">
              {studentErrors.subjectIds.message}
            </p>
          )}
        </div>

        {!hidePlan && plan && (
          <>
            <div>
              <label className="mb-2.5 block text-[13px] font-semibold">
                Plano
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Controller
                  name={`students.${index}.plan`}
                  control={control}
                  render={({ field }) => (
                    <Segmented
                      size="sm"
                      value={field.value}
                      onChange={field.onChange}
                      options={plans.map((item) => ({
                        value: item.nome,
                        label: item.nome,
                      }))}
                    />
                  )}
                />
                <div className="text-right">
                  <div className="text-xs text-(--color-text-subtle)">
                    Mensalidade cheia
                  </div>
                  <div className="text-xl font-extrabold">
                    {formatBRL(plan.parcela)}
                    <span className="text-xs font-medium">/mês</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-(--color-border-muted) pt-4">
              <div
                className={`flex items-center justify-between ${
                  student.discount ? "mb-3.5" : ""
                }`}
              >
                <div>
                  <div className="text-[13.5px] font-semibold">
                    Desconto de negociação
                  </div>
                  <div className="mt-0.5 text-xs text-(--color-text-subtle)">
                    Por aluno · em % ou R$
                  </div>
                </div>
                <Controller
                  name={`students.${index}.discount`}
                  control={control}
                  render={({ field }) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => {
                        field.onChange(!field.value);
                        if (!field.value) {
                          setValue(`students.${index}.discountValue`, "0");
                        }
                      }}
                      className={`h-7 w-[46px] cursor-pointer rounded-full ${
                        field.value
                          ? "bg-(--color-primary)"
                          : "bg-(--color-border-strong)"
                      }`}
                    >
                      <span
                        className={`block h-[21px] w-[21px] rounded-full bg-white transition-transform ${
                          field.value ? "translate-x-[19px]" : "translate-x-0"
                        }`}
                      />
                    </button>
                  )}
                />
              </div>
              {student.discount && (
                <>
                  <div className="flex items-center gap-2.5">
                    <Controller
                      name={`students.${index}.discountType`}
                      control={control}
                      render={({ field }) => (
                        <Segmented
                          size="sm"
                          value={field.value}
                          onChange={field.onChange}
                          options={[{
                            value: "PERCENT" as DiscountType,
                            label: "%",
                          }, { value: "FIXED" as DiscountType, label: "R$" }]}
                        />
                      )}
                    />
                    <Input
                      {...register(`students.${index}.discountValue`)}
                      className="flex-1"
                      inputMode="decimal"
                      placeholder={student.discountType === "PERCENT"
                        ? "10"
                        : "50,00"}
                    />
                  </div>
                  <div className="mt-3.5 overflow-hidden rounded-(--radius-md) border border-(--color-border)">
                    {[["Mensalidade cheia", formatBRL(baseCents)], [
                      "Desconto",
                      `− ${formatBRL(discount.discountCents)}`,
                    ], [
                      "Mensalidade com desconto",
                      formatBRL(discount.finalCents),
                    ]].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between px-3.5 py-2.5 text-sm"
                      >
                        <span>{label}</span>
                        <strong>{value}</strong>
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

"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { SectionHead } from "@/components/patterns/SectionHead";
import { maskCpf, maskPhone } from "@/lib/format";
import { isValidBrMobile, isValidCpf } from "@/lib/validations/br-documents";

export const NewEnrollmentGuardianSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do responsável."),
  cpf: z
    .string()
    .refine(
      (value) => !value.trim() || isValidCpf(value.replace(/\D/g, "")),
      "CPF inválido. Confira os números."
    ),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z
    .string()
    .refine(
      (value) => !value.trim() || isValidBrMobile(value.replace(/\D/g, "")),
      "Informe um celular válido com DDD."
    ),
  hasAddress: z.boolean(),
  cep: z.string(),
  city: z.string(),
  street: z.string(),
  number: z.string(),
});

export type NewEnrollmentGuardianValues = z.infer<typeof NewEnrollmentGuardianSchema>;

interface GuardianFormProps {
  initialValues: NewEnrollmentGuardianValues;
  onContinue: (values: NewEnrollmentGuardianValues) => void;
}

export function GuardianForm({ initialValues, onContinue }: GuardianFormProps) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<NewEnrollmentGuardianValues>({
    resolver: zodResolver(NewEnrollmentGuardianSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  const hasAddress = useWatch({ control, name: "hasAddress" });
  const cpfField = register("cpf");
  const phoneField = register("phone");

  return (
    <form
      id="new-enrollment-guardian-form"
      onSubmit={handleSubmit(onContinue)}
      noValidate
      className="flex flex-col gap-[18px]"
    >
      <Card className="flex items-center gap-[11px] border border-(--color-primary-soft) bg-(--color-toast-info-bg) p-4">
        <Info size={18} className="shrink-0 text-(--color-primary)" />
        <span className="text-[13.5px] leading-normal text-(--color-text-muted)">
          Tem processo de matrícula próprio? Cadastre aqui e envie ao responsável só para{" "}
          <strong className="text-(--color-text)">confirmar e aceitar</strong> — sem ele
          preencher nada.
        </span>
      </Card>

      <Card className="p-6">
        <SectionHead
          title="Responsável financeiro"
          sub="Quem recebe o link e autoriza a cobrança"
        />
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="guardian-name" required error={errors.name?.message}>
              <Input
                {...register("name")}
                id="guardian-name"
                placeholder="Ex.: Maria Silva"
                error={Boolean(errors.name)}
              />
            </Field>
            <Field label="CPF" htmlFor="guardian-cpf" error={errors.cpf?.message}>
              <Input
                {...cpfField}
                id="guardian-cpf"
                onChange={(event) => {
                  cpfField.onChange(event);
                  setValue("cpf", maskCpf(event.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                error={Boolean(errors.cpf)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="E-mail"
              htmlFor="guardian-email"
              required
              hint="Recebe o link de confirmação"
              error={errors.email?.message}
            >
              <Input
                {...register("email")}
                id="guardian-email"
                type="email"
                placeholder="email@exemplo.com"
                error={Boolean(errors.email)}
              />
            </Field>
            <Field
              label="Celular (WhatsApp)"
              htmlFor="guardian-phone"
              error={errors.phone?.message}
            >
              <Input
                {...phoneField}
                id="guardian-phone"
                onChange={(event) => {
                  phoneField.onChange(event);
                  setValue("phone", maskPhone(event.target.value), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                inputMode="tel"
                placeholder="(31) 90000-0000"
                maxLength={15}
                error={Boolean(errors.phone)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div>
              <div className="text-[13.5px] font-semibold">Adicionar endereço</div>
              <div className="mt-0.5 text-xs text-(--color-text-subtle)">
                Opcional — usado na nota fiscal e no contrato
              </div>
            </div>
            <Controller
              name="hasAddress"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  aria-label="Adicionar endereço do responsável"
                />
              )}
            />
          </div>

          {hasAddress && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CEP" htmlFor="guardian-cep">
                  <Input
                    {...register("cep")}
                    id="guardian-cep"
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Cidade" htmlFor="guardian-city">
                  <Input {...register("city")} id="guardian-city" placeholder="Belo Horizonte" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Rua" htmlFor="guardian-street">
                  <Input {...register("street")} id="guardian-street" placeholder="Av. Exemplo" />
                </Field>
                <Field label="Número" htmlFor="guardian-number">
                  <Input
                    {...register("number")}
                    id="guardian-number"
                    placeholder="420"
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      </Card>
    </form>
  );
}

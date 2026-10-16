"use client";

import { useActionState, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IdCard, Mail, Phone, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { maskBrPhone, maskCep, maskCpfCnpj, maskPhone } from "@/lib/format";
import {
  type GuardianStepInput,
  type GuardianStepOutput,
  GuardianStepSchema,
} from "@/lib/validations/guardian";
import { lookupAddressByPostalCode } from "@/lib/services/cep.service";
import {
  type GuardianStepFormState,
  submitGuardianStepAction,
} from "./actions";

const GUARDIAN_TYPE_OPTIONS = [
  { value: "MOTHER", label: "Mãe" },
  { value: "FATHER", label: "Pai" },
  { value: "LEGAL_GUARDIAN", label: "Responsável legal" },
] as const;

interface Props {
  token: string;
}
const INITIAL_STATE: GuardianStepFormState = { errors: {} };

export function GuardianForm({ token }: Props) {
  const action = submitGuardianStepAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    getFieldState,
    watch,
    formState: { errors },
  } = useForm<GuardianStepInput, unknown, GuardianStepOutput>({
    resolver: zodResolver(GuardianStepSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      cpfCnpj: "",
      email: "",
      mobilePhone: "",
      postalCode: "",
      address: "",
      addressNumber: "",
      complement: "",
      province: "",
      city: "",
      state: "",
      phone: "",
      additionalEmails: "",
      type: "MOTHER",
    },
  });
  const postalCode = watch("postalCode");
  const [postalLookupMessage, setPostalLookupMessage] = useState("");

  useEffect(() => {
    const digits = postalCode.replace(/\D/g, "");
    if (digits.length !== 8) return;
    let active = true;
    const timeout = window.setTimeout(async () => {
      setPostalLookupMessage("Consultando CEP…");
      try {
        const address = await lookupAddressByPostalCode(digits);
        if (!active) return;
        for (
          const field of [
            "address",
            "complement",
            "province",
            "city",
            "state",
          ] as const
        ) {
          if (!getFieldState(field).isDirty || !getValues(field)) {
            setValue(field, address[field], { shouldValidate: true });
          }
        }
      } catch (error) {
        if (active) {
          setPostalLookupMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o CEP.",
          );
        }
      }
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [postalCode, getFieldState, getValues, setValue]);

  function submit(values: GuardianStepOutput) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) {
      data.set(key, String(value));
    }
    formAction(data);
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">Seus dados</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 1 de 4</p>
      <form
        onSubmit={handleSubmit(submit)}
        className="mt-5 flex flex-col gap-4"
        noValidate
      >
        <Field
          label="Nome completo"
          htmlFor="name"
          required
          error={errors.name?.message ?? state.errors.name}
        >
          <Input
            {...register("name")}
            id="name"
            placeholder="Seu nome completo"
            leadingIcon={<User size={18} />}
            error={!!(errors.name || state.errors.name)}
          />
        </Field>
        <Field
          label="CPF ou CNPJ"
          htmlFor="cpfCnpj"
          required
          error={errors.cpfCnpj?.message ?? state.errors.cpfCnpj}
        >
          <Input
            {...register("cpfCnpj", {
              onChange: (event) =>
                setValue("cpfCnpj", maskCpfCnpj(event.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                }),
            })}
            id="cpfCnpj"
            placeholder="CPF ou CNPJ"
            inputMode="text"
            maxLength={18}
            leadingIcon={<IdCard size={18} />}
            error={!!(errors.cpfCnpj || state.errors.cpfCnpj)}
          />
        </Field>
        <Field
          label="E-mail"
          htmlFor="email"
          required
          hint="É onde você vai receber os boletos."
          error={errors.email?.message ?? state.errors.email}
        >
          <Input
            {...register("email")}
            id="email"
            type="email"
            inputMode="email"
            placeholder="voce@email.com"
            leadingIcon={<Mail size={18} />}
            error={!!(errors.email || state.errors.email)}
          />
        </Field>
        <Field
          label="Celular / WhatsApp"
          htmlFor="mobilePhone"
          required
          hint="Usamos para avisos importantes por WhatsApp."
          error={errors.mobilePhone?.message ?? state.errors.mobilePhone}
        >
          <Input
            {...register("mobilePhone", {
              onChange: (event) =>
                setValue("mobilePhone", maskPhone(event.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                }),
            })}
            id="mobilePhone"
            placeholder="(31) 99999-0000"
            inputMode="tel"
            maxLength={15}
            leadingIcon={<Phone size={18} />}
            error={!!(errors.mobilePhone || state.errors.mobilePhone)}
          />
        </Field>
        <Field
          label="Telefone fixo (opcional)"
          htmlFor="phone"
          error={errors.phone?.message ?? state.errors.phone}
        >
          <Input
            {...register("phone", {
              onChange: (event) =>
                setValue("phone", maskBrPhone(event.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                }),
            })}
            id="phone"
            inputMode="tel"
            maxLength={15}
          />
        </Field>
        <Field
          label="E-mails adicionais (opcional)"
          htmlFor="additionalEmails"
          hint="Separe os e-mails por vírgula."
          error={errors.additionalEmails?.message ??
            state.errors.additionalEmails}
        >
          <Input
            {...register("additionalEmails")}
            id="additionalEmails"
            placeholder="maria@email.com"
          />
        </Field>
        <details className="rounded-md border border-(--color-border) p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Endereço (opcional)
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <Field
              label="CEP"
              htmlFor="postalCode"
              error={errors.postalCode?.message ?? state.errors.postalCode}
            >
              <Input
                {...register("postalCode", {
                  onChange: (event) =>
                    setValue("postalCode", maskCep(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    }),
                })}
                id="postalCode"
                inputMode="numeric"
                maxLength={9}
              />
              {postalLookupMessage && (
                <p role="status" className="text-xs text-(--color-text-subtle)">
                  {postalLookupMessage}
                </p>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Logradouro" htmlFor="address">
                <Input {...register("address")} id="address" />
              </Field>
              <Field label="Número" htmlFor="addressNumber">
                <Input {...register("addressNumber")} id="addressNumber" />
              </Field>
              <Field label="Complemento" htmlFor="complement">
                <Input {...register("complement")} id="complement" />
              </Field>
              <Field label="Bairro" htmlFor="province">
                <Input {...register("province")} id="province" />
              </Field>
              <Field label="Cidade" htmlFor="city">
                <Input {...register("city")} id="city" />
              </Field>
              <Field label="UF" htmlFor="state">
                <Input {...register("state")} id="state" maxLength={2} />
              </Field>
            </div>
          </div>
        </details>
        <div>
          <span className="text-[13px] font-semibold text-(--color-text)">
            Tipo de responsável<span className="ml-0.5 text-(--color-danger)">
              *
            </span>
          </span>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Segmented
                options={GUARDIAN_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={field.value}
                onChange={field.onChange}
                aria-label="Tipo de responsável"
                className="mt-1.5"
              />
            )}
          />
          {errors.type?.message && (
            <p className="mt-1 text-xs text-(--color-danger)">
              {errors.type.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="mt-2 w-full"
        >
          {pending ? "Salvando…" : "Continuar"}
        </Button>
      </form>
    </Card>
  );
}

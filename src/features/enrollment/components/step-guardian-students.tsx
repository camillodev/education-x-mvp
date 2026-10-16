"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Ban, MapPin, Plus, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Segmented } from "@/components/ui/segmented";
import { StudentFields } from "./student-fields";
import {
  formatBRL,
  maskBrPhone,
  maskCep,
  maskCpfCnpj,
  maskPhone,
} from "@/lib/format";
import type {
  EnrollmentFormValues,
  EnrollmentMode,
  EnrollmentPlan,
} from "../enrollment-form.schema";

interface StepGuardianStudentsProps {
  mode: EnrollmentMode;
  plans: EnrollmentPlan[];
  studentFields: { id: string }[];
  onAddStudent: () => void;
  onRemoveStudent: (index: number) => void;
  totalMonthlyCents: number;
  postalLookup: {
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  };
}

const MAX_STUDENTS = 5;

export function StepGuardianStudents(
  {
    mode,
    plans,
    studentFields,
    onAddStudent,
    onRemoveStudent,
    totalMonthlyCents,
    postalLookup,
  }: StepGuardianStudentsProps,
) {
  const { register, control, setValue, formState: { errors } } = useFormContext<
    EnrollmentFormValues
  >();
  const guardian = useWatch({ control, name: "guardian" });
  const guardianErrors = errors.guardian;
  const hidePlan = mode === "create";
  const inputMasks = {
    cpfCnpj: (value: string) =>
      setValue("guardian.cpfCnpj", maskCpfCnpj(value), {
        shouldDirty: true,
        shouldValidate: true,
      }),
    mobilePhone: (value: string) =>
      setValue("guardian.mobilePhone", maskPhone(value), {
        shouldDirty: true,
        shouldValidate: true,
      }),
    phone: (value: string) =>
      setValue("guardian.phone", maskBrPhone(value), {
        shouldDirty: true,
        shouldValidate: true,
      }),
    postalCode: (value: string) =>
      setValue("guardian.postalCode", maskCep(value), {
        shouldDirty: true,
        shouldValidate: true,
      }),
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold">Responsável financeiro</h2>
        <div className="flex flex-col gap-4">
          <Field label="Tipo de responsável" htmlFor="guardian-type">
            <Segmented
              options={[
                { value: "MOTHER", label: "Mãe" },
                { value: "FATHER", label: "Pai" },
                { value: "LEGAL_GUARDIAN", label: "Responsável legal" }]}
              value={guardian.guardianType ?? "MOTHER"}
              onChange={(value) => setValue("guardian.guardianType", value)}
              aria-label="Tipo de responsável"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Nome completo"
              htmlFor="guardian-name"
              required
              error={guardianErrors?.name?.message}
            >
              <Input
                {...register("guardian.name")}
                id="guardian-name"
                placeholder="Nome e sobrenome"
                error={Boolean(guardianErrors?.name)}
              />
            </Field>
            <Field
              label="CPF ou CNPJ"
              htmlFor="guardian-document"
              required
              error={guardianErrors?.cpfCnpj?.message}
            >
              <Input
                {...register("guardian.cpfCnpj", {
                  onChange: (event) => inputMasks.cpfCnpj(event.target.value),
                })}
                id="guardian-document"
                placeholder="CPF ou CNPJ"
                inputMode="text"
                maxLength={18}
                error={Boolean(guardianErrors?.cpfCnpj)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="E-mail"
              htmlFor="guardian-email"
              required
              error={guardianErrors?.email?.message}
            >
              <Input
                {...register("guardian.email")}
                id="guardian-email"
                type="email"
                placeholder="voce@email.com"
                error={Boolean(guardianErrors?.email)}
              />
            </Field>
            <Field
              label="Celular / WhatsApp"
              htmlFor="guardian-mobile"
              required
              error={guardianErrors?.mobilePhone?.message}
            >
              <Input
                {...register("guardian.mobilePhone", {
                  onChange: (event) =>
                    inputMasks.mobilePhone(event.target.value),
                })}
                id="guardian-mobile"
                inputMode="tel"
                maxLength={15}
                error={Boolean(guardianErrors?.mobilePhone)}
              />
            </Field>
          </div>
          <Field
            label="Telefone fixo (opcional)"
            htmlFor="guardian-phone"
            error={guardianErrors?.phone?.message}
          >
            <Input
              {...register("guardian.phone", {
                onChange: (event) => inputMasks.phone(event.target.value),
              })}
              id="guardian-phone"
              inputMode="tel"
              maxLength={15}
              error={Boolean(guardianErrors?.phone)}
            />
          </Field>
          <Field
            label="E-mails adicionais (opcional)"
            htmlFor="guardian-additional-emails"
            hint="Separe os endereços por vírgula."
            error={guardianErrors?.additionalEmails?.message}
          >
            <Input
              {...register("guardian.additionalEmails")}
              id="guardian-additional-emails"
              type="text"
              placeholder="maria@email.com, pedro@email.com"
              error={Boolean(guardianErrors?.additionalEmails)}
            />
          </Field>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="CEP"
              htmlFor="guardian-postal-code"
              error={guardianErrors?.postalCode?.message}
            >
              <Input
                {...register("guardian.postalCode", {
                  onChange: (event) =>
                    inputMasks.postalCode(event.target.value),
                })}
                id="guardian-postal-code"
                inputMode="numeric"
                maxLength={9}
                error={Boolean(guardianErrors?.postalCode)}
                trailing={
                  <MapPin size={16} className="text-(--color-text-subtle)" />
                }
              />
              {postalLookup.message && (
                <p
                  role="status"
                  className={`text-xs ${postalLookup.status === "error"
                    ? "text-(--color-danger-primary)"
                    : "text-(--color-text-subtle)"
                    }`}
                >
                  {postalLookup.message}
                </p>
              )}
            </Field>
            <Field label="Logradouro" htmlFor="guardian-address">
              <Input
                {...register("guardian.address")}
                id="guardian-address"
              />
            </Field>
            <Field label="Número" htmlFor="guardian-address-number">
              <Input
                {...register("guardian.addressNumber")}
                id="guardian-address-number"
              />
            </Field>
            <Field label="Complemento" htmlFor="guardian-complement">
              <Input
                {...register("guardian.complement")}
                id="guardian-complement"
              />
            </Field>
            <Field label="Bairro" htmlFor="guardian-province">
              <Input
                {...register("guardian.province")}
                id="guardian-province"
              />
            </Field>
            <Field label="Cidade" htmlFor="guardian-city">
              <Input {...register("guardian.city")} id="guardian-city" />
            </Field>
            <Field label="UF" htmlFor="guardian-state">
              <Input
                {...register("guardian.state")}
                id="guardian-state"
                maxLength={2}
              />
            </Field>
          </div>
        </div>
      </Card>

      {studentFields.map((student, index) => (
        <StudentFields
          key={student.id}
          index={index}
          plans={plans}
          hidePlan={hidePlan}
          canRemove={studentFields.length > 1}
          onRemove={() => onRemoveStudent(index)}
        />
      ))}
      {studentFields.length < MAX_STUDENTS
        ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onAddStudent}
            className="self-start"
          >
            <UserPlus size={16} />
            <Plus size={15} />Adicionar aluno
          </Button>
        )
        : (
          <div className="inline-flex items-center gap-2 text-sm text-(--color-text-subtle)">
            <Ban size={16} />Limite de {MAX_STUDENTS} alunos atingido.
          </div>
        )}
      {mode === "edit" && (
        <Card className="bg-(--color-primary) p-5 text-white">
          <div className="text-sm font-semibold">Total mensal da matrícula</div>
          <div className="text-2xl font-extrabold">
            {formatBRL(totalMonthlyCents)} /mês
          </div>
        </Card>
      )}
    </div>
  );
}

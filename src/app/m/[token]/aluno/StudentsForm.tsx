"use client";

import { useActionState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Mail, Plus, Trash2, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/button";
import { maskBirthDate } from "@/components/onboarding/dados-masks";
import { maskCpf, maskPhone } from "@/lib/format";
import {
  type StudentBlockInput,
  type StudentBlockOutput,
  StudentsStepSchema,
} from "@/lib/validations/student";
import {
  type StudentBlockFormState,
  submitStudentsStepAction,
} from "./actions";

const MAX_STUDENTS = 5;
interface SubjectOption {
  id: string;
  name: string;
}
interface Props {
  token: string;
  subjects: SubjectOption[];
}
const StudentsFormSchema = z.object({ students: StudentsStepSchema });
type StudentsFormInput = { students: StudentBlockInput[] };
type StudentsFormOutput = { students: StudentBlockOutput[] };
const INITIAL_STATE: StudentBlockFormState = { blockErrors: [] };

function emptyStudent(): StudentBlockInput {
  return {
    name: "",
    birthDate: "",
    email: "",
    cpf: "",
    mobilePhone: "",
    rg: "",
    rgIssuer: "",
    subjectIds: [],
  };
}

export function StudentsForm({ token, subjects }: Props) {
  const action = submitStudentsStepAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const { control, register, handleSubmit, setValue, formState: { errors } } =
    useForm<StudentsFormInput, unknown, StudentsFormOutput>({
      resolver: zodResolver(StudentsFormSchema),
      mode: "onTouched",
      defaultValues: { students: [emptyStudent()] },
    });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "students",
  });

  function submit({ students }: StudentsFormOutput) {
    const data = new FormData();
    data.set("blockCount", String(students.length));
    students.forEach((student, index) => {
      data.set(`students[${index}].name`, student.name);
      data.set(
        `students[${index}].birthDate`,
        `${String(student.birthDate.getDate()).padStart(2, "0")}/${
          String(student.birthDate.getMonth() + 1).padStart(2, "0")
        }/${student.birthDate.getFullYear()}`,
      );
      data.set(`students[${index}].email`, student.email);
      data.set(`students[${index}].cpf`, student.cpf);
      data.set(`students[${index}].mobilePhone`, student.mobilePhone);
      data.set(`students[${index}].rg`, student.rg);
      data.set(`students[${index}].rgIssuer`, student.rgIssuer);
      student.subjectIds.forEach((id) =>
        data.append(`students[${index}].subjectIds`, id)
      );
    });
    formAction(data);
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">
        {fields.length > 1 ? "Dados dos alunos" : "Dados do aluno"}
      </h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 2 de 4</p>
      {state.formError && (
        <p role="alert" className="mt-3 text-sm text-(--color-danger)">
          {state.formError}
        </p>
      )}

      <form
        onSubmit={handleSubmit(submit)}
        className="mt-5 flex flex-col gap-6"
        noValidate
      >
        {fields.map((field, index) => {
          const studentErrors = errors.students?.[index];
          return (
            <div
              key={field.id}
              className="rounded-(--radius-lg) border border-(--color-border) p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-(--color-text)">
                  Aluno {index + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remover aluno ${index + 1}`}
                    className="cursor-pointer text-(--color-text-subtle) hover:text-(--color-danger)"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <Field
                  label="Nome completo"
                  htmlFor={`name-${index}`}
                  required
                  error={studentErrors?.name?.message}
                >
                  <Input
                    {...register(`students.${index}.name`)}
                    id={`name-${index}`}
                    placeholder="Nome completo"
                    leadingIcon={<User size={18} />}
                    error={!!studentErrors?.name}
                  />
                </Field>
                <Field
                  label="Data de nascimento"
                  htmlFor={`birthDate-${index}`}
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
                    id={`birthDate-${index}`}
                    placeholder="DD/MM/AAAA"
                    inputMode="numeric"
                    maxLength={10}
                    leadingIcon={<Calendar size={18} />}
                    error={!!studentErrors?.birthDate}
                  />
                </Field>
                <Field
                  label="E-mail do aluno"
                  htmlFor={`email-${index}`}
                  error={studentErrors?.email?.message}
                >
                  <Input
                    {...register(`students.${index}.email`)}
                    id={`email-${index}`}
                    type="email"
                    inputMode="email"
                    placeholder="aluno@email.com"
                    leadingIcon={<Mail size={18} />}
                    error={!!studentErrors?.email}
                  />
                </Field>
                <Field
                  label="CPF (opcional)"
                  htmlFor={`cpf-${index}`}
                  error={studentErrors?.cpf?.message}
                >
                  <Input
                    {...register(`students.${index}.cpf`, {
                      onChange: (event) =>
                        setValue(
                          `students.${index}.cpf`,
                          maskCpf(event.target.value),
                          { shouldDirty: true, shouldValidate: true },
                        ),
                    })}
                    id={`cpf-${index}`}
                    inputMode="numeric"
                    maxLength={14}
                    error={!!studentErrors?.cpf}
                  />
                </Field>
                <Field
                  label="Celular (opcional)"
                  htmlFor={`mobilePhone-${index}`}
                  error={studentErrors?.mobilePhone?.message}
                >
                  <Input
                    {...register(`students.${index}.mobilePhone`, {
                      onChange: (event) =>
                        setValue(
                          `students.${index}.mobilePhone`,
                          maskPhone(event.target.value),
                          { shouldDirty: true, shouldValidate: true },
                        ),
                    })}
                    id={`mobilePhone-${index}`}
                    inputMode="tel"
                    maxLength={15}
                    error={!!studentErrors?.mobilePhone}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="RG (opcional)" htmlFor={`rg-${index}`}>
                    <Input
                      {...register(`students.${index}.rg`)}
                      id={`rg-${index}`}
                    />
                  </Field>
                  <Field label="Órgão emissor" htmlFor={`rgIssuer-${index}`}>
                    <Input
                      {...register(`students.${index}.rgIssuer`)}
                      id={`rgIssuer-${index}`}
                      placeholder="SSP/MG"
                    />
                  </Field>
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-(--color-text)">
                    Matérias<span className="ml-0.5 text-(--color-danger)">
                      *
                    </span>
                  </span>
                  <Controller
                    name={`students.${index}.subjectIds`}
                    control={control}
                    render={({ field: subjectField }) => (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {subjects.map((subject) => (
                          <Chip
                            key={subject.id}
                            active={subjectField.value.includes(subject.id)}
                            onClick={() =>
                              subjectField.onChange(
                                subjectField.value.includes(subject.id)
                                  ? subjectField.value.filter((id) =>
                                    id !== subject.id
                                  )
                                  : [...subjectField.value, subject.id],
                              )}
                            size="sm"
                          >
                            {subject.name}
                          </Chip>
                        ))}
                      </div>
                    )}
                  />
                  {studentErrors?.subjectIds?.message && (
                    <p className="mt-1 text-xs text-(--color-danger)">
                      {studentErrors.subjectIds.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {fields.length < MAX_STUDENTS
          ? (
            <button
              type="button"
              onClick={() => append(emptyStudent())}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-(--radius-lg) border border-dashed border-(--color-border-input) py-3 text-sm font-semibold text-(--color-primary) hover:bg-(--color-primary-softer)"
            >
              <Plus size={16} />Adicionar outro aluno
            </button>
          )
          : (
            <p className="text-center text-xs text-(--color-text-subtle)">
              Máximo de 5 alunos por matrícula.
            </p>
          )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Salvando…" : "Continuar"}
        </Button>
      </form>
    </Card>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/format";
import {
  type AcceptanceStepInput,
  AcceptanceStepSchema,
} from "@/lib/validations/acceptance";
import {
  type AcceptanceStepFormState,
  submitAcceptanceStepAction,
} from "./actions";

export interface StudentSummary {
  name: string;
  subjectNames: string[];
}

interface Props {
  token: string;
  students: StudentSummary[];
  planLabel: string;
  totalCents: number;
  dueDay: number;
  contractBody: string;
}

const INITIAL_STATE: AcceptanceStepFormState = {};

export function ReviewForm(
  { token, students, planLabel, totalCents, dueDay, contractBody }: Props,
) {
  const action = submitAcceptanceStepAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [contractOpen, setContractOpen] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<
    AcceptanceStepInput
  >({
    resolver: zodResolver(AcceptanceStepSchema),
    defaultValues: { accepted: false },
  });

  function submit(values: AcceptanceStepInput) {
    const data = new FormData();
    data.set("accepted", String(values.accepted));
    formAction(data);
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">Revise e envie</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 4 de 4</p>

      <div className="mt-5 flex flex-col gap-4">
        <div className="rounded-(--radius-lg) bg-(--color-bg) p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">
            Alunos
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {students.map((s, i) => (
              <li key={i} className="text-sm text-(--color-text)">
                {s.name} — {s.subjectNames.join(", ")}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-(--radius-lg) bg-(--color-bg) p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">
            Plano
          </p>
          <p className="mt-2 text-sm text-(--color-text)">
            {planLabel} — {formatBRL(totalCents)} /mês, vencimento todo dia{" "}
            {dueDay}
          </p>
        </div>

        <div className="rounded-(--radius-lg) border border-(--color-border) p-4">
          <button
            type="button"
            onClick={() => setContractOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-(--color-text)"
          >
            Contrato com a escola
            <span className="text-(--color-text-subtle)">
              {contractOpen ? "−" : "+"}
            </span>
          </button>
          {contractOpen && (
            <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-(--color-text-subtle)">
              {contractBody}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          className="flex flex-col gap-3"
        >
          <Controller
            name="accepted"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  aria-label="Li e aceito o contrato"
                />
                <span className="text-sm text-(--color-text)">
                  Li e aceito o contrato acima.
                </span>
              </label>
            )}
          />

          {(errors.accepted?.message || state.error) && (
            <p role="alert" className="text-sm text-(--color-danger)">
              {errors.accepted?.message ?? state.error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="mt-2 w-full"
          >
            {pending ? "Enviando…" : "Enviar matrícula"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

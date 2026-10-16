"use client";

import type { ReactNode } from "react";
import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useEnrollmentForm } from "./use-enrollment-form";
import type {
  EnrollmentFormValues,
  EnrollmentMode,
  EnrollmentPlan,
} from "./enrollment-form.schema";
import { StepGuardianStudents } from "./components/step-guardian-students";
import { StepPlan } from "./components/step-plan";

interface EnrollmentFormProps {
  mode: EnrollmentMode;
  initialValues: EnrollmentFormValues;
  plans: EnrollmentPlan[];
  onSave: (values: EnrollmentFormValues) => void;
  onCancel: () => void;
  isApproval?: boolean;
  notice?: ReactNode;
  onReject?: () => void;
  onApprove?: (values: EnrollmentFormValues) => void;
}

export function EnrollmentForm(
  {
    mode,
    initialValues,
    plans,
    onSave,
    onCancel,
    isApproval = false,
    notice,
    onReject,
    onApprove,
  }: EnrollmentFormProps,
) {
  const form = useEnrollmentForm({
    mode,
    initialValues,
    plans,
    onSubmit: (values) => (isApproval ? onApprove?.(values) : onSave(values)),
  });
  const createMode = mode === "create";

  return (
    <FormProvider {...form.methods}>
      <form
        onSubmit={form.submit}
        noValidate
        className="flex flex-col gap-[18px]"
      >
        {notice}
        {createMode && (
          <div className="overflow-x-auto pb-0.5">
            <Segmented
              options={[{ value: "guardian", label: "1 · Cadastro" }, {
                value: "plan",
                label: "2 · Plano e cobrança",
              }]}
              value={form.step}
              onChange={(step) =>
                step === "guardian"
                  ? form.goToGuardianStep()
                  : void form.goToPlanStep()}
            />
          </div>
        )}

        {form.step === "guardian"
          ? (
            <StepGuardianStudents
              mode={mode}
              plans={plans}
              studentFields={form.studentFields}
              onAddStudent={form.addStudent}
              onRemoveStudent={form.removeStudent}
              totalMonthlyCents={form.totalMonthlyCents}
              postalLookup={form.postalLookup}
            />
          )
          : (
            <StepPlan
              plans={plans}
              selectedPlan={form.selectedPlan}
              baseMonthlyCents={form.baseMonthlyCents}
              globalDiscount={form.globalDiscount}
              annualSavings={form.annualSavings}
            />
          )}

        {createMode
          ? (
            <div className="flex justify-between gap-3">
              {form.step === "guardian"
                ? (
                  <>
                    <Button type="button" variant="tertiary" onClick={onCancel}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      iconRight="arrow-right"
                      onClick={() => void form.goToPlanStep()}
                    >
                      Continuar para plano
                    </Button>
                  </>
                )
                : (
                  <>
                    <Button
                      type="button"
                      variant="tertiary"
                      iconLeft="arrow-left"
                      onClick={form.goToGuardianStep}
                    >
                      Voltar
                    </Button>
                    <Button type="submit" size="lg" iconRight="send">
                      Enviar para confirmação
                    </Button>
                  </>
                )}
            </div>
          )
          : (
            <div className="flex flex-wrap justify-between gap-3">
              {isApproval
                ? (
                  <Button
                    type="button"
                    variant="danger-outline"
                    onClick={onReject}
                  >
                    Recusar
                  </Button>
                )
                : (
                  <Button type="button" variant="tertiary" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
              <Button
                type="submit"
                size="lg"
                iconLeft={isApproval ? "check" : "save"}
              >
                {isApproval ? "Aprovar matrícula" : "Salvar alterações"}
              </Button>
            </div>
          )}
      </form>
    </FormProvider>
  );
}

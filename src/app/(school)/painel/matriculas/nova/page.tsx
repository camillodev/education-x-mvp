"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { SchoolShell } from "@/components/school/SchoolShell";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import type { EnrollmentPlan } from "@/lib/mock/types";
import { createEmptyEnrollmentFormValues } from "@/features/enrollment/enrollment-form.schema";
import { EnrollmentForm } from "@/features/enrollment/enrollment-form";

export default function NewEnrollmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data } = useMockResource<EnrollmentPlan[]>("/api/mock/plans");
  const plans = useMemo(() => data ?? [], [data]);
  const initialValues = useMemo(
    () =>
      createEmptyEnrollmentFormValues(
        plans.find((plan) => plan.id === "mensal")?.nome ?? plans[0]?.nome ??
          "Mensal",
      ),
    [plans],
  );
  const goToList = () => router.push("/painel/matriculas");

  return (
    <SchoolShell
      title="Nova matrícula"
      subtitle="Preencha os dados — o responsável só confirma e dá o aceite"
      onBack={goToList}
    >
      <EnrollmentForm
        mode="create"
        initialValues={initialValues}
        plans={plans}
        onCancel={goToList}
        onSave={(values) => {
          toast(
            `Link de confirmação enviado para ${values.guardian.email}`,
            "success",
          );
          goToList();
        }}
      />
    </SchoolShell>
  );
}

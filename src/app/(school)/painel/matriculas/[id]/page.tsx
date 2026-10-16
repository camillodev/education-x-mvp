"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileCheck2, UserCheck } from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import type { Enrollment, EnrollmentPlan } from "@/lib/mock/types";
import {
  createEmptyEnrollmentFormValues,
  type EnrollmentFormValues,
} from "@/features/enrollment/enrollment-form.schema";
import { EnrollmentForm } from "@/features/enrollment/enrollment-form";

export default function EnrollmentDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const { data, loading, error } = useMockResource<Enrollment[]>(
    "/api/mock/enrollments",
  );
  const { data: plansData } = useMockResource<EnrollmentPlan[]>(
    "/api/mock/plans",
  );
  const enrollment = data?.find((item) => item.id === id);
  const plans = useMemo(() => plansData ?? [], [plansData]);
  const initialValues = useMemo<EnrollmentFormValues | null>(() => {
    if (!enrollment) return null;
    const values = createEmptyEnrollmentFormValues(enrollment.plano);
    values.guardian = {
      ...values.guardian,
      name: enrollment.pagante,
      cpfCnpj: enrollment.cpf,
      email: enrollment.email,
      mobilePhone: enrollment.tel,
    };
    values.students = [{
      ...values.students[0],
      name: enrollment.aluno,
      birthDate: enrollment.nascimento,
      subjectIds: [...enrollment.materias],
      plan: enrollment.plano,
    }];
    values.plan.plan = enrollment.plano;
    return values;
  }, [enrollment]);
  const goToList = () => router.push("/painel/matriculas");

  if (loading) {
    return (
      <SchoolShell title="Matrícula" onBack={goToList} maxWidth={760}>
        <p className="py-8 text-center text-sm text-(--color-text-subtle)">
          Carregando…
        </p>
      </SchoolShell>
    );
  }
  if (error || !enrollment || !initialValues) {
    return (
      <SchoolShell title="Matrícula" onBack={goToList} maxWidth={760}>
        <p className="py-8 text-center text-sm text-(--color-danger-primary)">
          {error ?? "Matrícula não encontrada."}
        </p>
      </SchoolShell>
    );
  }

  const isApproval = enrollment.status === "pendente";
  const notice = (
    <>
      {enrollment.aceiteEm && (
        <Card className="flex items-center gap-3 border border-(--badge-success-fg)/30 bg-(--badge-success-bg) p-4">
          <FileCheck2
            size={20}
            className="shrink-0 text-(--badge-success-fg)"
          />
          <span className="text-[13.5px] font-semibold text-(--badge-success-fg)">
            Responsável aceitou os termos em {enrollment.aceiteEm}{" "}
            — aceite registrado (prova legal).
          </span>
        </Card>
      )}
      {enrollment.selfPayer && (
        <Card className="flex items-center gap-3 border border-(--color-primary-soft) bg-(--color-primary-softer) p-3.5">
          <UserCheck size={18} className="shrink-0 text-(--color-primary)" />
          <span className="text-[13.5px]">
            Aluno adulto: <strong>{enrollment.aluno}</strong>{" "}
            é o próprio pagante.
          </span>
        </Card>
      )}
    </>
  );

  const save = () => {
    toast("Alterações salvas", "success");
    goToList();
  };
  const approve = () => {
    toast(
      "Matrícula aprovada — 1ª cobrança será emitida no fechamento",
      "success",
    );
    goToList();
  };

  return (
    <SchoolShell
      title={isApproval ? "Revisar matrícula" : "Editar matrícula"}
      subtitle={`${enrollment.pagante} · 1 aluno`}
      onBack={goToList}
      maxWidth={760}
    >
      <EnrollmentForm
        mode="edit"
        initialValues={initialValues}
        plans={plans}
        isApproval={isApproval}
        notice={notice}
        onSave={save}
        onApprove={approve}
        onCancel={goToList}
        onReject={() => setRejectOpen(true)}
      />
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--color-danger-soft)">
            <AlertTriangle
              size={22}
              className="text-(--color-danger-primary)"
            />
          </div>
          <DialogHeader>
            <DialogTitle>Recusar matrícula?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-normal text-(--color-text-muted)">
            O responsável será avisado de que o cadastro precisa de ajustes.
            Esta ação não gera cobrança.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => setRejectOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setRejectOpen(false);
                toast("Matrícula recusada", "error");
                goToList();
              }}
            >
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

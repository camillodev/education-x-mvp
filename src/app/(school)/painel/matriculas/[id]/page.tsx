"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, UserCheck, AlertTriangle, Info, UserPlus } from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import {
  StudentCard,
  emptyStudent,
  monthlyOf,
  type StudentDraft,
} from "@/components/school/StudentCard";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionHead } from "@/components/patterns/SectionHead";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import type { Enrollment, EnrollmentPlan } from "@/lib/mock/types";

const MAX_STUDENTS = 5;

interface Guardian {
  pagante: string;
  cpf: string;
  email: string;
  tel: string;
}

export default function MatriculaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, loading, error } = useMockResource<Enrollment[]>("/api/mock/matriculas");
  const { data: plansData } = useMockResource<EnrollmentPlan[]>("/api/mock/planos");
  const enrollments = useMemo(() => data ?? [], [data]);
  const plans = useMemo(() => plansData ?? [], [plansData]);
  const enrollment = enrollments.find((m) => m.id === id);

  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [students, setStudents] = useState<StudentDraft[] | null>(null);

  // Hidrata o form uma vez, quando a matrícula chega do fetch.
  useEffect(() => {
    if (!enrollment || guardian) return;
    setGuardian({
      pagante: enrollment.pagante,
      cpf: enrollment.cpf,
      email: enrollment.email,
      tel: enrollment.tel,
    });
    setStudents([
      {
        aluno: enrollment.aluno,
        nascimento: enrollment.nascimento,
        materias: [...enrollment.materias],
        plano: enrollment.plano,
        desconto: false,
        descontoTipo: "PERCENT",
        descontoVal: "0",
      },
    ]);
  }, [enrollment, guardian]);

  const goToList = () => router.push("/painel/matriculas");

  if (loading || (enrollment && !guardian)) {
    return (
      <SchoolShell title="Matrícula" onBack={goToList} maxWidth={760}>
        <p className="py-8 text-center text-sm text-(--color-text-subtle)">Carregando…</p>
      </SchoolShell>
    );
  }

  if (error || !enrollment || !guardian || !students) {
    return (
      <SchoolShell title="Matrícula" onBack={goToList} maxWidth={760}>
        <p className="py-8 text-center text-sm text-(--color-danger-primary)">
          {error ?? "Matrícula não encontrada."}
        </p>
      </SchoolShell>
    );
  }

  const isApproval = enrollment.status === "pendente";
  const totalMensal = students.reduce((sum, s) => sum + monthlyOf(s, plans), 0);

  const patchStudent = (i: number, patch: Partial<StudentDraft>) =>
    setStudents((prev) => (prev ?? []).map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStudent = () =>
    setStudents((prev) => ((prev ?? []).length < MAX_STUDENTS ? [...(prev ?? []), emptyStudent()] : prev));
  const removeStudent = (i: number) =>
    setStudents((prev) => (prev ?? []).filter((_, j) => j !== i));

  return (
    <SchoolShell
      title={isApproval ? "Revisar matrícula" : "Editar matrícula"}
      subtitle={`${enrollment.pagante} · ${students.length} aluno${students.length > 1 ? "s" : ""}`}
      onBack={goToList}
      maxWidth={760}
    >
      <div className="flex flex-col gap-[18px]">
        {enrollment.aceiteEm && (
          <Card className="flex items-center gap-3 border border-(--badge-success-fg)/30 bg-(--badge-success-bg) p-4">
            <FileCheck2 size={20} className="shrink-0 text-(--badge-success-fg)" />
            <span className="text-[13.5px] font-semibold text-(--badge-success-fg)">
              Responsável aceitou os termos em {enrollment.aceiteEm} — aceite registrado (prova legal).
            </span>
          </Card>
        )}

        {enrollment.selfPayer && (
          <Card className="flex items-center gap-[11px] border border-(--color-primary-soft) bg-(--color-primary-softer) p-3.5">
            <UserCheck size={18} className="shrink-0 text-(--color-primary)" />
            <span className="text-[13.5px] text-(--color-text-muted)">
              Aluno adulto: <strong className="text-(--color-text)">{enrollment.aluno}</strong> é o
              próprio pagante.
            </span>
          </Card>
        )}

        <Card className="p-6">
          <SectionHead
            title={enrollment.selfPayer ? "Pagante (próprio aluno)" : "Responsável financeiro"}
            sub="Edite os dados antes de aprovar"
          />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nome" required>
                <Input
                  value={guardian.pagante}
                  onChange={(e) => setGuardian({ ...guardian, pagante: e.target.value })}
                />
              </Field>
              <Field label="CPF">
                <Input
                  value={guardian.cpf}
                  onChange={(e) => setGuardian({ ...guardian, cpf: e.target.value })}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="E-mail" required>
                <Input
                  type="email"
                  value={guardian.email}
                  onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={guardian.tel}
                  onChange={(e) => setGuardian({ ...guardian, tel: e.target.value })}
                  inputMode="tel"
                />
              </Field>
            </div>
          </div>
        </Card>

        {students.map((student, i) => (
          <StudentCard
            key={i}
            index={i}
            student={student}
            plans={plans}
            onChange={(patch) => patchStudent(i, patch)}
            onRemove={students.length > 1 ? () => removeStudent(i) : undefined}
          />
        ))}

        <Card className="flex flex-wrap items-center justify-between gap-4 bg-(--color-primary) p-5 text-white">
          <div>
            <div className="text-[13px] font-semibold opacity-85">Total mensal da matrícula</div>
            <div className="mt-0.5 text-[12.5px] opacity-80">
              {students.length} aluno{students.length > 1 ? "s" : ""} · já com descontos aplicados
            </div>
          </div>
          <div className="text-[30px] font-extrabold tracking-[-0.02em]">
            {formatBRL(totalMensal)}
            <span className="text-sm font-medium opacity-85">/mês</span>
          </div>
        </Card>

        {students.length < MAX_STUDENTS ? (
          <Button variant="secondary" onClick={addStudent} className="self-start">
            <UserPlus size={16} />
            Adicionar aluno
          </Button>
        ) : (
          <div className="inline-flex items-center gap-[7px] text-[13px] text-(--color-text-subtle)">
            <Info size={15} />
            Limite de {MAX_STUDENTS} alunos por responsável atingido.
          </div>
        )}

        {isApproval ? (
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="danger-outline" onClick={() => setRejectOpen(true)}>
              Recusar
            </Button>
            <Button
              size="lg"
              iconLeft="check"
              onClick={() => {
                toast("Matrícula aprovada — 1ª cobrança será emitida no fechamento", "success");
                goToList();
              }}
            >
              Aprovar matrícula
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button variant="tertiary" onClick={goToList}>
              Cancelar
            </Button>
            <Button
              size="lg"
              iconLeft="save"
              onClick={() => {
                toast("Alterações salvas", "success");
                goToList();
              }}
            >
              Salvar alterações
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <div className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[11px] bg-(--color-danger-soft)">
            <AlertTriangle size={22} className="text-(--color-danger-primary)" />
          </div>
          <DialogHeader>
            <DialogTitle>Recusar matrícula?</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-normal text-(--color-text-muted)">
            O responsável será avisado de que o cadastro precisa de ajustes. Esta ação não gera
            cobrança.
          </p>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Ban, Repeat, Wallet } from "lucide-react";
import { SchoolShell } from "@/components/school/SchoolShell";
import { StudentCard, emptyStudent, type StudentDraft } from "@/components/school/StudentCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { SectionHead } from "@/components/patterns/SectionHead";
import { useToast } from "@/components/ui/toast";
import { useMockResource } from "@/hooks/use-mock-resource";
import { formatBRL } from "@/lib/format";
import { computeDiscountedCents, type DiscountType } from "@/lib/pricing";
import type { EnrollmentPlan } from "@/lib/mock/types";

const MAX_STUDENTS = 5;

type Tab = "cadastro" | "plano";

const TABS: SegmentedOption<Tab>[] = [
  { value: "cadastro", label: "1 · Cadastro" },
  { value: "plano", label: "2 · Plano e cobrança" },
];

export default function NovaMatriculaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("cadastro");

  const { data: plansData } = useMockResource<EnrollmentPlan[]>("/api/mock/planos");
  const plans = useMemo(() => plansData ?? [], [plansData]);

  const [pagante, setPagante] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [temEndereco, setTemEndereco] = useState(false);
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [students, setStudents] = useState<StudentDraft[]>([emptyStudent()]);
  const [plano, setPlano] = useState("Mensal");
  const [descontoTipo, setDescontoTipo] = useState<DiscountType>("PERCENT");
  const [descontoVal, setDescontoVal] = useState("0");
  const [vencimento, setVencimento] = useState("10");

  const goToList = () => router.push("/painel/matriculas");

  const planoObj = plans.find((p) => p.nome === plano) ?? plans[0];
  const planoMensal = plans.find((p) => p.id === "mensal") ?? plans[0];
  const baseMensal = planoMensal?.parcela ?? 0;
  const comPlano = planoObj?.parcela ?? 0;
  const { discountCents, finalCents: totalMensal } = computeDiscountedCents(
    comPlano,
    descontoTipo,
    descontoVal
  );
  const economiaAnual = Math.max(0, (baseMensal - totalMensal) * 12);

  const maxed = students.length >= MAX_STUDENTS;
  const cadastroOk = Boolean(pagante && email && students.every((s) => s.aluno));

  const patchStudent = (i: number, patch: Partial<StudentDraft>) =>
    setStudents((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStudent = () =>
    setStudents((prev) => (prev.length >= MAX_STUDENTS ? prev : [...prev, emptyStudent()]));
  const removeStudent = (i: number) => setStudents((prev) => prev.filter((_, j) => j !== i));

  return (
    <SchoolShell
      title="Nova matrícula"
      subtitle="Preencha os dados — o responsável só confirma e dá o aceite"
      onBack={goToList}
      maxWidth={760}
    >
      <div className="flex flex-col gap-[18px]">
        <div className="overflow-x-auto pb-0.5">
          <Segmented options={TABS} value={tab} onChange={setTab} />
        </div>

        {tab === "cadastro" && (
          <>
            <Card className="flex items-center gap-[11px] border border-(--color-primary-soft) bg-(--color-toast-info-bg) p-4">
              <Info size={18} className="shrink-0 text-(--color-primary)" />
              <span className="text-[13.5px] leading-normal text-(--color-text-muted)">
                Tem processo de matrícula próprio? Cadastre aqui e envie ao pai só para{" "}
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
                  <Field label="Nome" required>
                    <Input value={pagante} onChange={(e) => setPagante(e.target.value)} placeholder="Ex.: Maria Silva" />
                  </Field>
                  <Field label="CPF">
                    <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="E-mail" required hint="Recebe o link de confirmação">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </Field>
                  <Field label="Celular (WhatsApp)">
                    <Input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(31) 90000-0000" />
                  </Field>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <div className="text-[13.5px] font-semibold">Adicionar endereço</div>
                    <div className="mt-0.5 text-xs text-(--color-text-subtle)">
                      Opcional — usado na nota fiscal e no contrato
                    </div>
                  </div>
                  <Toggle checked={temEndereco} onChange={setTemEndereco} />
                </div>
                {temEndereco && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="CEP">
                        <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" inputMode="numeric" />
                      </Field>
                      <Field label="Cidade">
                        <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Belo Horizonte" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Rua">
                        <Input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Av. Exemplo" />
                      </Field>
                      <Field label="Número">
                        <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="420" inputMode="numeric" />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {students.map((student, i) => (
              <StudentCard
                key={i}
                index={i}
                student={student}
                plans={plans}
                hidePlan
                onChange={(patch) => patchStudent(i, patch)}
                onRemove={students.length > 1 ? () => removeStudent(i) : undefined}
              />
            ))}

            <button
              type="button"
              onClick={addStudent}
              disabled={maxed}
              className={`flex items-center justify-center gap-2 rounded-(--radius-md) border-[1.5px] border-dashed p-[13px] text-sm font-bold ${
                maxed
                  ? "cursor-not-allowed border-(--color-border) text-(--color-text-subtle) opacity-70"
                  : "cursor-pointer border-(--color-primary) text-(--color-primary)"
              }`}
            >
              {maxed ? <Ban size={17} /> : <Plus size={17} />}
              {maxed ? "Máximo de alunos" : "Adicionar aluno"}
            </button>

            <div className="flex justify-between gap-3">
              <Button variant="tertiary" onClick={goToList}>
                Cancelar
              </Button>
              <Button
                size="lg"
                iconRight="arrow-right"
                disabled={!cadastroOk}
                onClick={() => setTab("plano")}
              >
                Continuar para plano
              </Button>
            </div>
          </>
        )}

        {tab === "plano" && (
          <>
            <Card className="p-6">
              <SectionHead title="Plano" sub="Quanto mais longo o período, maior o desconto" />
              <div className="flex flex-col gap-2.5">
                {plans.map((p) => {
                  const active = plano === p.nome;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPlano(p.nome)}
                      className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border-2 px-4 py-[15px] text-left transition-all ${
                        active
                          ? "border-(--color-primary) bg-(--color-primary-softer)"
                          : "border-(--color-border-input) bg-(--color-bg)"
                      }`}
                    >
                      <span
                        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? "border-(--color-primary)" : "border-(--color-border-input)"
                        }`}
                      >
                        {active && <span className="h-[11px] w-[11px] rounded-full bg-(--color-primary)" />}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15.5px] font-bold">{p.nome}</span>
                          {p.badge && (
                            <Badge variant={p.id === "anual" ? "success" : "primary"} size="sm">
                              {p.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[13px] text-(--color-text-subtle)">{p.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-(--color-text)">{formatBRL(p.parcela)}</div>
                        <div className="text-[11.5px] text-(--color-text-subtle)">/mês</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3.5 flex items-start gap-[9px] rounded-(--radius-md) bg-(--color-surface) px-3.5 py-3 text-[12.5px] leading-normal text-(--color-text-muted)">
                <Repeat size={15} className="mt-px shrink-0 text-(--color-primary)" />
                <span>
                  Cobrança recorrente como <strong className="text-(--color-text)">assinatura</strong> —
                  sem parcelamento. O responsável paga via cartão, boleto ou PIX.
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <SectionHead title="Desconto de negociação" sub="Aplicado sobre a mensalidade total" />
              <div className="flex items-center gap-2.5">
                <Segmented
                  size="sm"
                  value={descontoTipo}
                  onChange={setDescontoTipo}
                  options={[
                    { value: "PERCENT" as DiscountType, label: "%" },
                    { value: "FIXED" as DiscountType, label: "R$" },
                  ]}
                />
                <Input
                  className="flex-1"
                  value={descontoVal}
                  onChange={(e) => setDescontoVal(e.target.value)}
                  inputMode="decimal"
                  placeholder={descontoTipo === "PERCENT" ? "10" : "50,00"}
                  trailing={
                    descontoTipo === "PERCENT" ? (
                      <span className="text-[13.5px] font-semibold text-(--color-text-muted)">%</span>
                    ) : undefined
                  }
                />
              </div>
            </Card>

            <Card className="p-6">
              <SectionHead
                title="Vencimento da fatura"
                sub="Vem das configurações da escola — ajuste se precisar"
              />
              <Field label="Dia do vencimento" hint="Todo mês o boleto vence neste dia">
                <Input
                  className="max-w-[220px]"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  inputMode="numeric"
                  trailing={
                    <span className="whitespace-nowrap text-[13.5px] font-semibold text-(--color-text-muted)">
                      de cada mês
                    </span>
                  }
                />
              </Field>
            </Card>

            <Card className="p-6">
              <SectionHead
                title="Resumo da cobrança"
                sub={`${students.length} ${students.length === 1 ? "aluno" : "alunos"} · plano ${plano} · vence dia ${vencimento}`}
              />
              <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
                {[
                  ["Mensalidade cheia", formatBRL(baseMensal)],
                  [`Desconto do plano ${plano}`, `− ${formatBRL(Math.max(0, baseMensal - comPlano))}`],
                  ["Desconto de negociação", `− ${formatBRL(discountCents)}`],
                  ["Economia anual total", formatBRL(economiaAnual)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between bg-(--color-bg) px-4 py-3 text-[13.5px]"
                  >
                    <span className="text-(--color-text-subtle)">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex items-center justify-between rounded-(--radius-md) bg-(--color-primary) p-[18px] text-white">
                <span className="inline-flex items-center gap-[9px]">
                  <Wallet size={18} />
                  <span className="text-sm font-semibold opacity-90">Total mensal a pagar</span>
                </span>
                <span className="text-[26px] font-extrabold tracking-[-0.02em]">
                  {formatBRL(totalMensal)}
                </span>
              </div>
            </Card>

            <div className="flex justify-between gap-3">
              <Button variant="tertiary" iconLeft="arrow-left" onClick={() => setTab("cadastro")}>
                Voltar
              </Button>
              <Button
                size="lg"
                iconRight="send"
                disabled={!cadastroOk}
                onClick={() => {
                  toast(`Link de confirmação enviado para ${email}`, "success");
                  goToList();
                }}
              >
                Enviar para confirmação
              </Button>
            </div>
          </>
        )}
      </div>
    </SchoolShell>
  );
}

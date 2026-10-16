"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { computeDiscountedCents } from "@/lib/pricing";
import {
  lookupAddressByPostalCode,
  type PostalAddress,
} from "@/lib/services/cep.service";
import {
  createEmptyStudentValues,
  EnrollmentFormSchema,
  type EnrollmentFormValues,
  type EnrollmentMode,
  type EnrollmentPlan,
} from "./enrollment-form.schema";

const MAX_STUDENTS = 5;

interface UseEnrollmentFormOptions {
  mode: EnrollmentMode;
  initialValues: EnrollmentFormValues;
  plans: EnrollmentPlan[];
  onSubmit: (values: EnrollmentFormValues) => void;
}

export function useEnrollmentForm({
  mode,
  initialValues,
  plans,
  onSubmit,
}: UseEnrollmentFormOptions) {
  const [step, setStep] = useState<"guardian" | "plan">("guardian");
  const [postalLookup, setPostalLookup] = useState<
    { status: "idle" | "loading" | "success" | "error"; message?: string }
  >({ status: "idle" });
  const lastAutoAddress = useRef<Partial<PostalAddress>>({});
  const methods = useForm<EnrollmentFormValues>({
    resolver: zodResolver(EnrollmentFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: initialValues,
  });

  const { control, handleSubmit, trigger, getValues, setValue } = methods;
  const { fields: studentFields, append, remove } = useFieldArray({
    control,
    name: "students",
  });
  const watchedValues = useWatch({ control });
  const values: EnrollmentFormValues = {
    ...initialValues,
    ...watchedValues,
    guardian: { ...initialValues.guardian, ...watchedValues.guardian },
    students: (watchedValues.students ?? initialValues.students).map((
      student,
      index,
    ) => ({
      ...createEmptyStudentValues(),
      ...initialValues.students[index],
      ...student,
    })),
    plan: { ...initialValues.plan, ...watchedValues.plan },
  };
  const postalCode = values.guardian.postalCode.replace(/\D/g, "");

  useEffect(() => {
    if (postalCode.length !== 8) {
      setPostalLookup({ status: "idle" });
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setPostalLookup({ status: "loading", message: "Consultando CEP…" });
      try {
        const address = await lookupAddressByPostalCode(postalCode);
        if (!active) return;
        const current = getValues("guardian");
        const fields: Array<
          [
            keyof PostalAddress,
            "address" | "complement" | "province" | "city" | "state",
          ]
        > = [
          ["address", "address"],
          ["complement", "complement"],
          ["province", "province"],
          ["city", "city"],
          ["state", "state"],
        ];
        for (const [addressKey, formKey] of fields) {
          if (
            !current[formKey] ||
            current[formKey] === lastAutoAddress.current[addressKey]
          ) {
            setValue(`guardian.${formKey}`, address[addressKey], {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }
        lastAutoAddress.current = address;
        setPostalLookup({
          status: "success",
          message: "Endereço preenchido pelo CEP. Você pode editá-lo.",
        });
      } catch (error) {
        if (active) {
          setPostalLookup({
            status: "error",
            message: error instanceof Error
              ? error.message
              : "Não foi possível consultar o CEP.",
          });
        }
      }
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [postalCode, getValues, setValue]);

  const baseMonthlyCents = useMemo(
    () =>
      plans.find((plan) => plan.id === "mensal")?.parcela ??
        plans[0]?.parcela ?? 0,
    [plans],
  );
  const selectedPlan = plans.find((plan) => plan.nome === values.plan.plan) ??
    plans[0];
  const selectedPlanCents = selectedPlan?.parcela ?? 0;
  const globalDiscount = computeDiscountedCents(
    selectedPlanCents,
    values.plan.discountType,
    values.plan.discountValue,
  );

  const totalMonthlyCents = mode === "create"
    ? globalDiscount.finalCents
    : values.students.reduce((total, student) => {
      const plan = plans.find((item) => item.nome === student.plan) ?? plans[0];
      if (!plan) return total;
      const monthly = student.discount
        ? computeDiscountedCents(
          plan.parcela,
          student.discountType,
          student.discountValue,
        ).finalCents
        : plan.parcela;
      return total + monthly;
    }, 0);

  async function goToPlanStep() {
    const valid = await trigger(["guardian", "students"]);
    if (valid) setStep("plan");
  }

  function goToGuardianStep() {
    setStep("guardian");
  }

  function addStudent() {
    if (studentFields.length < MAX_STUDENTS) append(createEmptyStudentValues());
  }

  function removeStudent(index: number) {
    if (studentFields.length > 1) remove(index);
  }

  return {
    methods,
    step,
    studentFields,
    values,
    baseMonthlyCents,
    selectedPlan,
    selectedPlanCents,
    globalDiscount,
    totalMonthlyCents,
    postalLookup,
    annualSavings: Math.max(
      0,
      (baseMonthlyCents - globalDiscount.finalCents) * 12,
    ),
    addStudent,
    removeStudent,
    goToPlanStep,
    goToGuardianStep,
    setStep,
    submit: handleSubmit(onSubmit),
  };
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  resolveEnrollmentLink,
  submitGuardianStep,
} from "@/lib/services/enrollment.service";
import { GuardianStepSchema } from "@/lib/validations/guardian";
import { GUARDIAN_COOKIE } from "./cookie";

export interface GuardianStepFormState {
  errors: Partial<
    Record<
      | "name"
      | "cpfCnpj"
      | "email"
      | "mobilePhone"
      | "postalCode"
      | "address"
      | "addressNumber"
      | "complement"
      | "province"
      | "city"
      | "state"
      | "phone"
      | "additionalEmails"
      | "type",
      string
    >
  >;
}

export async function submitGuardianStepAction(
  token: string,
  _prevState: GuardianStepFormState,
  formData: FormData,
): Promise<GuardianStepFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    cpfCnpj: String(formData.get("cpfCnpj") ?? ""),
    email: String(formData.get("email") ?? ""),
    mobilePhone: String(formData.get("mobilePhone") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    address: String(formData.get("address") ?? ""),
    addressNumber: String(formData.get("addressNumber") ?? ""),
    complement: String(formData.get("complement") ?? ""),
    province: String(formData.get("province") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    additionalEmails: String(formData.get("additionalEmails") ?? ""),
    type: String(formData.get("type") ?? ""),
  };

  const parsed = GuardianStepSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: GuardianStepFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof GuardianStepFormState["errors"];
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const { unitId } = await resolveEnrollmentLink(token);
  const cookieStore = await cookies();
  const existingGuardianId = cookieStore.get(GUARDIAN_COOKIE)?.value ?? null;

  const guardian = await submitGuardianStep(
    unitId,
    existingGuardianId,
    parsed.data,
  );

  cookieStore.set(GUARDIAN_COOKIE, guardian.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/m",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(`/m/${token}/aluno` as Route);
}

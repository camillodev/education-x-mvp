'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { resolveEnrollmentLink, submitPlanStep } from '@/lib/services/enrollment.service'
import { PlanStepSchema } from '@/lib/validations/plan'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { STUDENTS_COOKIE, decodeStudentsCookie } from '../aluno/cookie'
import { PLAN_COOKIE } from './cookie'

export interface PlanStepFormState {
  error?: string
}

export async function submitPlanStepAction(
  token: string,
  _prevState: PlanStepFormState,
  formData: FormData
): Promise<PlanStepFormState> {
  const parsed = PlanStepSchema.safeParse({ plan: String(formData.get('plan') ?? '') })
  if (!parsed.success) {
    return { error: 'Escolha um plano para continuar.' }
  }

  const cookieStore = await cookies()
  const guardianId = cookieStore.get(GUARDIAN_COOKIE)?.value
  const selection = decodeStudentsCookie(cookieStore.get(STUDENTS_COOKIE)?.value)

  if (!guardianId || selection.length === 0) {
    return { error: 'Sessão expirada. Volte e preencha os dados novamente.' }
  }

  const { unitId } = await resolveEnrollmentLink(token)
  await submitPlanStep(unitId, guardianId, selection, parsed.data.plan)

  cookieStore.set(PLAN_COOKIE, parsed.data.plan, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/m',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(`/m/${token}/revisao` as Route)
}

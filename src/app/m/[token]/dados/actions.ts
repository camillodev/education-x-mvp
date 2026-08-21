'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { resolveEnrollmentLink, submitGuardianStep } from '@/lib/services/enrollment.service'
import { GuardianStepSchema } from '@/lib/validations/guardian'

const GUARDIAN_COOKIE = 'edu_matricula_guardian_id'

export interface GuardianStepFormState {
  errors: Partial<Record<'name' | 'cpf' | 'email' | 'phone' | 'type', string>>
}

export async function submitGuardianStepAction(
  token: string,
  _prevState: GuardianStepFormState,
  formData: FormData
): Promise<GuardianStepFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    cpf: String(formData.get('cpf') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    type: String(formData.get('type') ?? ''),
  }

  const parsed = GuardianStepSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: GuardianStepFormState['errors'] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof GuardianStepFormState['errors']
      if (key && !errors[key]) errors[key] = issue.message
    }
    return { errors }
  }

  const { unitId } = await resolveEnrollmentLink(token)
  const cookieStore = await cookies()
  const existingGuardianId = cookieStore.get(GUARDIAN_COOKIE)?.value ?? null

  const guardian = await submitGuardianStep(unitId, existingGuardianId, parsed.data)

  cookieStore.set(GUARDIAN_COOKIE, guardian.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/m',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(`/m/${token}/aluno` as Route)
}

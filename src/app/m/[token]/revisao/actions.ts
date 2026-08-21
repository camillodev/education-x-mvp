'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { resolveEnrollmentLink, submitAcceptanceStep } from '@/lib/services/enrollment.service'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { ACCEPTANCE_COOKIE } from './cookie'

export interface AcceptanceStepFormState {
  error?: string
}

export async function submitAcceptanceStepAction(
  token: string,
  _prevState: AcceptanceStepFormState,
  formData: FormData
): Promise<AcceptanceStepFormState> {
  const accepted = formData.get('accepted') === 'true'
  if (!accepted) {
    return { error: 'É preciso ler e aceitar o contrato para enviar a matrícula.' }
  }

  const cookieStore = await cookies()
  const guardianId = cookieStore.get(GUARDIAN_COOKIE)?.value
  if (!guardianId) {
    return { error: 'Sessão expirada. Volte e preencha os dados novamente.' }
  }

  const { unitId } = await resolveEnrollmentLink(token)

  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    '0.0.0.0'

  await submitAcceptanceStep(unitId, guardianId, ip)

  cookieStore.set(ACCEPTANCE_COOKIE, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/m',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(`/m/${token}/enviado` as Route)
}

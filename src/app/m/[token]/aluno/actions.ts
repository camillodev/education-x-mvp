'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { resolveEnrollmentLink, submitStudentsStep } from '@/lib/services/enrollment.service'
import { StudentsStepSchema } from '@/lib/validations/student'
import { GUARDIAN_COOKIE } from '../dados/cookie'
import { STUDENTS_COOKIE, encodeStudentsCookie } from './cookie'

export interface StudentBlockFormState {
  formError?: string
  blockErrors: Array<{ name?: string; birthDate?: string; subjectIds?: string }>
}

export async function submitStudentsStepAction(
  token: string,
  _prevState: StudentBlockFormState,
  formData: FormData
): Promise<StudentBlockFormState> {
  const count = Number(formData.get('blockCount') ?? '0')
  const raw = Array.from({ length: count }, (_, i) => ({
    name: String(formData.get(`students[${i}].name`) ?? ''),
    birthDate: String(formData.get(`students[${i}].birthDate`) ?? ''),
    subjectIds: formData.getAll(`students[${i}].subjectIds`).map(String),
  }))

  const parsed = StudentsStepSchema.safeParse(raw)
  if (!parsed.success) {
    const blockErrors: StudentBlockFormState['blockErrors'] = raw.map(() => ({}))
    for (const issue of parsed.error.issues) {
      const blockIndex = issue.path[0]
      const field = issue.path[1]
      if (typeof blockIndex === 'number' && (field === 'name' || field === 'birthDate' || field === 'subjectIds')) {
        blockErrors[blockIndex][field] = issue.message
      }
    }
    return { blockErrors }
  }

  const cookieStore = await cookies()
  const guardianId = cookieStore.get(GUARDIAN_COOKIE)?.value
  if (!guardianId) {
    return { formError: 'Sessão expirada. Volte e preencha seus dados novamente.', blockErrors: [] }
  }

  const { unitId } = await resolveEnrollmentLink(token)
  const selection = await submitStudentsStep(unitId, guardianId, parsed.data)

  cookieStore.set(STUDENTS_COOKIE, encodeStudentsCookie(selection), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/m',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(`/m/${token}/plano` as Route)
}

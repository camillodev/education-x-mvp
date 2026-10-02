import type { StudentSubjectSelection } from '@/lib/services/enrollment.service'

export const STUDENTS_COOKIE = 'edu_matricula_students'

// Cookie guarda só ids (studentId->subjectIds) — nunca nome/data do aluno.
// B4 revalida ownership de cada studentId contra unitId+guardianId antes de usar.
export function encodeStudentsCookie(selection: StudentSubjectSelection[]): string {
  return JSON.stringify(selection)
}

export function decodeStudentsCookie(raw: string | undefined): StudentSubjectSelection[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is StudentSubjectSelection =>
        typeof item?.studentId === 'string' && Array.isArray(item?.subjectIds)
    )
  } catch {
    return []
  }
}

import { z } from 'zod'

// Parse seguro de DD/MM/AAAA — evita ambiguidade de engine (new Date('31/12/2015') varia
// por runtime) e valida cada componente por round-trip (rejeita 31/02, mês 13, etc).
export function parseBirthDate(input: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])

  const date = new Date(year, month - 1, day)
  const roundTrips =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  if (!roundTrips) return null

  return date
}

function isPlausibleBirthDate(date: Date): boolean {
  const now = new Date()
  if (date.getTime() > now.getTime()) return false
  const age = now.getFullYear() - date.getFullYear()
  return age >= 0 && age <= 99
}

export const StudentBlockSchema = z.object({
  name: z.string().trim().min(2, 'Digite o nome do aluno.'),
  birthDate: z
    .string()
    .transform((v, ctx) => {
      const parsed = parseBirthDate(v)
      if (!parsed || !isPlausibleBirthDate(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'Verifique a data de nascimento.' })
        return z.NEVER
      }
      return parsed
    }),
  subjectIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos uma matéria.'),
})

export const StudentsStepSchema = z.array(StudentBlockSchema).min(1).max(5)

export type StudentBlockInput = z.input<typeof StudentBlockSchema>
export type StudentBlockOutput = z.output<typeof StudentBlockSchema>

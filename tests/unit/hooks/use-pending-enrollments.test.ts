import { filterPendingEnrollments, type PendingEnrollmentItem } from '@/hooks/use-pending-enrollments'

const list: PendingEnrollmentItem[] = [
  { guardianId: 'g1', guardianName: 'Maria da Silva', plan: 'MONTHLY', students: ['João', 'Ana'], totalCents: 55000 },
  { guardianId: 'g2', guardianName: 'Carlos Souza', plan: 'ANNUAL', students: ['Beto'], totalCents: 24000 },
]

it('filtra por nome do responsável', () => {
  expect(filterPendingEnrollments(list, 'maria')).toHaveLength(1)
})
it('filtra por nome do aluno', () => {
  expect(filterPendingEnrollments(list, 'beto')).toHaveLength(1)
})
it('sem query retorna tudo', () => {
  expect(filterPendingEnrollments(list, '')).toHaveLength(2)
})
it('sem match retorna vazio', () => {
  expect(filterPendingEnrollments(list, 'inexistente')).toHaveLength(0)
})

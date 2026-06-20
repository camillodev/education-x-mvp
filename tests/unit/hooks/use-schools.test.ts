import { filterSchools, type SchoolListItem } from '@/hooks/use-schools'

const base: SchoolListItem = {
  id: '1', name: 'Kumon Camargos', cnpj: '11222333000190', city: 'BH', state: 'MG',
  status: 'ACTIVE', createdAt: new Date().toISOString() as unknown as Date,
  subjectCount: 2, franchiseParent: 'Kumon',
}
const list: SchoolListItem[] = [
  base,
  { ...base, id: '2', name: 'Cultura Inglesa Lourdes', cnpj: '99888777000144', franchiseParent: 'Cultura Inglesa', status: 'SUSPENDED' },
]

it('filtra por query (nome)', () => {
  expect(filterSchools(list, { query: 'cultura', franchise: 'all', status: 'all' })).toHaveLength(1)
})
it('filtra por query (cnpj parcial)', () => {
  expect(filterSchools(list, { query: '000190', franchise: 'all', status: 'all' })).toHaveLength(1)
})
it('filtra por franquia', () => {
  expect(filterSchools(list, { query: '', franchise: 'Kumon', status: 'all' })).toHaveLength(1)
})
it('filtra por status', () => {
  expect(filterSchools(list, { query: '', franchise: 'all', status: 'SUSPENDED' })).toHaveLength(1)
})
it('sem filtro retorna tudo', () => {
  expect(filterSchools(list, { query: '', franchise: 'all', status: 'all' })).toHaveLength(2)
})

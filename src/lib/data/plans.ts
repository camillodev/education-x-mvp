// Planos da Education X que a escola contrata (escola → Impact X).
// Editável no código por enquanto (sem painel admin). Valores em CENTAVOS.
// Não confundir com a recorrência de plano do ALUNO (matrícula, Tarefa 2).

export const SCHOOL_PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    priceCents: 39900,
    limit: 'até 200 cobranças/mês',
    desc: 'Cobrança automática, PIX e boleto',
  },
  {
    id: 'crescimento',
    name: 'Crescimento',
    priceCents: 49900,
    limit: '201 a 500 cobranças/mês',
    desc: 'Tudo do Básico, com mais volume',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 69900,
    limit: '501 a 1.000 cobranças/mês',
    desc: 'Tudo do Crescimento + relatórios avançados',
  },
] as const

export type SchoolPlanId = (typeof SCHOOL_PLANS)[number]['id']

export function getPlan(id: SchoolPlanId) {
  return SCHOOL_PLANS.find((p) => p.id === id)
}

import { prisma } from '@/lib/db'
import { TEST_PREFIX, cleanupUnits } from '../integration/_setup'

export { TEST_PREFIX, cleanupUnits }

export async function seedSchool(opts: { name: string; cnpj: string; franchiseParent?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING' }) {
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} ${opts.name}`, cnpj: opts.cnpj, email: 'e@e.com', phone: '31999990000',
      cep: '30000000', address: 'Rua Teste', number: '1', neighborhood: 'Centro', city: 'BH', state: 'MG',
      isFranchise: !!opts.franchiseParent, franchiseParent: opts.franchiseParent ?? null,
      responsibleName: 'Resp Teste', responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: opts.status ?? 'ACTIVE',
      billingConfig: { create: {
        dueDay: 5, closingDay: 1, lateFeePercent: 100, monthlyInterestBp: 100,
        cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'RESPONSAVEL', municipalRegistration: '0001',
        planId: 'basico', planPriceCents: 39900,
      }},
      subjects: { create: [{ name: 'Mat', nfseServiceCode: '0001', priceCents: 10000, annualPriceCents: 100000 }] },
    },
  })
}

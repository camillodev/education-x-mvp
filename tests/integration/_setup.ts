import { prisma } from '@/lib/db'

// Prefixo de nome que marca dados criados por testes de integração.
// Cada teste cria Units com este prefixo e limpa por ele — sem sujar dados reais.
export const TEST_PREFIX = '__itest__'

// Deleta Units de teste. onDelete: Cascade no schema limpa BillingConfig + Subject juntos.
export async function cleanupUnits(prefix: string = TEST_PREFIX): Promise<void> {
  await prisma.unit.deleteMany({ where: { name: { startsWith: prefix } } })
}

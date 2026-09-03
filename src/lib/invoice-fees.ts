// Função pura extraída de invoice-detail.service.ts pra poder ser importada em Client
// Components (a tela de detalhe usa isso pra exibir multa/juros) sem puxar Prisma/forUnit
// pro bundle do browser — importar o service inteiro nesse caso inflava o bundle de
// /cobrancas/[id] de ~5kB pra ~150kB (Prisma Client entrando no client-side).
export function calculateLateFeeAndInterest(
  billingConfig: { lateFeePercent: number; monthlyInterestBp: number },
  amountCents: number,
  dueDate: Date,
  now: Date
): { lateFeeCents: number; interestCents: number } {
  const dueDateUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate())
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  // Cobrança ainda não venceu — sem multa/juros. Caller deve chamar isso só quando
  // status=OVERDUE, mas a função não confia nisso: fica correta por construção mesmo se
  // chamada antes do vencimento (achado de code review, EDU-28).
  if (nowUTC < dueDateUTC) {
    return { lateFeeCents: 0, interestCents: 0 }
  }

  const lateFeeCents = Math.round((amountCents * billingConfig.lateFeePercent) / 10000)
  const daysLate = Math.max(1, Math.round((nowUTC - dueDateUTC) / 86400000))
  const interestCents = Math.round(
    ((amountCents * billingConfig.monthlyInterestBp) / 10000) * (daysLate / 30)
  )

  return { lateFeeCents, interestCents }
}

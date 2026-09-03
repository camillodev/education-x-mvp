// Mapa local de status de Invoice — mesmo padrão do EDU-27 (InvoicesTable.tsx), que também
// usa mapa local em vez do StatusBadge genérico. Duplicado propositalmente até a PR do EDU-27
// mergear (ainda não existe nesta branch); dedup vira follow-up quando isso acontecer.
export const INVOICE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
  BLOCKED: 'Aguardando cadastro',
  ERROR: 'Erro',
}

export const INVOICE_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  BLOCKED: 'warning',
  ERROR: 'danger',
}

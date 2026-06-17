// Classes de input compartilhadas pelos cards do StepDados.
// Extraídas para manter cada card sob o limite de 500 linhas.

export const inputBase =
  'mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1'
export const okBorder =
  'border-[var(--color-border-input)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]'
export const errorBorder = 'border-red-400 focus:border-red-500 focus:ring-red-500'

export function cnpjStatusBadge(status: string): { bg: string; text: string } {
  const s = status.toUpperCase()
  if (s === 'ATIVA') return { bg: 'bg-[var(--badge-success-bg)]', text: 'text-[var(--badge-success-fg)]' }
  if (s === 'BAIXADA' || s === 'INAPTA')
    return { bg: 'bg-[var(--badge-danger-bg)]', text: 'text-[var(--badge-danger-fg)]' }
  return { bg: 'bg-[var(--badge-warning-bg)]', text: 'text-[var(--badge-warning-fg)]' }
}

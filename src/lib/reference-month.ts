// Rótulo de competência "YYYY-MM" em UTC — fonte única, reaproveitada por cron/emissão avulsa/lote.
export function currentReferenceMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

import { timingSafeEqual, createHash } from 'crypto'

// Compara strings em tempo constante via hash (evita vazar tamanho/conteúdo por timing attack).
export function timingSafeStringEqual(a: string | null | undefined, b: string): boolean {
  if (!a || !b) return false
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

// Valida header "Authorization: Bearer <secret>" em tempo constante.
export function timingSafeBearerEqual(authHeader: string | null, secret: string): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false
  return timingSafeStringEqual(authHeader.slice(7), secret)
}

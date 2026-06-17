import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export class DecryptionError extends Error {
  constructor(cause?: unknown) {
    super('Falha ao decriptografar: chave inválida ou dado corrompido')
    this.name = 'DecryptionError'
    if (cause instanceof Error) {
      this.cause = cause
    }
  }
}

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('ENCRYPTION_KEY ausente')
  }
  // Aceita 64 chars hex OU 44 chars base64 (ambos = 32 bytes para AES-256).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) {
    return b64
  }
  throw new Error(
    'ENCRYPTION_KEY inválida: use 64 chars hex (openssl rand -hex 32) ou 44 chars base64 (openssl rand -base64 32)'
  )
}

// Formato armazenado: "iv:authTag:ciphertext" (todos hex)
export async function encrypt(plaintext: string): Promise<string> {
  const key = getKey()
  const iv = randomBytes(12) // 12 bytes = 96 bits (GCM standard)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export async function decrypt(stored: string): Promise<string> {
  const parts = stored.split(':')
  if (parts.length !== 3) {
    throw new DecryptionError()
  }

  const [ivHex, authTagHex, ciphertextHex] = parts

  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const ciphertext = Buffer.from(ciphertextHex, 'hex')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    throw new DecryptionError(err)
  }
}

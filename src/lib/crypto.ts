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
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY ausente ou inválida (deve ter 64 chars hex = 32 bytes)')
  }
  return Buffer.from(hex, 'hex')
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

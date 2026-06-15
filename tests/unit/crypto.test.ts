import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, DecryptionError } from '../../src/lib/crypto'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex para testes
})

describe('encrypt / decrypt', () => {
  it('round-trip: decrypt(encrypt(x)) === x', async () => {
    const plaintext = 'minha-api-key-secreta'
    const stored = await encrypt(plaintext)
    const recovered = await decrypt(stored)
    expect(recovered).toBe(plaintext)
  })

  it('IV é único por chamada (dois encrypts produzem valores diferentes)', async () => {
    const a = await encrypt('mesma-string')
    const b = await encrypt('mesma-string')
    expect(a).not.toBe(b)
  })

  it('formato armazenado é iv:authTag:ciphertext', async () => {
    const stored = await encrypt('qualquer-coisa')
    const parts = stored.split(':')
    expect(parts).toHaveLength(3)
    // iv = 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24)
    // authTag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32)
    // ciphertext tem comprimento > 0
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it('decrypt com chave errada lança DecryptionError', async () => {
    const stored = await encrypt('dado-sensível')
    // Trocar a chave
    process.env.ENCRYPTION_KEY = 'b'.repeat(64)
    await expect(decrypt(stored)).rejects.toThrow(DecryptionError)
    // Restaurar
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  })

  it('decrypt com stored malformado lança DecryptionError', async () => {
    await expect(decrypt('invalido')).rejects.toThrow(DecryptionError)
  })

  it('criptografa strings com PII (CPF, email, telefone)', async () => {
    const cpf = '12345678901'
    const email = 'responsavel@email.com'
    const phone = '11999999999'

    const cpfEnc = await encrypt(cpf)
    const emailEnc = await encrypt(email)
    const phoneEnc = await encrypt(phone)

    expect(await decrypt(cpfEnc)).toBe(cpf)
    expect(await decrypt(emailEnc)).toBe(email)
    expect(await decrypt(phoneEnc)).toBe(phone)
  })
})

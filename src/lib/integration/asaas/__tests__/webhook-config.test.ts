import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { buildSubAccountWebhook } from '../webhook-config'

const TOKEN = 'a'.repeat(40)

describe('buildSubAccountWebhook', () => {
  const original = process.env.ASAAS_WEBHOOK_TOKEN
  const originalMode = process.env.ASAAS_MODE
  afterEach(() => {
    if (original === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN
    else process.env.ASAAS_WEBHOOK_TOKEN = original
    if (originalMode === undefined) delete process.env.ASAAS_MODE
    else process.env.ASAAS_MODE = originalMode
  })

  it('points at /api/webhook of the app with the global token and the three billing events', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = TOKEN

    expect(buildSubAccountWebhook('https://educationx.app/', 'ops@school.com')).toEqual({
      name: 'educationx',
      url: 'https://educationx.app/api/webhook',
      email: 'ops@school.com',
      sendType: 'SEQUENTIALLY',
      interrupted: false,
      enabled: true,
      apiVersion: 3,
      authToken: TOKEN,
      events: ['PAYMENT_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE'],
    })
  })

  it('fails loudly when ASAAS_WEBHOOK_TOKEN is missing', () => {
    delete process.env.ASAAS_WEBHOOK_TOKEN

    expect(() => buildSubAccountWebhook('https://educationx.app', 'ops@school.com')).toThrow(
      'ASAAS_WEBHOOK_TOKEN'
    )
  })

  it.each(['short', 'x'.repeat(256)])('rejects a token outside 32-255 chars (%#)', (token) => {
    process.env.ASAAS_WEBHOOK_TOKEN = token

    expect(() => buildSubAccountWebhook('https://educationx.app', 'ops@school.com')).toThrow(
      '32-255'
    )
  })

  it('never puts the token value in an error message', () => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'secret-too-short'

    expect(() => buildSubAccountWebhook('https://educationx.app', 'ops@school.com')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secret-too-short') })
    )
  })

  describe('in live mode', () => {
    beforeEach(() => {
      process.env.ASAAS_MODE = 'live'
      process.env.ASAAS_WEBHOOK_TOKEN = TOKEN
    })

    it.each([
      'http://educationx.app',
      'https://localhost:3000',
      'https://127.0.0.1',
      'https://0.0.0.0',
      'not a url',
    ])('rejects an unreachable or insecure app URL (%s)', (url) => {
      expect(() => buildSubAccountWebhook(url, 'ops@school.com')).toThrow('public https')
    })

    it('accepts a Vercel preview URL so the sandbox can be tested end to end', () => {
      expect(buildSubAccountWebhook('https://edx-git-develop.vercel.app', 'ops@school.com').url).toBe(
        'https://edx-git-develop.vercel.app/api/webhook'
      )
    })
  })

  it('does not restrict the URL outside live mode (mock client, local dev)', () => {
    process.env.ASAAS_MODE = 'mock'
    process.env.ASAAS_WEBHOOK_TOKEN = TOKEN

    expect(buildSubAccountWebhook('http://localhost:3000', 'ops@school.com').url).toBe(
      'http://localhost:3000/api/webhook'
    )
  })
})

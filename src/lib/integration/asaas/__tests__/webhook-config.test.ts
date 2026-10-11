import { describe, it, expect, afterEach } from 'vitest'
import { buildSubAccountWebhook } from '../webhook-config'

const TOKEN = 'a'.repeat(40)

describe('buildSubAccountWebhook', () => {
  const original = process.env.ASAAS_WEBHOOK_TOKEN
  afterEach(() => {
    if (original === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN
    else process.env.ASAAS_WEBHOOK_TOKEN = original
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
})

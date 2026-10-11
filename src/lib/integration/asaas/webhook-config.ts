import type { AsaasWebhookConfig } from './types'

const MIN_TOKEN_LENGTH = 32
const MAX_TOKEN_LENGTH = 255

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

// The URL cannot be edited after creation and the token travels on every delivery: in live mode
// a local or plain-http origin would strand the school's events and expose the token.
function assertPublicHttps(baseUrl: string): void {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error('Webhook base URL must be a public https URL')
  }
  if (url.protocol !== 'https:' || LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('Webhook base URL must be a public https URL')
  }
}

// Asaas never returns authToken on read, so the global token must be valid before the sub-account
// is created with it.
export function buildSubAccountWebhook(baseUrl: string, alertEmail: string): AsaasWebhookConfig {
  const authToken = process.env.ASAAS_WEBHOOK_TOKEN
  if (!authToken) throw new Error('ASAAS_WEBHOOK_TOKEN is not set')
  if (authToken.length < MIN_TOKEN_LENGTH || authToken.length > MAX_TOKEN_LENGTH) {
    throw new Error(`ASAAS_WEBHOOK_TOKEN must have ${MIN_TOKEN_LENGTH}-${MAX_TOKEN_LENGTH} characters`)
  }

  if (process.env.ASAAS_MODE === 'live') assertPublicHttps(baseUrl)

  return {
    name: 'educationx',
    url: `${baseUrl.replace(/\/$/, '')}/api/webhook`,
    email: alertEmail,
    sendType: 'SEQUENTIALLY',
    interrupted: false,
    enabled: true,
    apiVersion: 3,
    authToken,
    events: ['PAYMENT_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE'],
  }
}

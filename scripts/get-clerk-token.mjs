#!/usr/bin/env node
/**
 * get-clerk-token.mjs — gera um JWT de autenticação Clerk para testes via curl/CLI
 *
 * Estratégia 1 (sem sessão de browser — recomendada):
 *   Testing Token + sign-in flow via Frontend API
 *   Funciona sem sessão ativa no browser.
 *
 * Estratégia 2 (com sessão ativa no browser):
 *   Gera token a partir de sessão existente via Backend API.
 *
 * Uso:
 *   node scripts/get-clerk-token.mjs [templateName]
 *
 * Exemplo:
 *   node scripts/get-clerk-token.mjs
 *   node scripts/get-clerk-token.mjs jwt-firs-template
 *
 *   TOKEN=$(node scripts/get-clerk-token.mjs jwt-firs-template)
 *   curl -H "Authorization: Bearer $TOKEN" https://...
 *
 * Requer no .env:
 *   CLERK_SECRET_KEY, CLERK_TEST_EMAIL, CLERK_TEST_PASSWORD,
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *
 * Docs:
 *   https://clerk.com/docs/testing/clerk-testing-tokens
 *   https://clerk.com/docs/references/backend/sessions/get-token
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

// Carregar .env
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/)
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const secretKey = process.env.CLERK_SECRET_KEY
const templateName = process.argv[2] || null

if (!secretKey) {
  console.error('❌ CLERK_SECRET_KEY não encontrada no .env')
  process.exit(1)
}

// Extrair frontend API URL da publishable key
// Format: pk_test_<base64(frontendApiUrl)> ou pk_live_<base64>
const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''
let frontendApiUrl = ''
try {
  const b64 = pubKey.replace(/^pk_(test|live)_/, '')
  frontendApiUrl = Buffer.from(b64, 'base64').toString('utf-8').replace(/\$$/, '')
  if (!frontendApiUrl.startsWith('http')) {
    frontendApiUrl = `https://${frontendApiUrl}`
  }
} catch {
  frontendApiUrl = 'https://upright-ewe-86.clerk.accounts.dev'
}

console.error(`🔗 Frontend API: ${frontendApiUrl}`)

// --- Estratégia 1: Testing Token + sign-in flow (sem sessão de browser) ---
async function getTokenViaSignIn() {
  const email = process.env.CLERK_TEST_EMAIL
  const password = process.env.CLERK_TEST_PASSWORD

  if (!email || !password) {
    console.error('⚠️  CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD não definidos no .env')
    console.error('   Adicione ao .env:')
    console.error('   CLERK_TEST_EMAIL=rafael@impactxlab.com')
    console.error('   CLERK_TEST_PASSWORD=sua-senha-aqui')
    return null
  }

  // 1. Obter testing token (bypassa anti-bot)
  const testTokenRes = await fetch('https://api.clerk.com/v1/testing_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  if (!testTokenRes.ok) {
    console.error('❌ Erro ao obter testing token:', await testTokenRes.text())
    return null
  }
  const { token: testingToken } = await testTokenRes.json()
  console.error(`🧪 Testing token obtido`)

  // 2. Iniciar sign-in com email
  const signInRes = await fetch(
    `${frontendApiUrl}/v1/client/sign_ins?__clerk_testing_token=${testingToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ identifier: email }),
    }
  )
  const signInData = await signInRes.json()
  const signInId = signInData?.response?.id
  if (!signInId) {
    console.error('❌ Erro no sign-in step 1:', JSON.stringify(signInData).slice(0, 200))
    return null
  }

  // 3. Enviar password
  const attemptRes = await fetch(
    `${frontendApiUrl}/v1/client/sign_ins/${signInId}/attempt_first_factor?__clerk_testing_token=${testingToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ strategy: 'password', password }),
    }
  )
  const attemptData = await attemptRes.json()
  const sessionId = attemptData?.client?.last_active_session_id
    || attemptData?.response?.created_session_id
  if (!sessionId) {
    console.error('❌ Erro no sign-in step 2:', JSON.stringify(attemptData).slice(0, 300))
    return null
  }
  console.error(`✅ Sessão criada: ${sessionId}`)

  // 4. Gerar JWT (com template ou padrão)
  const tokenUrl = templateName
    ? `https://api.clerk.com/v1/sessions/${sessionId}/tokens/${templateName}`
    : `https://api.clerk.com/v1/sessions/${sessionId}/tokens`

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  })
  if (!tokenRes.ok) {
    console.error('❌ Erro ao gerar token:', await tokenRes.text())
    return null
  }
  const { jwt } = await tokenRes.json()
  if (templateName) {
    console.error(`🔑 Token com template "${templateName}" (~${(600000/3600).toFixed(0)}h de vida)`)
  } else {
    console.error(`⚠️  Token padrão (60s de vida)`)
  }
  return jwt
}

// --- Estratégia 2: sessão existente no browser ---
async function getTokenViaExistingSession() {
  const userId = process.env.CLERK_USER_ID || 'user_3BSIrcGV7ziY3T342pEPp0asaPk'
  const sessionsRes = await fetch(
    `https://api.clerk.com/v1/sessions?user_id=${userId}&status=active`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  )
  const sessions = await sessionsRes.json()
  const list = Array.isArray(sessions) ? sessions : sessions.data || []
  if (!list.length) return null

  const session = list[0]
  console.error(`📋 Sessão existente: ${session.id}`)
  const tokenUrl = templateName
    ? `https://api.clerk.com/v1/sessions/${session.id}/tokens/${templateName}`
    : `https://api.clerk.com/v1/sessions/${session.id}/tokens`

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  })
  if (!tokenRes.ok) return null
  const { jwt } = await tokenRes.json()
  return jwt
}

// Tentar estratégia 2 primeiro (sessão existente), depois estratégia 1
let jwt = await getTokenViaExistingSession()
if (!jwt) {
  console.error('ℹ️  Sem sessão ativa — tentando sign-in via testing token...')
  jwt = await getTokenViaSignIn()
}

if (!jwt) {
  console.error('\n❌ Não foi possível gerar token.')
  console.error('Adicione ao .env: CLERK_TEST_EMAIL e CLERK_TEST_PASSWORD')
  process.exit(1)
}

console.log(jwt)

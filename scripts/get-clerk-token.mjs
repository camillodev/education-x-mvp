#!/usr/bin/env node
/**
 * get-clerk-token.mjs — gera um JWT via Clerk Backend API para testes via curl/CLI
 *
 * Uso:
 *   node scripts/get-clerk-token.mjs <userId> [templateName]
 *
 * Exemplo (token padrão 60s):
 *   node scripts/get-clerk-token.mjs user_3BSIrcGV7ziY3T342pEPp0asaPk
 *
 * Exemplo (token com JWT Template de longa duração):
 *   node scripts/get-clerk-token.mjs user_3BSIrcGV7ziY3T342pEPp0asaPk api-testing
 *
 * Requer:
 *   - CLERK_SECRET_KEY no .env
 *   - Para token longo: JWT Template criado no Clerk Dashboard com lifetime >= 3600s
 *     https://dashboard.clerk.com/~/jwt-templates
 *
 * O token pode ser usado em curl:
 *   TOKEN=$(node scripts/get-clerk-token.mjs <userId> [template])
 *   curl -H "Authorization: Bearer $TOKEN" https://...
 *
 * Docs:
 *   https://clerk.com/docs/references/backend/sessions/get-token
 *   https://clerk.com/docs/backend-requests/making/jwt-templates
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

// Carregar .env manualmente
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/)
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/["']$/, '')
  }
}

const secretKey = process.env.CLERK_SECRET_KEY
if (!secretKey) {
  console.error('❌ CLERK_SECRET_KEY não encontrada no .env')
  process.exit(1)
}

const userId = process.argv[2]
if (!userId) {
  console.error('Uso: node scripts/get-clerk-token.mjs <userId> [templateName]')
  process.exit(1)
}

const templateName = process.argv[3] || null

// 1. Listar sessões ativas do usuário via Clerk Backend API
const sessionsRes = await fetch(
  `https://api.clerk.com/v1/sessions?user_id=${userId}&status=active`,
  { headers: { Authorization: `Bearer ${secretKey}` } }
)
if (!sessionsRes.ok) {
  console.error('❌ Erro ao listar sessões:', await sessionsRes.text())
  process.exit(1)
}
const sessions = await sessionsRes.json()

if (!sessions.length) {
  console.error(`❌ Nenhuma sessão ativa para ${userId}`)
  console.error('O usuário precisa estar logado no browser/app para ter sessão ativa.')
  process.exit(1)
}

const session = sessions[0]
console.error(`📋 Sessão: ${session.id}`)

// 2. Gerar token (com ou sem template)
const tokenUrl = templateName
  ? `https://api.clerk.com/v1/sessions/${session.id}/tokens/${templateName}`
  : `https://api.clerk.com/v1/sessions/${session.id}/tokens`

if (!templateName) {
  console.error('⚠️  Sem template — token expira em 60s. Para tokens longos:')
  console.error('   1. Crie um JWT Template em https://dashboard.clerk.com/~/jwt-templates')
  console.error('   2. Use: node scripts/get-clerk-token.mjs <userId> <nome-do-template>')
}

const tokenRes = await fetch(tokenUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
})
if (!tokenRes.ok) {
  console.error('❌ Erro ao gerar token:', await tokenRes.text())
  process.exit(1)
}

const { jwt } = await tokenRes.json()
// stdout só o token — para uso em scripts via $(...)
console.log(jwt)

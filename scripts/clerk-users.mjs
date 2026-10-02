#!/usr/bin/env node
/**
 * clerk-users.mjs — gestão de usuários Clerk da instância de DEV/TEST do Education X.
 *
 * Cria/lista usuários e seta o role (publicMetadata) que o RBAC do app lê.
 * O onboarding ainda NÃO cria usuários — use este script enquanto isso.
 *
 * ⚠️ SÓ instância test (sk_test_). Recusa sk_live_ pra nunca tocar produção por engano.
 *
 * Roles (publicMetadata.role):
 *   - admin       → acesso total; unitId = "__admin__" (espelha src/lib/auth/unit-context.ts)
 *   - orientador  → escopado a uma unidade; exige --unit <unitId>
 *   - atendente   → grava no Clerk, mas o RBAC do app (unit-context.ts) ainda NÃO reconhece.
 *                   Rotas protegidas vão recusar até o código suportar (ticket futuro).
 *
 * A CLERK_SECRET_KEY (test) vem, nesta ordem:
 *   1. process.env.CLERK_SECRET_KEY (já exportada)
 *   2. ../.env  ou  ../.env.local  (se tiver a key)
 *   3. `vercel env pull` do target preview pra um tmp (apagado em seguida) — nunca ecoa o valor.
 *
 * Uso:
 *   node scripts/clerk-users.mjs list
 *   node scripts/clerk-users.mjs set-role --email rafael@impactxlab.com --role admin
 *   node scripts/clerk-users.mjs create --email orientador@escola.com --role orientador --unit <unitId> --name "Fulano"
 *   node scripts/clerk-users.mjs create --email atendente@escola.com --role atendente --unit <unitId>
 *
 * Docs: https://clerk.com/docs/references/backend/overview
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdtempSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const CLERK_API = 'https://api.clerk.com/v1'

// ─── carregar a secret sem expor ──────────────────────────────────────────────
function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function ensureSecretKey() {
  if (process.env.CLERK_SECRET_KEY) return
  loadEnvFile(join(projectRoot, '.env'))
  loadEnvFile(join(projectRoot, '.env.local'))
  if (process.env.CLERK_SECRET_KEY) return

  // Último recurso: puxa env preview da Vercel pra um tmp e lê de lá (sem ecoar).
  console.error('ℹ️  Sem CLERK_SECRET_KEY local — puxando do target preview da Vercel…')
  const dir = mkdtempSync(join(tmpdir(), 'clerk-env-'))
  const tmp = join(dir, '.env.preview')
  try {
    execSync(`vercel env pull "${tmp}" --environment=preview --yes`, {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    loadEnvFile(tmp)
  } finally {
    try { unlinkSync(tmp) } catch {}
  }
}

ensureSecretKey()
const SECRET = process.env.CLERK_SECRET_KEY

if (!SECRET) {
  console.error('❌ CLERK_SECRET_KEY não encontrada (.env, .env.local ou vercel env pull).')
  process.exit(1)
}
if (!SECRET.startsWith('sk_test_')) {
  console.error(`❌ Recusado: a key não é sk_test_ (prefixo: ${SECRET.slice(0, 8)}…).`)
  console.error('   Este script só opera na instância de DEV/TEST. Produção é proibida.')
  process.exit(1)
}

// ─── helpers de API ───────────────────────────────────────────────────────────
async function api(path, init = {}) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || body?.error || text || res.statusText
    throw new Error(`Clerk API ${res.status}: ${msg}`)
  }
  return body
}

async function findUserByEmail(email) {
  const users = await api(`/users?email_address=${encodeURIComponent(email)}&limit=1`)
  return Array.isArray(users) ? users[0] : (users?.data?.[0] ?? null)
}

function primaryEmail(u) {
  const id = u?.primary_email_address_id
  const found = (u?.email_addresses || []).find((e) => e.id === id)
  return found?.email_address || u?.email_addresses?.[0]?.email_address || '—'
}

function metadataFor(role, unit) {
  if (role === 'admin') return { role, unitId: '__admin__' }
  return { role, unitId: unit }
}

// ─── args ─────────────────────────────────────────────────────────────────────
const [, , command, ...rest] = process.argv
const args = {}
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const key = rest[i].slice(2)
    const val = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true'
    args[key] = val
  }
}

const ROLES = ['admin', 'orientador', 'atendente']

function assertRole(role) {
  if (!ROLES.includes(role)) {
    console.error(`❌ --role inválido: "${role}". Use: ${ROLES.join(' | ')}`)
    process.exit(1)
  }
  if (role !== 'admin' && !args.unit) {
    console.error(`❌ role "${role}" exige --unit <unitId> (só admin dispensa).`)
    process.exit(1)
  }
  if (role === 'atendente') {
    console.error('⚠️  Nota: "atendente" é gravado no Clerk, mas o RBAC do app ainda não o reconhece.')
    console.error('   Rotas protegidas vão recusar até o suporte ser adicionado em unit-context.ts (ticket futuro).')
  }
}

// ─── comandos ─────────────────────────────────────────────────────────────────
async function cmdList() {
  const users = await api('/users?limit=100&order_by=-created_at')
  const list = Array.isArray(users) ? users : users?.data || []
  if (!list.length) { console.log('(nenhum usuário na instância test)'); return }
  console.log(`\n${list.length} usuário(s) — instância test:\n`)
  for (const u of list) {
    const meta = u.public_metadata || {}
    const role = meta.role || '—'
    const unit = meta.unitId || '—'
    console.log(`  ${primaryEmail(u).padEnd(34)} role=${String(role).padEnd(11)} unit=${unit}  (${u.id})`)
  }
  console.log('')
}

async function cmdSetRole() {
  const { email, role, unit } = args
  if (!email || !role) { console.error('❌ uso: set-role --email <e> --role <r> [--unit <u>]'); process.exit(1) }
  assertRole(role)
  const user = await findUserByEmail(email)
  if (!user) { console.error(`❌ Usuário não encontrado: ${email}`); process.exit(1) }
  await api(`/users/${user.id}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify({ public_metadata: metadataFor(role, unit) }),
  })
  console.log(`✅ ${email} → role=${role}${role === 'admin' ? '' : ` unit=${unit}`} (${user.id})`)
}

async function cmdCreate() {
  const { email, role, unit, name } = args
  if (!email || !role) { console.error('❌ uso: create --email <e> --role <r> [--unit <u>] [--name <n>]'); process.exit(1) }
  assertRole(role)
  const existing = await findUserByEmail(email)
  if (existing) {
    console.error(`⚠️  Já existe usuário com ${email} — use set-role pra ajustar o role.`)
    process.exit(1)
  }
  const [first, ...lastParts] = (name || '').trim().split(/\s+/)
  const body = {
    email_address: [email],
    public_metadata: metadataFor(role, unit),
    skip_password_requirement: true,
    ...(first ? { first_name: first } : {}),
    ...(lastParts.length ? { last_name: lastParts.join(' ') } : {}),
  }
  const user = await api('/users', { method: 'POST', body: JSON.stringify(body) })
  console.log(`✅ criado: ${email} → role=${role}${role === 'admin' ? '' : ` unit=${unit}`} (${user.id})`)
  console.log('   (sem senha — o usuário define no 1º acesso via fluxo Clerk do app.)')
}

const COMMANDS = { list: cmdList, 'set-role': cmdSetRole, create: cmdCreate }

const run = COMMANDS[command]
if (!run) {
  console.error('Uso: node scripts/clerk-users.mjs <list|set-role|create> [--email --role --unit --name]')
  process.exit(1)
}
run().catch((err) => { console.error(`❌ ${err.message}`); process.exit(1) })

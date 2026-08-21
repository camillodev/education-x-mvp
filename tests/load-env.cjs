const { existsSync, readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const projectRoot = resolve(__dirname, '..')
const initialKeys = new Set(Object.keys(process.env))

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const equalsIndex = trimmed.indexOf('=')
  if (equalsIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, equalsIndex).trim()
  const rawValue = trimmed.slice(equalsIndex + 1).trim()
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    return null
  }

  const value = rawValue.replace(/^["']|["']$/g, '')
  return { key, value }
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const parsed = parseEnvLine(line)
    if (!parsed || initialKeys.has(parsed.key)) {
      continue
    }

    process.env[parsed.key] = parsed.value
  }
}

loadEnvFile(resolve(projectRoot, '.env'))
loadEnvFile(resolve(projectRoot, '.env.local'))

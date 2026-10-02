#!/usr/bin/env bash
# migrate-remote.sh — aplica migrations Prisma pendentes no banco remoto
# via psql, contornando o problema de rede do builder Vercel.
#
# Uso: ./scripts/migrate-remote.sh
# Requer: psql instalado, .env com DIRECT_URL válida

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ .env não encontrado em $REPO_ROOT" >&2
  exit 1
fi

# Extrair DIRECT_URL e percent-encodar a senha (caracteres especiais)
DIRECT_URL_RAW=$(grep "^DIRECT_URL=" "$ENV_FILE" | cut -d'"' -f2)

if [[ -z "$DIRECT_URL_RAW" ]]; then
  echo "❌ DIRECT_URL não encontrada no .env" >&2
  exit 1
fi

# Usar Python para montar URL com senha corretamente encoded
PSQL_URL=$(python3 -c "
import urllib.parse
raw = '$DIRECT_URL_RAW'
p = urllib.parse.urlparse(raw)
pwd_enc = urllib.parse.quote(p.password or '', safe='')
print(f'{p.scheme}://{p.username}:{pwd_enc}@{p.hostname}:{p.port or 5432}{p.path}')
")

echo "🔗 Conectando a: $(echo "$PSQL_URL" | sed 's|://.*@|://***@|')"

# Rodar todas as migrations pendentes via prisma migrate deploy
# usando DIRECT_URL encoded para o Prisma
export PATH="/Users/rafae/.nvm/versions/node/v22.22.3/bin:$PATH"

DIRECT_URL="$PSQL_URL" npx --yes prisma migrate deploy \
  --schema="$REPO_ROOT/prisma/schema.prisma" 2>&1

echo "✅ Migrations aplicadas com sucesso"

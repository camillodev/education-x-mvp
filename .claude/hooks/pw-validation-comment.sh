#!/usr/bin/env bash
set -euo pipefail

# Posta (ou atualiza) o comentário de validação visual Playwright no PR da branch atual.
# O comentário carrega um marcador com o SHA do HEAD para o gate conseguir verificar
# que a validação cobre o commit que está sendo enviado.
#
# Uso:
#   .claude/hooks/pw-validation-comment.sh <arquivo-md-com-o-veredito>
#   echo "<veredito markdown>" | .claude/hooks/pw-validation-comment.sh -
#
# O veredito deve descrever: rotas, breakpoints 375/768/1440 (✓/✗), console,
# achados e correções. Escreva o que VOCÊ viu lendo os screenshots — não invente.

HEAD_SHA=$(git rev-parse HEAD)
SHORT_SHA=$(git rev-parse --short HEAD)
MARKER="<!-- PW-VALIDATION:${HEAD_SHA} -->"

SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  echo "uso: pw-validation-comment.sh <arquivo.md | ->" >&2
  exit 1
fi

if [[ "$SRC" == "-" ]]; then
  BODY_CONTENT=$(cat)
else
  BODY_CONTENT=$(cat "$SRC")
fi

BODY="${MARKER}
## 🔍 Validação visual (Playwright) — commit \`${SHORT_SHA}\`

${BODY_CONTENT}"

# Precisa de um PR aberto para a branch atual
if ! gh pr view --json number >/dev/null 2>&1; then
  echo "erro: nenhum PR aberto para a branch atual. Abra o PR antes de validar." >&2
  exit 1
fi

gh pr comment --body "$BODY"
echo "✓ Comentário de validação postado para o commit ${SHORT_SHA}."

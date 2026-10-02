# Zero tolerância: commit direto em branch principal

Nenhum agent deste repo commita diretamente em `main`/`master`. Fluxo obrigatório: branch
(`feature/`|`fix/`|`chore/`) → commits → push → PR — nunca merge local.

**Por quê:** commit direto em branch principal pula revisão (humana ou automatizada) e remove a
oportunidade de reverter uma mudança ruim antes que ela afete outros consumidores do repo.

**Como aplica-se aqui:** os agents deste repo (`code-implementer`, `code-reviewer`, etc.) herdam
essa regra de origem no frontmatter/prompt de cada um — checar cada card individual pra confirmar
que ela está presente e explícita, não implícita.

**Enforcement real (fora deste repo):** no setup de origem, esta regra vive só em prompt/CLAUDE.md,
sem hook nomeado confirmado que a intercepte mecanicamente (diferente de `zero-tolerance-secrets`,
que tem `secret-scanner.sh` como PreToolUse gate real). Isso é uma lacuna real identificada durante
a avaliação — a regra existe como promessa textual, não como algo que "não pode dar errado" no
sentido do módulo 42 do curso. Candidata a virar hook real quando este repo ganhar harness.

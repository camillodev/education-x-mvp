# Lições Aprendidas — Education X

> **Registro append-only de aprendizados.** Toda sessão/execução que erra, descobre um padrão, ou recebe correção do Rafa registra aqui. **Todo agent lê este arquivo no Passo 1 (Contexto) ANTES de executar** — pra não repetir erro já cometido.
>
> Formato: data · o que aconteceu · a lição · como aplicar. Mais recente no topo. Nunca apagar (histórico é o valor); marcar `[SUPERADA]` se uma lição deixar de valer.

---

## 2026-06-14 · CI verde ≠ gates locais verdes
**O que aconteceu:** declarei a Fase 0 "pronta" e marquei "CI passa" só com gates locais (typecheck/test/build/lint) verdes. O CI no PR estava VERMELHO. O advisor pegou.
**Lição:** local tem estado acumulado (store pnpm com builds aprovados, deps hoisted) que o CI fresco não tem. Coisas passam local e quebram no CI.
**Como aplicar:** nunca declarar PR pronto sem `gh pr checks <N>` verde de verdade. Ler `gh run view <id> --log-failed` quando vermelho, achar a causa raiz, não chutar.

## 2026-06-14 · pnpm v11 usa `allowBuilds`, não `onlyBuiltDependencies`
**O que aconteceu:** CI quebrava com `ERR_PNPM_IGNORED_BUILDS` nas deps nativas (prisma, esbuild, sharp). Config estava com `onlyBuiltDependencies` (formato pnpm ≤11.3, ignorado).
**Lição:** pnpm v11 substituiu `onlyBuiltDependencies` por `allowBuilds` no `pnpm-workspace.yaml`.
**Como aplicar:** usar `allowBuilds` (mapa `nome: true`) no `pnpm-workspace.yaml`. Pinar `packageManager: pnpm@X.Y.Z` no package.json pra CI = versão local. À prova de versão: pôr as duas chaves.

## 2026-06-14 · Portabilidade > reaproveitar global
**O que aconteceu:** o setup inicial (DESCOBERTAS-SETUP) mandava reaproveitar skills globais `~/.claude/skills/ix-*`. Mas isso amarra o projeto à máquina do Rafa — outro dev/PC não tem.
**Lição:** pra "qualquer dev continua com 1 clone", TUDO vive no repo. Zero dependência de `~/.claude`.
**Como aplicar:** skills/agents/pipeline auto-contidos em `.claude/`. Nunca referenciar algo em `~/.claude` que não esteja versionado.

## 2026-06-14 · Skill = boas práticas, não passo-a-passo de tarefa
**O que aconteceu:** a skill `edx-asaas` tinha "fluxos por tarefa" (acoplada a Tarefa 1.2, 3, 5). Rafa corrigiu.
**Lição:** skill consolida o COMO geral reutilizável (saber payload via MCP antes de codar, sempre logar cobrança, idempotência, padrão de integração) — não os passos de uma tarefa específica. Passos vivem no plano da tarefa + services.
**Como aplicar:** ao escrever/editar skill, perguntar "isto vale pra qualquer task ou só pra uma?". Se só pra uma, não é skill.

---

<!-- Próximas lições acima desta linha, mais recente no topo. -->

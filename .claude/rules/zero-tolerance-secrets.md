# Zero tolerância: secrets

Nenhum agent ou skill deste repo referencia, gera, ou sugere hardcoding de secret/API key/token em
código, config, ou documentação. Configs de exemplo usam `${VAR}` sempre.

**Por quê:** um secret hardcoded que entra em git fica no histórico permanentemente, mesmo depois
de removido do arquivo — scrapers automatizados encontram chaves vazadas em repositórios públicos
rapidamente.

**Como aplica-se aqui:** nenhum dos agents/skills deste repo referencia credencial real. Qualquer
conteúdo futuro que precise de config de MCP/API deve usar variável de ambiente, nunca valor
literal.

**Enforcement real (fora deste repo):** no setup de origem, esta regra é aplicada por um hook
`PreToolUse` (`secret-scanner.sh`) que intercepta escrita de arquivo antes de aceitar o
conteúdo — é o padrão "hook vence prompt" do módulo 42 do curso (Enforce Agent Compliance with
Deterministic Hooks): a regra não depende de o agent "lembrar" de não fazer isso, o hook bloqueia
mecanicamente. Este repo, sendo standalone sem harness rodando, documenta a regra em prosa; a
versão executável (hook real) é trabalho de rodada futura, quando o repo ganhar runtime.

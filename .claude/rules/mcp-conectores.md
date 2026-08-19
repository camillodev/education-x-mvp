# Regras de conectores MCP — Linear e Slack

Carrega ao criar/editar hook, agente ou skill que dependa de tools do Linear ou do Slack.

## Linear e Slack NÃO são servidores no `.mcp.json`

`.mcp.json` deste repo (`context7`, `playwright`, `github`, `supabase`, `vercel`) configura
processos locais ou endpoints HTTP fixos por servidor. Linear e Slack não entram nesse arquivo —
são **conectores claude.ai**, autenticados na conta, não no repositório. Não existe uma entrada de
`.mcp.json` equivalente pra eles: tentar adicionar uma quebraria o arquivo com um endpoint
inventado (não há URL/comando fixo de servidor pra declarar).

## O UUID do tool prefix é específico da instalação, não do repo

Uma tool do Linear aparece como `mcp__<uuid>__save_issue` — ex.:
`mcp__349e887c-3bc4-47b6-b34c-55ee32842997__save_issue`. Esse UUID é o ID da **instalação do
conector nesta conta claude.ai**, não um ID de sessão nem de projeto. Ele muda se:
- o conector for desconectado e reconectado;
- o mesmo repo rodar sob outra conta que também tenha Linear conectado (UUID diferente, ou
  ausente se a conta não tiver o conector instalado).

Hardcodar esse UUID em matcher de hook, frontmatter de agente, ou qualquer config versionada
quebra silenciosamente assim que a instalação muda — o hook/agente simplesmente para de casar a
tool e ninguém percebe até notar o comportamento ausente.

## Regra: resolver por busca textual, nunca hardcodar o UUID

- **Hooks** (`matcher` em `.claude/settings.json`): usar padrão regex com prefixo curinga —
  `mcp__.*__(save_issue|update_issue)` em vez de `mcp__<uuid>__(save_issue|update_issue)`. Ver
  hook `linear-mark-ticket` como referência já corrigida.
- **Agentes/skills que chamam a tool em runtime**: resolver via `ToolSearch` com query textual
  (ex.: `"linear save_issue"`, `"slack send message"`) em vez de referenciar
  `mcp__<uuid>__save_issue` direto no código/frontmatter. `ToolSearch` devolve o nome real da tool
  já instalada nessa sessão/conta, então funciona independente de qual UUID está ativo.

## Lacuna conhecida (não resolvida nesta fase)

Não existe forma de "adicionar Linear/Slack ao `.mcp.json`" pra torná-los estáveis entre contas —
isso não é uma tarefa pendente, é uma limitação real do modelo de conectores claude.ai vs. MCP
servers locais. Qualquer plano que assuma o contrário (ex.: "adicionar Linear ao `.mcp.json`" como
item de checklist) está desatualizado — ver correção equivalente em `docs/PLANO-TIME-AGENTS.md`
§7 e §8.

# Education X — Project conventions

## Padrão obrigatório de TABELAS (data tables)

Toda tabela de listagem neste protótipo **deve** seguir o padrão da tabela
"Próximos vencimentos" (Dashboard, `app/screens-c.jsx`). Referência canônica.

Requisitos para qualquer tabela nova ou editada:

1. **Título + ação** — `SectionHead` com título e, quando fizer sentido, um botão de ação à direita ("Ver todas", "Exportar", etc.).
2. **Barra de filtros** — busca (`Input` com `leadingIcon="search"`) + filtro por categoria (`Segmented` ou `Chip`s). Qualquer mudança de filtro/busca reseta a página para 0.
3. **Cabeçalhos ordenáveis** — cada coluna é clicável e alterna asc/desc. Mostrar ícone: `chevrons-up-down` (inativo), `chevron-up`/`chevron-down` (ativo), com a coluna ativa em `var(--color-primary)`. Definir as colunas num array `COLS` com `{ h, key, align, val }` onde `val(row)` extrai o valor de ordenação.
4. **Tags** — valores categóricos (alunos, status, forma de pagamento, etc.) são renderizados como pílulas/`Badge`, não texto cru.
5. **Paginação sempre visível** — rodapé com "X–Y de N" + botões Anterior/Próxima + números de página. Page-size típico: 6–8 linhas.
6. **Responsivo** — embrulhar a `<table>` em `<div style="overflowX:auto">`, definir `minWidth` adequado, e usar padding compacto para caber na tela.
7. **Estado vazio** — linha única com `colSpan` e mensagem ("Nenhum … encontrado.").

Cores e tipografia sempre via tokens (`var(--color-*)`), nunca hex cru.

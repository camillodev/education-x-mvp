# ADR-0005: Um DataTable único sobre TanStack Table

**Status:** Accepted
**Data:** 2026-06-13

## Contexto
O protótipo tem ~8 tabelas (matrículas, cobranças, negativação, extrato, faturas, próximos vencimentos) que repetem código inline e divergem entre si. Replicar isso seria dívida de manutenção.

## Decisão
Um único `components/patterns/DataTable.tsx` usando **TanStack Table** (headless) + wrapper visual Alfabeto. Cada tela define só `columns` + config (em `_columns.ts`), nunca uma `<table>` nova.

## Consequências
✅ Ordenação/filtro/paginação como padrão de mercado, menos código nosso.
✅ Revisa-se o DataTable uma vez, serve as 8 telas (baixa manutenção).
✅ Padrão visual obrigatório aplicado num lugar só.
⚠️ Curva inicial de aprender a API do TanStack Table.

## Alternativas consideradas
- Tabela própria do zero: reinventar ordenação/filtro/paginação.
- Uma tabela por tela: duplicação — exatamente o erro do protótipo.

# ADR-0004: Usar shadcn/ui + tokens Alfabeto como base de UI

**Status:** Accepted
**Data:** 2026-06-13

## Contexto
Precisamos de uma biblioteca de componentes consistente, brandada na identidade Alfabeto (azul `#0467DB`, fonte Inter) e reutilizável, para construir ~9 fluxos sem duplicar UI.

## Decisão
shadcn/ui (componentes locais, não pacote npm) estilizado com **tokens Alfabeto** em `src/styles/alfabeto.css`. Átomos do shadcn em `components/ui/`; moléculas/organismos compostos em `components/patterns/`. Atomic design.

## Consequências
✅ Componentes próprios, versionados, customizáveis, brandados.
✅ Padrão de mercado bem documentado.
⚠️ Manter os tokens em sincronia com o `design-handoff/` do protótipo.

## Alternativas consideradas
- `@impactxlab/ui` (DS próprio IX): pode não cobrir todos os componentes do protótipo ainda.
- Material UI: não combina com a identidade Alfabeto, peso desnecessário.

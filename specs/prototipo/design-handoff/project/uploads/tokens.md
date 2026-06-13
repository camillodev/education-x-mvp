# Tokens de Design — `@impactxlab/tokens`

> Carrega quando bot mencionar: cor, color, token, tema, theme, var, radius, shadow, spacing, dark mode, hex, paleta, variável, design token, style dictionary, DTCG, primitive, semantic.

## Princípio

Tokens são **CSS variables** globais — nunca hardcode hex. Mudar de tema = mudar **className no `<html>`**, tokens se redefinem sozinhos.

## Arquitetura 3-tier (Style Dictionary v4 + DTCG)

A partir do PR6 a fonte de verdade dos tokens é o package **`@impactxlab/tokens`**, organizado em 3 camadas:

| Tier | Pasta | O que vive aqui | Exemplo |
|---|---|---|---|
| **1. Primitive** | `packages/tokens/src/primitive/` | Paleta crua, sem semântica | `color.blue.500 = #0467DB`, `radius.md = 10px` |
| **2. Semantic** | `packages/tokens/src/semantic/` | Roles por tema + base + dark | `color.primary → {color.blue.500}` (varia por tema) |
| **3. Component** | `packages/tokens/src/component/` | Overrides por componente | `component.card.radius → {radius.card}` |

**Regra de fluxo:**
- Componente React lê CSS vars (`var(--color-primary)`, `var(--component-card-radius)`).
- CSS vars são geradas a partir do JSON DTCG via `pnpm --filter @impactxlab/tokens build`.
- Mudar `primitive.color.blue.500` propaga em **todos** os componentes que usam primary no theme education sem editar um único `.tsx`.

### Onde alterar?

| Quero | Edito |
|---|---|
| Mudar paleta (azul Education vira mais escuro) | `primitive/color.json` |
| Trocar role (primary do Kumon vira outro azul) | `semantic/kumon.json` |
| Mudar radius do Card sem afetar Button | `component/card.json` |
| Mudar dark mode neutrals | `semantic/dark.json` |

### Output do build

```
packages/tokens/dist/
├── tokens.css              ← bundle único (425 vars, todos os temas)
├── themes/education.css    ← fatia individual por tema
├── themes/kumon.css
├── themes/impactx.css
├── tokens.js + .d.ts       ← exports JS programáticos (tema education default)
└── tailwind.js             ← preset Tailwind com cores primitive
```

## Compatibilidade

O contrato externo (`--color-primary`, `--radius-card`, etc.) é **idêntico** ao base.css/themes anteriores. Consumidores que importam `@impactxlab/design-system/tokens/base.css` continuam funcionando — o DS package mantém os CSS legados como passthrough. Migração para consumir `@impactxlab/tokens/tokens.css` direto é incremental e opcional.

## Estrutura legada (mantida durante transição)

- **`packages/ds-education/src/tokens/base.css`** (`:root` global) — variáveis fixas entre temas.
- **`packages/ds-education/src/tokens/themes/*.css`** (`.theme-{education,kumon,impactx}`) — papéis temáticos.
- **Dark mode** (`[data-mode="dark"]`) — neutrals escuros.

## Trocar Tema

```tsx
// Light (default = education, porque :root,
<html className="theme-kumon">
  {/* tokens agora leem --color-primary: #00A9E3 (azul Kumon) */}

// Dark mode
<html className="theme-kumon" data-mode="dark">
  {/* neutrals escuros; --color-primary ainda #00A9E3 */}
```

## Usar Tokens no Tailwind v4

**Arbitrary values:** `bg-[var(--color-primary)]`, `text-[var(--color-text-muted)]`.

```tsx
// ✅ Correto
<div className="bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
  Clique em mim
</div>

// Inline raro
<div style={{ color: "var(--color-text)" }}>Texto</div>

// ❌ Evitar
<div className="bg-blue-500 text-gray-600">Não faz</div>
```

## Catálogo de Tokens

### Cores Neutras (fixas em base.css)

| Token | Uso | Valor (light) | Dark |
|---|---|---|---|
| `--color-bg` | Fundo da página | `#FFFFFF` | `#0F172A` |
| `--color-surface` | Card, overlay | `#F5F5F7` | `#1E293B` |
| `--color-surface-muted` | Superfície inativa | `#FAFAFA` | `#172033` |
| `--color-border` | Divider sutil | `#E5E7EB` | `#334155` |
| `--color-border-input` | Input field (presença) | `#D1D5DB` | `#475569` |
| `--color-text` | Corpo, padrão | `#1F2937` | `#F8FAFC` |
| `--color-text-muted-strong` | Texto com mais contraste | `#374151` | `#E2E8F0` |
| `--color-text-muted` | Label, secondary | `#4B5563` | `#CBD5E1` |
| `--color-text-subtle` | Placeholder, hint | `#6B7280` | `#94A3B8` |

### Primária (varia por tema)

| Papel | Token | Educação | Kumon | Impact X | Uso |
|---|---|---|---|---|---|
| Fill | `--color-primary` | `#0467DB` | `#00A9E3` | `#11C76F` | Botão principal |
| | `--color-primary-hover` | `#023A85` | `#0089B6` | `#0A7942` | Hover |
| | `--color-primary-active` | `#011E47` | `#005C7C` | `#064D2A` | Pressed |
| | `--color-primary-disabled` | `#C9CCCF` | `#C9CCCF` | `#C9CCCF` | Disabled (igual em temas) |
| | `--color-primary-fg` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | Texto branco |
| | `--color-primary-soft` | `#BFDBFE` | `#CCEEFA` | `#D1FAE5` | Fundo com baixa opacidade |
| Outline | `--color-secondary` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | Botão outline |
| | `--color-secondary-hover` | `#E6F0FB` | `#DCEAF5` | `#DCFAEA` | Hover |
| | `--color-secondary-bd` | `#0467DB` | `#00A9E3` | `#11C76F` | Border |
| | `--color-secondary-fg` | `#1E2124` | `#1E2124` | `#1E2124` | Texto dark |
| Ghost | `--color-tertiary` / `-hover` / `-active` / `-fg` | Idem (transparent hover) | Idem | Idem | Botão ghost |
| | `--color-tertiary-dark` / `-hover` (light) / `-fg` | Idem (white hover) | Idem | Idem | Ghost sobre fundo escuro |

### Danger (igual em todos temas)

| Variante | Token | Valor | Uso |
|---|---|---|---|
| Primary | `--color-danger-primary` | `#EB0000` | Botão delete fill |
| | `--color-danger-primary-hover` | `#BF3434` | Hover |
| | `--color-danger-primary-active` | `#802323` | Pressed |
| | `--color-danger-primary-fg` | `#FFFFFF` | Texto |
| Secondary | `--color-danger-secondary` / `-hover` / `-bd` | Idem (outline pattern) | Delete outline |
| Tertiary | `--color-danger-tertiary` / `-fg-hover` | Idem (ghost) | Delete ghost |

### Badges & Toast (base.css)

| Token | Valor | Uso | Dark |
|---|---|---|---|
| `--badge-success-bg` | `#C5F0DE` | Fundo badge "OK" | `#0E3A22` |
| `--badge-success-fg` | `#1D6B4F` | Texto | `#6EE7B7` |
| `--badge-warning-bg` | `#FFF4D0` | Fundo "Aviso" | `#3B2A0A` |
| `--badge-warning-fg` | `#8A6D1C` | Texto | `#FCD34D` |
| `--badge-danger-bg` | `#FFD1D1` | Fundo "Erro" | `#3B1414` |
| `--badge-danger-fg` | `#8A1818` | Texto | `#FCA5A5` |
| `--color-toast-success` | `#00B54A` | Toast accent | — |
| `--color-toast-success-bg` | `#E6F7EE` | Toast bg | `#0E3A22` |
| `--color-toast-warning-bg` | `#FFF4DC` | Toast bg | `#3B2A0A` |
| `--color-toast-info-bg` | `#E6F0FB` | Toast bg | `#0E2A4A` |

### Spacing, Radius, Shadow (base.css)

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `6px` | Badges, inputs pequenos |
| `--radius-md` | `10px` | Buttons, cards (padrão) |
| `--radius-lg` | `16px` | Modals grandes |
| `--radius-xl` | `24px` | Hero sections |
| `--radius-full` | `9999px` | Pills, badges redondas |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Elemento leve |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Button, dropdown |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Modal, elevated |

## Árvore de Decisão

**"Preciso de fundo neutro?"**
→ `--color-bg` (página), `--color-surface` (card), `--color-surface-muted` (inactive)

**"Preciso de texto?"**
→ `--color-text` (corpo), `--color-text-muted` (label), `--color-text-subtle` (placeholder)

**"Preciso da cor primária?"**
→ `--color-primary` + `--color-primary-fg` (sempre junto pra contraste)

**"Preciso de destaque sutil (soft background)?"**
→ `--color-primary-soft` (8% opacidade primária)

**"Preciso de border?"**
→ `--color-border` (sutil, divider), `--color-border-input` (presença em forms)

**"Preciso de cor de erro?"**
→ `--color-danger-primary` (fill) / `--color-danger-secondary` (outline) / `--color-danger-tertiary` (ghost)

**"Preciso de badge/pill colorido?"**
→ `--badge-success-bg/fg`, `--badge-warning-bg/fg`, `--badge-danger-bg/fg`

## Exemplos Corretos ✅

```tsx
// Button principal
<button className="bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
  Salvar
</button>

// Input com border
<input 
  className="border border-[var(--color-border-input)] bg-[var(--color-bg)] rounded-[var(--radius-md)]"
/>

// Badge
<span className="bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)] rounded-full px-2 py-1">
  Ativo
</span>

// Card com shadow
<div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]">
  Conteúdo
</div>

// Dark mode automático (sem código a mais)
// data-mode="dark" no <html> → tokens redefinem
```

## Anti-patterns ❌

```tsx
// ❌ Hex hardcoded
<div className="bg-blue-500 text-[#1F2937]">Errado</div>

// ❌ Cor Tailwind cru sem var
<div className="bg-gray-100 text-gray-600">Errado</div>

// ❌ Esquecer -fg com bg colorido
<button className="bg-[var(--color-primary)]">Falta contraste</button>

// ❌ Editar :root globalmente em app
// NUNCA faça isto:
// style={{
//   "--color-primary": "#FF0000"
// }}
// Edita no tokens/themes/kumon.css, nunca em runtime.

// ❌ Usar --color-primary-soft sem propósito
// --color-primary-soft é pra backgrounds sutis (badge soft, badge desativar)
// Não pra foreground ou border.
```

## Dark Mode

```tsx
// <html> com data-mode="dark" → :root e [data-mode="dark"] combinam

<html className="theme-kumon" data-mode="dark">
  {/* 
    --color-bg: #0F172A (dark)
    --color-text: #F8FAFC (light text)
    --color-primary: #00A9E3 (IGUAL — brand não muda)
  */}
</html>
```

Componente **não precisa mudar**: tokens cuidam de tudo.

## Multi-tema

3 temas disponíveis em `packages/ds-education/src/tokens/themes/`:

1. **`theme-education`** (Alfabeto/SAS, azul `#0467DB`)
2. **`theme-kumon`** (Kumon, azul clássico `#00A9E3`)
3. **`theme-impactx`** (Impact X, verde `#11C76F` + amarelo secundário `#F5C400`)

Trocar tema = trocar **className no `<html>`**.

## Token Novo — Quando Criar

**Sempre semântico, nunca primitive:**

- ✅ `--color-primary-soft` (semântico: "soft background da primária")
- ❌ `--color-blue-08-opacity` (primitive: detalhe de implementação)

Se descobrir necessidade:
1. Adiciona em `base.css` se for neutro/fixo entre temas.
2. Adiciona em cada `themes/*.css` se for variável por tema.
3. Roda `npm run build` pra validar.

## Roadmap

**Semana 3** — Style Dictionary 3-tier (primitive → semantic → component):

- Tier 1: primitives (cores, tamanhos brutos)
- Tier 2: semantics (--color-primary, --radius-button)
- Tier 3: components (--button-primary-bg, --input-border)

Benefício: menos vars globais, mais previsível, single source of truth.

# Design System — Alfabeto (para o Claude Design aprender antes de gerar telas)

> **Anexe este doc + os 2 arquivos de `alfabeto-source/` (`alfabeto.css`, `tokens.md`) no
> projeto do Claude Design ANTES de pedir telas.** Assim ele aprende o sistema e gera todas
> as telas consistentes. Origem: `@impactxlab/ds-education` (tema `theme-education`).
>
> No Google Stitch isto NÃO se importa — lá o tema vai por prompt (ver `04-INSTRUCOES-IMPORT`).

---

## 1. Princípio

- Identidade **Alfabeto / Education**: azul institucional `#0467DB`, limpo, sério (tipo banco).
- Tokens são **CSS variables** — no código real (shadcn) nunca hardcode hex; sempre `var(--token)`.
- Para gerar telas no Claude Design, use os HEX abaixo como referência visual exata.

## 2. Tokens (cole/anexe `alfabeto.css` + `tokens.md` para os valores completos)

### Cor
| Papel | Token | HEX |
|-------|-------|-----|
| Primária (fill) | `--color-primary` | `#0467DB` |
| Primária hover | `--color-primary-hover` | `#023A85` |
| Primária active | `--color-primary-active` | `#011E47` |
| Primária fg | `--color-primary-fg` | `#FFFFFF` |
| Primária soft | `--color-primary-soft` | `#BFDBFE` |
| Fundo página | `--color-bg` | `#FFFFFF` |
| Superfície (card) | `--color-surface` | `#F5F5F7` |
| Borda | `--color-border` | `#E5E7EB` |
| Borda input | `--color-border-input` | `#D1D5DB` |
| Texto | `--color-text` | `#1F2937` |
| Texto muted | `--color-text-muted` | `#4B5563` |
| Texto subtle | `--color-text-subtle` | `#6B7280` |
| Danger (fill) | `--color-danger-primary` | `#EB0000` |
| Hero gradient | `--color-hero-from`→`to` | `#0467DB`→`#4B9EF5` |

### Status (mapeado para cobrança)
| Estado | bg / fg | Uso |
|--------|---------|-----|
| Sucesso | `#C5F0DE` / `#1D6B4F` | Pago, regularizado |
| Aviso | `#FFF4D0` / `#8A6D1C` | A vencer, em aviso |
| Erro | `#FFD1D1` / `#8A1818` | Vencido, negativado |

### Forma
| Token | Valor |
|-------|-------|
| `--radius-sm` | `6px` (badge, input pequeno) |
| `--radius-md` | `10px` (botão, card — padrão) |
| `--radius-lg` | `16px` (modal) |
| `--radius-full` | pílula |
| Sombra | `--shadow-sm/md/lg` (leve → forte) |
| Tipografia | Inter (sans-serif) |

---

## 3. Catálogo de componentes (o que o Claude Design deve usar)

> Descreva ao Claude Design: "use estes componentes em todas as telas".

### Botão
- **Primário (fill):** bg `#0467DB`, texto `#FFFFFF`, radius 10px, sombra leve. Hover `#023A85`.
- **Secundário (outline):** bg branco, borda `#0467DB`, texto `#1F2937`.
- **Terciário (ghost):** transparente, texto `#1F2937`, hover preenche.
- **Destrutivo:** bg `#EB0000`, texto branco. Para cancelar/remover/recusar.
- **Disabled:** `#C9CCCF`.

### Badge / Status pill
- Pílula (radius full), padding pequeno. Cor por estado (tabela Status acima).
- Ex: "Pago" verde, "A vencer" amarelo, "Vencido" vermelho, "Negativado" vermelho.

### Card
- Fundo `#F5F5F7`, radius 16px (md/lg), sombra leve, padding generoso.
- **Card de métrica:** número grande (`#1F2937`), label pequeno (`#4B5563`), ícone, cor de
  destaque conforme o dado (verde/amarelo/vermelho).

### Input / Form field
- Fundo branco, borda `#D1D5DB`, radius 10px, label `#4B5563`, placeholder `#6B7280`.
- Foco: borda azul `#0467DB`. Erro: borda/texto vermelho. Hint abaixo do campo.

### Tabela
- Cabeçalho discreto, linhas com hover (`#F5F5F7`), badges inline na coluna status,
  ação à direita (botão ghost/ícone). Densidade confortável.

### Navegação
- **Sidebar** fixa: logo "Education X" (X em `#0467DB`), itens com ícone, item ativo em azul.
- **Topbar:** seletor de escola + avatar.

### Stepper
- Indicador de passos no topo de wizards (onboarding, matrícula). Passo atual em azul.

### Segmented control
- Filtros (Todas/A vencer/Pagas/Vencidas) e seleção de plano. Selecionado em azul.

### Modal / Bottom sheet
- Confirmações (cancelar cobrança, recusar matrícula). Botão destrutivo quando aplicável.

### Toast
- Sucesso (verde), aviso (amarelo), info (azul). Canto, some sozinho.

---

## 4. Diretrizes de layout

- **Desktop** (painel Admin/Fran): sidebar + conteúdo, max-width confortável, cards em grid.
- **Mobile** (matrícula do responsável): coluna única, um passo por vez, botão grande embaixo.
- Respiro generoso, hierarquia clara, pouca cor além da primária + status.
- Sensação alvo: **profissional, confiável, institucional** (referência: Stripe, banco digital).

---

## 5. O que dizer ao Claude Design (ordem correta)

1. Crie o projeto "Education X — MVP".
2. **Anexe:** este doc + `alfabeto-source/alfabeto.css` + `alfabeto-source/tokens.md` +
   `00-PERSONAS` + `02-JORNADAS` + `03-FLUXOS`.
3. Primeiro prompt: *"Aprenda o design system Alfabeto descrito no doc anexo (tokens e
   componentes). Use-o como base visual fixa para tudo que gerar: primária #0467DB, fundo
   branco, cards #F5F5F7, texto #1F2937, radius 10px, Inter, status pago=verde/a vencer=amarelo/
   vencido=vermelho. Confirme que entendeu antes de gerar telas."*
4. Depois, o prompt mestre de geração (doc `04-INSTRUCOES-IMPORT`).

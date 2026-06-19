# Instruções de Import — gerar o protótipo navegável

> Como levar estes docs para o **Claude Design** (claude.ai/design) ou o **Google Stitch**
> (stitch.withgoogle.com) e gerar o protótipo navegável para o comercial vender.
> Use os docs desta pasta: `00-PERSONAS`, `01-DESIGN-SYSTEM-ALFABETO`, `02-JORNADAS`,
> `03-FLUXOS` + os arquivos reais em `alfabeto-source/` (`alfabeto.css`, `tokens.md`).

---

## Paleta para colar (tema Alfabeto — use HEX, não nomes)

> Stitch e Claude geram cor errada se você disser "azul". Sempre cole os HEX.

```
Primária (botões, links, ativo): #0467DB   | hover #023A85 | texto sobre primária #FFFFFF
Fundo da página: #FFFFFF   | Card/superfície: #F5F5F7   | Borda: #E5E7EB
Texto: #1F2937   | Texto secundário: #4B5563   | Placeholder: #6B7280
Status PAGO (verde):    fundo #C5F0DE / texto #1D6B4F
Status A VENCER (amarelo): fundo #FFF4D0 / texto #8A6D1C
Status VENCIDO (vermelho): fundo #FFD1D1 / texto #8A1818
Ação destrutiva: #EB0000
Radius padrão: 10px   | Tipografia: Inter (sans-serif)   | Sombra: leve nos cards
Hero/banner: gradiente #0467DB → #4B9EF5
```

---

## OPÇÃO 1 — Claude Design (recomendado p/ navegável + handoff a código)

**Por quê:** gera protótipo navegável, lê design docs inteiros, e **exporta pra Claude Code**
depois (o protótipo vira base do código real).

**Passo a passo (ordem importa — DS primeiro):**
1. Acesse https://claude.ai/design e crie um **projeto** "Education X — MVP".
2. **Anexe nesta ordem:** `01-DESIGN-SYSTEM-ALFABETO` + `alfabeto-source/alfabeto.css` +
   `alfabeto-source/tokens.md` (o sistema visual) → depois `00-PERSONAS`, `02-JORNADAS`,
   `03-FLUXOS` (o produto).
3. **Primeiro prompt — ensina o DS** (antes de qualquer tela):
   > *"Aprenda o design system Alfabeto dos anexos (tokens + componentes). Use como base
   > visual fixa de tudo: primária #0467DB, fundo branco, cards #F5F5F7, texto #1F2937,
   > radius 10px, Inter; status pago=verde, a vencer=amarelo, vencido=vermelho. Confirme que
   > entendeu antes de gerar telas."*
4. **Segundo prompt — gera as telas:** cole o **prompt mestre** abaixo.
5. Revise no canvas; itere por comentários nas telas.
6. Gere link compartilhável (view) para o comercial / Pimenta.

**Prompt mestre (cole no Claude Design):**
> "Crie um protótipo navegável de um sistema SaaS de gestão de matrículas e cobrança para
> escolas, chamado **Education X**. Use as personas (doc 00), as jornadas (doc 02) e os fluxos
> de tela (doc 03) que anexei, e siga estritamente o tema visual do doc 01 (Alfabeto):
> primária azul #0467DB, fundo branco, cards #F5F5F7, texto #1F2937, radius 10px, tipografia
> Inter, sombras leves. Status de cobrança: pago=verde #C5F0DE/#1D6B4F, a vencer=amarelo
> #FFF4D0/#8A6D1C, vencido=vermelho #FFD1D1/#8A1818.
>
> Gere todas as telas dos fluxos A (onboarding, desktop), B (matrícula via link, mobile),
> C (dashboard e cobranças, desktop) e D (negativação, desktop), com navegação clicável entre
> elas conforme o mapa de navegação do doc 03. Use dados de exemplo realistas em PT-BR (escola
> 'Kumon Camargos', responsável 'Maria Silva', aluno 'João Silva', valores em R$). Sidebar fixa
> com Dashboard, Matrículas, Cobranças, Negativação, Configurações. Priorize os momentos da
> verdade das jornadas: criação da subconta, aceite na matrícula, cobrar atrasado, dashboard."

---

## OPÇÃO 2 — Google Stitch

**Por quê:** ótimo pra telas individuais bonitas e exportar HTML; usa hotspots pra navegação.

**Passo a passo:**
1. Acesse https://stitch.withgoogle.com.
2. Gere **uma tela por prompt** (Stitch funciona melhor assim). Use os prompts por tela abaixo.
3. **Tema consistente:** selecione todas as telas (Shift+clique) e cole o "prompt de tema" para
   uniformizar cor/estilo em todas de uma vez.
4. Conecte as telas com **hotspots** conforme o mapa de navegação (doc 03).
5. Exporte HTML / compartilhe.

**Prompt de tema (aplicar em todas as telas — Shift+selecionar):**
> "Apply this theme to all selected screens: primary color #0467DB, page background #FFFFFF,
> card surface #F5F5F7, text #1F2937, secondary text #4B5563, border #E5E7EB, 10px border radius,
> Inter font, subtle card shadows. Status badges: paid green #C5F0DE/#1D6B4F, due yellow
> #FFF4D0/#8A6D1C, overdue red #FFD1D1/#8A1818. Clean institutional SaaS look like Stripe."

**Prompts por tela (exemplos — repetir o padrão para as demais do doc 03):**

- **C0 Dashboard (desktop):**
  > "Design a desktop dashboard for a school billing SaaS. Left sidebar nav with logo
  > 'Education X' and items Dashboard, Matrículas, Cobranças, Negativação, Configurações.
  > Top bar with school selector and user avatar. Four metric cards: 'Recebido no mês R$ 38.400'
  > (green), 'A vencer R$ 12.600' (yellow), 'Vencido R$ 1.200' (red), 'Alunos ativos 84'. A bar
  > chart of monthly revenue in blue #0467DB. A list 'Próximos vencimentos' with 5 rows. Primary
  > color #0467DB, 10px radius, Inter font, subtle shadows. Portuguese labels."

- **B2 Matrícula — Meus dados (mobile):**
  > "Design a mobile form screen, step 1 of 4 with a stepper at top. Header 'Matrícula · Kumon
  > Camargos'. Fields: Nome, CPF (with mask), Email, Telefone — all required with hints. Numeric
  > keyboard hint on CPF and phone. Primary button 'Próximo' in #0467DB. Clean, Inter font,
  > 10px radius. Portuguese."

- **C3 Lista de cobranças (desktop):**
  > "Design a desktop table screen for invoices. Segmented filter chips: Todas, A vencer, Pagas,
  > Vencidas. Table columns: Responsável, Aluno, Valor, Vencimento, Status, Forma. Status as
  > colored pill badges (paid green, due yellow, overdue red). Top-right primary button 'Nova
  > cobrança extra' #0467DB. Left sidebar nav. Portuguese, R$ values, Inter font."

- **C4 Detalhe da cobrança (desktop):**
  > "Design an invoice detail screen. Large amount 'R$ 450,00' with a status badge. Section
  > 'Pagamento' with buttons 'Ver boleto (PDF)', a copyable digitable line, and a PIX QR code with
  > copy-paste code. Section 'Nota fiscal' with download PDF/XML. A vertical history timeline
  > (emitida → enviada → paga). Action buttons: Reenviar, Editar valor, Cancelar (red). Primary
  > #0467DB. Portuguese."

- **D0 Painel de negativação (desktop):**
  > "Design a debt-collection dashboard. Three metric cards: 'Em aviso 4 → R$ 2.100', 'Negativados
  > 2 → R$ 800', 'Regularizados (mês) 3'. A table of overdue guardians: Responsável, Valor, Dias em
  > atraso, Status SPC (pill badge), Ver. Status badges: em aviso yellow, negativado red,
  > regularizado green. Primary #0467DB, Inter, Portuguese."

> Para as demais telas (A0–A5, B1/B3/B4/B5/B6, C1/C2/C5, D1) escreva o prompt no mesmo padrão,
> copiando o conteúdo descrito no doc 03 + o prompt de tema.

---

## Dicas que evitam resultado ruim (das duas ferramentas)

1. **Sempre HEX, nunca nome de cor** — "azul" gera tons diferentes a cada vez; `#0467DB` é exato.
2. **Linguagem de UI** — "segmented control", "pill badge", "stepper", "bottom sheet", "sidebar nav".
3. **Uma tela por prompt no Stitch**; o Claude Design aceita o conjunto de uma vez.
4. **Tema por último, em lote** (Stitch: Shift+selecionar todas → prompt de tema).
5. **Dados PT-BR realistas** (Kumon Camargos, Maria Silva, R$) — vende melhor que "lorem ipsum".
6. **Mobile só na matrícula (Fluxo B)**; o resto é desktop (painel).

---

## Depois do protótipo

- **Claude Design → Claude Code:** exporte o handoff; o protótipo aprovado vira ponto de partida
  do código real (shadcn + tokens Alfabeto), seguindo o `ROADMAP-IMPLEMENTACAO.md`.
- **Stitch → HTML:** use como referência visual; o código final usa shadcn + `var(--token)`.

# Design Handoff — Onboarding da Escola

> **Fase:** MVP · **Ordem:** 01 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-01-onboarding-escola.md`](../mvp-01-onboarding-escola.md) — fonte de verdade dos campos e regras.
> **Marca:** Alfabeto azul `#0467DB` · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440.
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## Como usar este handoff (conciliação com o protótipo existente)

Já existe um protótipo do Education X em andamento no Claude Design. **Não recrie do zero.** Para este fluxo:

1. **Localize as telas deste fluxo que já existem no protótipo** (4 passos: Dados · Cobrança · Matérias · Revisão).
2. **Concilie com a spec abaixo:** mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. **Onde a spec e o protótipo conflitarem, a spec vence** (é a fonte de verdade dos campos/regras). Sinalize divergências relevantes ao Rafa.

---

## 1. Objetivo

Dona cria uma escola em 4 passos, coletando identidade (CNPJ), endereço, plano de cobrança + preços de matérias. Fluxo é **claro e suave**, com validação de alta qualidade (erro inline, campos bloqueadores explícitos) e preços **sem confusão** (sempre mensal, sem "multiplicação"). Resultado: Unit + BillingConfig + ≥1 Subject criados e prontos pra usar.

---

## 2. As telas/passos (em ordem)

### Passo 1 — Dados da Escola
**Coleta:** CNPJ (autofill CEP/cidade/estado) · endereço completo · responsável (nome, CPF, telefone)

**Estrutura visual (mantém do PR #9):**
- **Card 1 — Identidade:** CNPJ (input grande, placeholder "00.000.000/0000-00", autofill ao sair do campo). Mostra nome legal + logo se encontrado.
- **Card 2 — Endereço:** CEP (autofill rua/bairro/cidade/estado), rua, número, complemento (opt), bairro, cidade, estado.
- **Card 3 — Responsável:** nome, CPF (mascarado pra exibição: "123.456.789-**"), telefone (formato: 11 99999-9999).

**Validação (Dor 1 — ALTA QUALIDADE):**
- Campo obrigatório marcado com asterisco vermelho.
- Erro inline: ícone + mensagem em vermelho abaixo do campo, muda foco pro input.
- Ex: "CNPJ inválido" · "CEP não encontrado" · "CPF precisa de 11 dígitos".
- Botão "Próximo" bloqueado enquanto houver erro; hover explica "Preencha os campos obrigatórios acima".

**Estados:**
- **Vazio:** formulário limpo, botão desabilitado.
- **Carregando (autofill):** spinner no input CNPJ/CEP, campos dependentes em disabled.
- **Erro:** msg inline + foco, botão desabilitado.
- **Válido:** botão ativo.

---

### Passo 2 — Sua Assinatura Education X + Cobrança
**Coleta:** plano IX (mensal da Education X) · dias de fechamento · taxa de processamento · quem paga

**Mudança crítica:** separar visualmente **"Sua assinatura Education X"** (o que a escola paga à plataforma) de **"Taxas de processamento"** (o que ela repassa ou absorve). Linguagem humana, sem jargão.

**Estrutura visual:**

**Seção 1 — Sua Assinatura Education X**
- Ícone de cadeado / shield
- Texto: "A Education X gera boletos pra você. Cobre isso:"
- Seletor do plano IX (Mensal / Trimestral / Semestral / Anual) — dropdown ou radio. Mostra valor/mês.
- Exemplo: "Mensal • R$ 49,90 / mês" (valor fictício, segue a tabela de planos).

**Seção 2 — Como a Gente Fecha a Conta**
- "Dia de fechamento do boleto" (qual dia do mês a gente gera) — input numérico 1-31, valor padrão 5.
- Tooltip (hover/info): "Os boletos dos alunos vencem 3 dias após a geração. Ex: gera no 5º → vence no 8º."
- "Dia de compensação" (qual dia entra o dinheiro em sua conta) — input numérico 1-31, valor padrão 10.
- Tooltip: "Geralmente 2-5 dias após o vencimento do boleto."

**Seção 3 — Taxa de Processamento**
- "A gente cobra uma taxa de processamento dos boletos" — mensagem clara.
- Taxa a.m. (ao mês) — input com símbolo %, Ex: "2%" (não "200 basis points"). Padrão é 2.
- Tooltip: "Taxa mensal sobre os boletos vencidos. Ex: boleto de R$ 1.000 com 2% = você repassa R$ 20 pra gente."
- Quem paga (toggle/radio): "Você absorve" / "Aluno paga junto no boleto". Afeta como aparece na revisão.

**Validação (Dor 1):**
- Plano obrigatório. Dias 1-31 obrigatórios.
- Taxa 0-10% obrigatória (razoável).
- Mensagem de erro inline se inválido. Ex: "Taxa máxima é 10%" · "Dia deve ser entre 1 e 31".

**Estados:**
- **Vazio / preenchimento:** campos visíveis, botões Next/Back funcionam.
- **Erro:** msg inline em vermelho, foco no campo.
- **Carregando (submit):** spinner no botão Next.

---

### Passo 3 — Matérias & Preços (Dor 2 — REDESIGN DOS PLANOS)
**Coleta:** nome da matéria · código NFS-e (opcional) · **4 planos (Mensal/Tri/Sem/Anual) com valor mensal + desconto**

**Mudança raiz (Dor 2 — "multiplicação" corrigida):**
- Cada matéria tem até **4 planos**. Cada plano = período de contrato (Mensal / Trimestral / Semestral / Anual).
- **Valor é sempre MENSAL.** Cobrança é sempre mensal. Período é compromisso, não frequência.
- Ex: "Matemática — Plano Anual R$ 380/mês" (paga R$380 todo mês, comprometido por 12 meses).

**Estrutura visual — Adicionar Matéria:**

1. **Header:** "Adicione as matérias que oferece" + botão "Adicionar Matéria" (verde Alfabeto).

2. **Card por Matéria (accordion/collapse ou card grande):**
   - **Linha 1:** Nome (input obrigatório, ex "Matemática") + Código NFS-e (input opcional, ex "9101").
   - **Linha 2:** Bloco de preços — 4 colunas/linhas conforme breakpoint:
     - **Plano Mensal** (obrigatório)
       - Label: "Plano Mensal"
       - Input: R$ _____ / mês
       - Sem desconto (baseline).
     - **Plano Trimestral** (opcional)
       - Label: "Plano Trimestral"
       - Input: R$ _____ / mês
       - Desconto em relação ao Mensal (auto-calcula): "🟢 15% mais barato que Mensal"
     - **Plano Semestral** (opcional)
       - Label: "Plano Semestral"
       - Input: R$ _____ / mês
       - Desconto: "🟢 18% mais barato que Mensal"
     - **Plano Anual** (obrigatório)
       - Label: "Plano Anual"
       - Input: R$ _____ / mês
       - Desconto: "🟢 16% mais barato que Mensal"

   - **Nota visual:** se escola digita Mensal = 450, Anual = 380, o sistema mostra:
     - Anual: "R$ 380/mês 🟢 16% mais barato que Mensal (que custa R$ 450)"
     - Nunca: "Anual R$ 1.140/trimestre" ou multiplicação.

   - **Ações por card:** Botão "Remover" (trash icon, só se não é a única matéria).

**Validação (Dor 1):**
- Nome obrigatório. Erro: "Nome não pode estar vazio."
- Plano Mensal obrigatório. Plano Anual obrigatório. Tri/Semestral opcional.
- Valor > 0. Erro: "Valor deve ser maior que R$ 0."
- Mensagem inline em vermelho se inválido.
- Botão "Próximo" bloqueado até ter ≥1 matéria completa.

**Estados:**
- **Vazio:** "Nenhuma matéria adicionada." Botão Add Matéria ativo.
- **Adicionando:** form aberto, validação inline.
- **Carregando (submit):** spinner no botão Next.

---

### Passo 4 — Revisão
**Mostra:** resumo de tudo, pronto pra criar.

**Estrutura visual:**

1. **Seção Dados — (título pequeno):** "Dados da Escola"
   - Escola: [Nome Legal] (CNPJ: 00.000.000/0000-00)
   - Endereço: [Rua, Nº, Complemento], [Bairro], [Cidade] – [Estado]
   - Responsável: [Nome] (CPF mascarado)
   - Botão "Editar" (pencil icon, volta pro Passo 1).

2. **Seção Cobrança — (título pequeno):** "Sua Assinatura Education X"
   - Plano: [Mensal / Trimestral / Semestral / Anual] • R$ XX,XX / mês
   - Fechamento: [dia X] de cada mês
   - Taxa: [X]% a.m. ([quem paga: "Você absorve" / "Aluno paga"])
   - Botão "Editar".

3. **Seção Matérias — (título pequeno):** "Matérias & Preços"
   - **Por matéria (lista vertical):**
     - Matéria: [Nome] (Código NFS-e: [código] se preenchido)
     - Planos (resumo conciso):
       - Mensal: R$ XXX / mês
       - Trimestral: R$ XXX / mês (se preenchido, senão "—")
       - Semestral: R$ XXX / mês (se preenchido, senão "—")
       - Anual: R$ XXX / mês
     - **Nunca multiplicar. Todo valor exibido é /mês.**
   - Botão "Editar".

4. **Rodapé:**
   - Botão "Voltar" (volta pro Passo 3).
   - Botão "Confirmar & Criar Escola" (verde, submit).

**Validação (Dor 1):**
- Só chega aqui se todos os passos passaram. Não há validação nesta tela (é revisão).
- Se clicar Editar, volta pro passo escolhido, dados persistem.

**Estados:**
- **Preenchimento:** user revisa, pode voltar.
- **Carregando (submit):** spinner no botão "Confirmar & Criar Escola".
- **Sucesso:** tela de sucesso (fora do escopo desta spec, mas avisa Rafa se não existir).
- **Erro (API):** mensagem de erro centrada + botão "Voltar & Tentar Novamente".

---

## 3. Estados globais do fluxo

| Estado | Visibilidade | Ação |
|--------|--------------|------|
| **Carregando (autofill)** | Spinner no input, campos dependentes disabled | CNPJ/CEP sendo validados |
| **Carregando (submit)** | Spinner no botão Next, inputs disabled | POST pra criar/validar |
| **Erro (validação)** | Msg inline em vermelho, campo com borda vermelha, foco | User corrige e tenta novamente |
| **Erro (API)** | Toast/modal vermelha com mensagem (ex: "CNPJ já cadastrado") | User volta ou ajusta dados |
| **Sucesso** | Transição pro próximo passo sem delay | Dados persistem |

---

## 4. Campos por passo (checklist de coleta)

### Passo 1 — Dados
- [ ] CNPJ (obrigatório, autofill nome legal + logo)
- [ ] CEP (obrigatório, autofill rua/bairro/cidade/estado)
- [ ] Rua (obrigatório)
- [ ] Número (obrigatório)
- [ ] Complemento (opcional)
- [ ] Bairro (obrigatório)
- [ ] Cidade (obrigatório)
- [ ] Estado (obrigatório, dropdown UF)
- [ ] Nome Responsável (obrigatório)
- [ ] CPF Responsável (obrigatório, 11 dígitos, mascarado na exibição)
- [ ] Telefone Responsável (obrigatório, formato 11 99999-9999)

### Passo 2 — Cobrança
- [ ] Plano IX (obrigatório, dropdown)
- [ ] Dia de fechamento (obrigatório, 1-31)
- [ ] Dia de compensação (obrigatório, 1-31)
- [ ] Taxa a.m. (obrigatório, 0-10%, formato %)
- [ ] Quem paga taxa (obrigatório, toggle/radio)

### Passo 3 — Matérias
- [ ] **Por matéria (≥1):**
  - [ ] Nome (obrigatório)
  - [ ] Código NFS-e (opcional)
  - [ ] Preço Mensal (obrigatório, > 0)
  - [ ] Preço Trimestral (opcional, > 0 se preenchido)
  - [ ] Preço Semestral (opcional, > 0 se preenchido)
  - [ ] Preço Anual (obrigatório, > 0)

### Passo 4 — Revisão
- Sem entrada. Só resumo + edit buttons.

---

## 5. Regras que afetam a UI (extraídas da spec)

1. **Mensal + Anual sempre obrigatórios** (Trimestral/Semestral opcionais).
   - UI: asterisco vermelho só em Mensal e Anual.

2. **Valor sempre mensal, nunca multiplicar.**
   - UI: label do input "R$ _____ / mês" em cada plano. Revisar Passo 4 pra nunca exibir "R$ 1.140 trimestral".

3. **Desconto automático = "(X% mais barato que Mensal)"** ao lado do Anual/Tri/Sem.
   - Fórmula: `desconto = ((mensal - valor_do_plano) / mensal) * 100`.
   - Ex: Mensal 450, Anual 380 → desconto = (450-380)/450 = 17% (arredonda pra 16-17%).

4. **Separação plano-IX × matéria:**
   - Passo 2: rótulo "Sua Assinatura Education X" (o que escola paga à IX).
   - Passo 3: rótulo "Matérias" ou "Quanto você cobra das famílias" (o que aluno paga à escola).
   - Visuais distintos (cores, ícones, seções).

5. **Validação inline em tempo real** (Dor 1):
   - Ao sair do campo (blur) ou no submit.
   - Mensagem específica (não "erro", mas "CNPJ inválido" ou "CEP não encontrado").
   - Foco no primeiro campo com erro.

6. **Linguagem humana, sem jargão** (Passo 2):
   - "Dia de fechamento" → "Quando fechamos a conta do mês".
   - "2% a.m." em vez de "200 basis points".
   - Tooltips explicam o "porquê" (ex: "Por que 3 dias?").

7. **Responsivo:** 375px (mobile) / 768px (tablet) / 1440px (desktop).
   - Mobile: stacka tudo, inputs em full-width.
   - Tablet: 2 colunas onde couber.
   - Desktop: layout flexível, cards lado-a-lado.

---

## 6. Referência visual existente

**Protótipo base:** `specs/prototipo/design-handoff/project/app/screens-a.jsx`

**Componentes já no repo (reusar):**
- Button (primário / secundário / desabilitado)
- Input (com validação, label, placeholder, error state)
- Select / Dropdown
- Card (com padding/border conforme Alfabeto)
- Tooltip (info icon + hover)
- Spinner / Loading state
- Toast / Error message

**Design System — Alfabeto:**
- Cores: Azul primary `#0467DB` · branco `#FFF` · cinza light `#F5F5F5` · vermelho erro `#E53E3E`.
- Tipografia: Fonte sans-serif (Alfabeto define), h1/h2/body/caption.
- Spacing: grid 8px.
- Border-radius: 8px cards.
- Sombras: sutil em cards.

**Divergências conhecidas do protótipo (já corrigidas na spec):**
- Protótipo: "Trimestral 1140 = 3×380" (multiplicação). **Spec vence:** R$ 380/mês, período trimestral.
- Protótipo: validação talvez fraca (botão sempre ativo). **Spec vence:** validação alta qualidade, erro inline claro, botão bloqueador.

---

## Checklist para conciliação

Ao ajustar o protótipo:

- [ ] Passo 1 (Dados): 3 cards, autofill CNPJ/CEP, validação inline em cada campo obrigatório.
- [ ] Passo 2 (Cobrança): separação clara "Sua Assinatura" vs "Taxas", tooltips, linguagem humana.
- [ ] Passo 3 (Matérias): bloco de 4 planos por matéria, valor sempre /mês, desconto auto-calculado, mensal+anual obrigatórios.
- [ ] Passo 4 (Revisão): resumo limpo, botões Editar, sem multiplicação.
- [ ] Validação: erro inline, mensagem clara, botão bloqueador, foco no primeiro erro.
- [ ] Estados: loading/erro/sucesso em todos os passos, spinner em inputs/botões.
- [ ] Responsivo: 375/768/1440px, layout fluido.
- [ ] Tom: informal, direto, zero jargão, como fala dona.

---

**Próximo passo:** Rafa valida conciliação. Se divergências críticas, sinalize no Slack #bots. Implementação fatia em Task Contracts (validação alta qualidade · redesign preços · linguagem humana).

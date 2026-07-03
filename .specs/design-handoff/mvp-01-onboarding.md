# Design Handoff — Onboarding da Escola

> **Fase:** MVP · **Ordem:** 01 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-01-onboarding-escola.md`](../mvp-01-onboarding-escola.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## 1. Objetivo

Onboarding em 4 passos sequenciais que resolve 2 dores:
- **Validação fraca:** campos obrigatórios não comunicados claramente → dona envia incompleto
- **Preços confusos:** modelo de planos/taxas não diferencia assinatura IX vs cobranças operacionais → dúvida na ativação

A dona preenche dados da escola, configura taxa de serviço, define matérias com planos de preço, revisa tudo e ativa.

---

## 2. Fluxo (4 Passos)

### Passo 1: Dados da Escola
3 cards progressivos; **CNPJ-first** — ao preencher, revela campos seguintes automaticamente.

**Cards:**
1. **Identificação:** CNPJ → autofill Razão Social
2. **Endereço:** CEP → autofill Cidade/Estado/Rua (editável)
3. **Responsável:** Nome + Email + Telefone + CPF

| Campo | Obrigatório | Comportamento |
|---|---|---|
| CNPJ | Sim | Valida; autofill nome + endereço da base de dados |
| Razão Social | Sim | Autofill do CNPJ; editável |
| CEP | Sim | Busca; autofill Cidade/Estado/Rua |
| Rua + Número | Sim | Autofill da CEP; editável |
| Complemento | Não | Campo de texto livre |
| Cidade + Estado | Sim | Autofill da CEP; editável |
| Nome Responsável | Sim | Campo texto; PII mascarada em resumos |
| Email Responsável | Sim | Campo texto; PII mascarada em resumos |
| Telefone Responsável | Sim | Campo texto; criptografado em BD |
| CPF Responsável | Sim | Campo texto; criptografado em BD |

---

### Passo 2: Cobrança + Plano IX
Separação visual clara: **"Sua assinatura Education X"** (o que você paga pra IX) vs **"Taxas operacionais"** (o que você cobra das famílias na matéria).

Linguagem humanizada; tooltip em cada taxa explicando o "por quê".

| Campo | Obrigatório | Comportamento |
|---|---|---|
| Dia de fechamento | Sim | Select 1–31; tooltip: "Quando fechamos a conta do mês" |
| Taxa de serviço | Sim | Campo %; exibir como "2% a.m." NÃO "200bp" |
| Quem paga taxa | Sim | Radio: Escola \| Família |
| Plano Education X | Sim | Select: Starter / Plus / [outros]; explica features de cada |
| Desconto (anual/cupom) | Não | Campo texto; aplicar ao resumo |

---

### Passo 3: Matérias
Lista de matérias; cada uma exibe **4 planos lado a lado:** Mensal \| Trimestral \| Semestral \| Anual.

Dona preenche preço **mensal** de cada; sistema calcula desconto automático automaticamente e exibe: _"Anual R$ 380/mês — 16% mais barato que Mensal"_.

| Campo | Obrigatório | Comportamento |
|---|---|---|
| Nome (matéria) | Sim | Campo texto |
| Código NFS-e | Sim | Campo texto; validar formato |
| Preço Mensal | Sim | Campo moeda (R$) |
| Preço Trimestral | Não | Auto-calculado ou editável |
| Preço Semestral | Não | Auto-calculado ou editável |
| Preço Anual | Sim | Bloqueador: obrigatório para avançar |

**Regra:** Mensal + Anual **obrigatórios**; Trimestral e Semestral opcionais. Sistema calcula desconto percentual entre Mensal e Anual. Sempre exibe preço **por mês** com rótulo "(mês)" ao lado.

---

### Passo 4: Revisão
Resumo único de tudo (CNPJ mascarado, nome mascarado, etc). Mostra:
- Dados da escola (resumido)
- Assinatura IX (plano + preço)
- Taxas operacionais (dia, %)
- Matérias + planos (sempre por mês)

Botão: **"Ativar Escola"** (submit final).

---

## 3. Estados da UI

### Loading
- **Quando:** autofill CNPJ/CEP, submit de passo
- **Visual:** spinner no campo ou inline; botão disabled + cursor wait
- **Duração esperada:** <2s (CNPJ), <1s (CEP)

### Erro Validação
- **Quando:** campo obrigatório vazio ao sair, formato inválido, CNPJ duplicado
- **Visual:** 
  - Borda vermelha no campo
  - Mensagem inline abaixo: _"Campo obrigatório"_ ou _"CNPJ inválido"_
  - Foco automático no primeiro erro ao clicar "Próximo"
  - Banner resumo antes do botão: _"Campos faltando: [lista]"_

### Erro API
- **Quando:** falha autofill, falha submit passo
- **Visual:** banner vermelho no topo + ícone alerta + botão "Tentar novamente"

### Sucesso
- **Quando:** submit final Passo 4
- **Visual:** animação breve + mensagem confirmação ("Escola ativada!") + redirect dashboard em 2s

### Vazio
- **Quando:** Passo 3, nenhuma matéria adicionada
- **Visual:** ícone vazio + texto _"Nenhuma matéria adicionada"_ + botão primário _"Adicionar primeira matéria"_

---

## 4. Regras que Afetam a UI

| Regra | Impacto |
|---|---|
| Asterisco vermelho `*` em campos obrigatórios | Visual; no rótulo do campo |
| Validação inline ao sair do campo (blur) | UX; não aguarda submit |
| Resumo "Campos faltando: [...]" antes de avançar | Bloqueador; lista abaixo do form |
| Botão "Próximo" disabled se obrigatório vazio | Bloqueador visual; tooltip explica |
| CNPJ válido revela cards Endereço + Responsável | Progressivo; cards aparecem com fade-in |
| Autofill CNPJ/CEP com loading visual | UX; não travador |
| Preços **sempre por mês** com rótulo "(mês)" | Reduz confusão; texto auxiliar menor |
| **Nunca multiplica** preços internamente (ex: trimestral = mensal × 3) | Regra de negócio; sistema calcula desconto puro |
| Desconto automático mostrado | Marketing; texto: "16% mais barato que Mensal" |
| Mensal + Anual obrigatórios bloqueiam avanço | Bloqueador; tooltip: "Defina o preço anual para continuar" |
| Separação visual plano-IX ("Sua assinatura") vs matéria ("Quanto você cobra das famílias") | Clareza; cores/grupos visuais distintos |
| Linguagem humanizada em taxas (tooltips explicativos) | Tom; ex: _"Taxa de 2% cobre custos de processamento"_ |

---

## 5. Campos & PII

### Campos Obrigatórios (Bloqueadores)
- CNPJ, Razão Social, CEP, Rua+Número, Cidade, Estado
- Nome Responsável, Email, Telefone, CPF
- Dia fechamento, Taxa, Quem paga, Plano IX
- Matérias: Nome, Código NFS-e, Preço Mensal, Preço Anual

### PII a Mascarar em Resumos/Dashboard
- **CNPJ:** `XX.XXX.XXX/XXXX-XX`
- **Nome:** `Silv... L.`
- **Email:** `s****@email.com`
- **Telefone:** `(XX) 9XXXX-XXXX`
- **CPF:** `XXX.XXX.XXX-XX`

---

## 6. Referência Visual Existente

- **Protótipo:** `screens-a.jsx` (4 passos, Alfabeto azul #0467DB)
- **Componentes:** `src/components/onboarding/` + `src/hooks/use-onboarding.ts`
- **PR vinculada:** #9
- **Stack:** shadcn/ui, Tailwind CSS

**Não especificado no protótipo:**
- Cards de matéria (Passo 3) com 4 planos lado a lado → design livre, manter coerência com Alfabeto
- Estados detalhados (loading, erro, vazio) → implementar conforme padrão do app
- Tooltips em taxas → escrita livre, manter tom humanizado

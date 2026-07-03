# Design Handoff — Matrícula (assistida + aprovação)

> **Fase:** MVP · **Ordem:** 02 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-02-matricula.md`](../mvp-02-matricula.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## 1. Objetivo

A orientadora preenche uma matrícula assistida criando ou reutilizando um **Guardian** (responsável), adicionando **Student(s)** (aluno(s)), definindo matérias/plano/desconto e gerando um link de confirmação para o responsável revisar dados pessoais e aceitar termos. Após confirmação do responsável, a orientadora aprova a matrícula no painel, criando automaticamente o customer no Asaas. Fluxo de dupla aprovação: orientadora + responsável.

---

## 2. Telas e Passos do Fluxo

### Passo 1 — Busca/Novo Responsável
Orientadora busca por nome ou CPF do Guardian existente ou seleciona "Cadastrar novo responsável".

- **Campo de busca:** nome ou CPF
- **Resultado:** lista de Guardians existentes (nome, CPF mascarado) ou opção "Cadastrar novo"
- **Seleção:** clica no Guardian ou no botão "Novo responsável"

### Passo 2 — Dados do Responsável
Se novo Guardian: preenche formulário. Se existente: dados pré-carregados (reutiliza, recusa duplicata).

**Campos:**
- `name` (obrigatório)
- `cpf` (obrigatório, validação CPF)
- `email` (obrigatório, validação email)
- `phone` (obrigatório)
- `selfPayer` (toggle booleano, default false)

Se `selfPayer = true`, pula direto para Passo 3. Se `false`, segue para Passo 2b.

### Passo 2b — Aluno(s)
Modo "Adicionar aluno" — máximo 5. Botão "Adicionar aluno" desativo após atingir 5. Mostra lista de alunos adicionados com opção remover.

**Campos por aluno:**
- `name` (obrigatório, PII)
- `birthDate` (obrigatório, PII)
- `notes` (opcional)

### Passo 3 — Matérias, Plano e Desconto (por aluno)
**Por cada aluno**, orientadora escolhe:

1. **Matéria(s):** chips selecionáveis (ex: Matemática, Português, Inglês, etc.)
2. **Plano:** dropdown com planos que têm preço configurado (MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL)
3. **Desconto (fluxo manual apenas):**
   - Tipo: `PERCENT` (%) ou `FIXED` (R$) ou nenhum
   - Valor: numérico
   - Calculadora em tempo real mostra `finalPriceCents` (calculado no servidor, UI exibe)

**Campos:**
- `subjectId` (por aluno, obrigatório)
- `plan` (MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL, obrigatório, só planos com preço)
- `discountType` (PERCENT | FIXED | null)
- `discountValueBp` (percentual, se PERCENT)
- `discountValueCents` (R$, se FIXED)
- `finalPriceCents` (calculado servidor, exibido na revisão)

### Passo 4 — Revisão
Tabela resumida: aluno(s) × matéria(s) × plano × desconto (se houver) × valor final.

**Dois botões:**
1. **"Enviar link ao responsável"** → gera token, envia email com link de confirmação, transição para `PENDING_CONFIRMATION`
2. **"Confirmar agora (presencial)"** → salta link, transição direto para `PENDING_SCHOOL_APPROVAL` (caso responsável esteja presente)

---

## 3. Estados (Enrollment)

| Estado | Significado | Ator Seguinte | Ação |
|--------|-------------|---------------|------|
| `PENDING_CONFIRMATION` | Link enviado, aguardando responsável confirmar e aceitar termos | Responsável | Clica link, confirma dados pessoais, aceita termos |
| `PENDING_SCHOOL_APPROVAL` | Responsável confirmou/aceitou, aguardando escola revisar | Orientadora (painel) | Aprova ou recusa matrícula |
| `ACTIVE` | Escola aprovou, Guardian criado no Asaas | Sistema | Matrícula ativa, cobrança ativa |
| `CANCELLED` | Responsável recusou ou não confirmou no prazo | — | Removido, não gera customer Asaas |

**Painel de Matrículas Pendentes:** lista todas em `PENDING_SCHOOL_APPROVAL` com:
- Nome do responsável
- Aluno(s) / matéria(s) / plano / valor final (só-leitura)
- Data de confirmação pelo responsável
- Botões: **Aprovar** (cria customer Asaas, transição → ACTIVE) | **Recusar** (transição → CANCELLED)

---

## 4. Campos e Validações

| Campo | Entidade | Obrigatório | Tipo | PII | Validação | Nota |
|-------|----------|-------------|------|-----|-----------|------|
| `name` | Guardian | Sim | String | Não | 1–100 caracteres | — |
| `cpf` | Guardian | Sim | String | **Sim** (criptografado) | Validação CPF, sem duplicata | Mascarar na tela: `***.456.789-**` |
| `email` | Guardian | Sim | String | **Sim** (criptografado) | Validação RFC 5322 | Mascarar na tela: `hel****@example.com` |
| `phone` | Guardian | Sim | String | **Sim** (criptografado) | E.164 ou (XX) 9XXXX-XXXX | Mascarar na tela: `(11) 9****-1234` |
| `selfPayer` | Guardian | Não | Boolean | Não | — | Default: false; se true, oculta Passo 2b |
| `name` | Student | Sim | String | **Sim** | 1–100 caracteres | Criptografado no servidor |
| `birthDate` | Student | Sim | Date | **Sim** | ISO 8601 (YYYY-MM-DD) | Criptografado no servidor |
| `notes` | Student | Não | String | Não | 0–500 caracteres | Observações livres |
| `subjectId` | Enrollment | Sim | ID | Não | Matéria deve existir | Por aluno |
| `plan` | Enrollment | Sim | Enum | Não | MONTHLY \| QUARTERLY \| SEMIANNUAL \| ANNUAL | Apenas planos com preço |
| `discountType` | Enrollment | Não | Enum | Não | PERCENT \| FIXED \| null | Fluxo manual; omitir fluxo assistido |
| `discountValueBp` | Enrollment | Não | Integer | Não | 0–10000 (0.00–100.00%) | Se `discountType = PERCENT` |
| `discountValueCents` | Enrollment | Não | Integer | Não | ≥ 0 | Se `discountType = FIXED` |
| `finalPriceCents` | Enrollment | Não | Integer | Não | Calculado servidor | Snapshot no momento criação; exibido revisão |
| `status` | Enrollment | Sim | Enum | Não | PENDING_CONFIRMATION \| PENDING_SCHOOL_APPROVAL \| ACTIVE \| CANCELLED | Transição por ator |

---

## 5. Regras que Afetam a UI

1. **Limite 5 alunos:** após adicionar o 5º, botão "Adicionar aluno" fica desativo; mensagem "Máximo de 5 alunos"
2. **Dropdown de plano:** mostra apenas planos com `preço > 0` configurado
3. **Desconto (fluxo manual apenas):** CTA desconto presente apenas na Passo 3, oculto no fluxo link
4. **finalPriceCents:** calculado no servidor (orientadora não envia, só exibe na revisão); snapshot registrado no banco
5. **Busca por CPF:** detecta Guardian existente automaticamente, evita duplicata
6. **selfPayer = true:** oculta Passo 2b (não precisa de alunos; usa Guardian como Student)
7. **Matéria por aluno:** seleção independente (não compartilhada com outros alunos)
8. **Painel aprovação (dados responsável):** dados pessoais exibidos com destaque nas edições feitas pelo responsável; matéria/plano/valor só-leitura
9. **Aprovação final:** POST `/customers` Asaas dispara transição `PENDING_SCHOOL_APPROVAL` → `ACTIVE`

---

## 6. Referência Visual

**Protótipo:** `screens-c2.jsx` (fluxo manual 4 passos, esquemático)

**Painel de Aprovação:** não especificado neste handoff. Implementação deverá:
- Listar enrollments em status `PENDING_SCHOOL_APPROVAL`
- Exibir Guardian name, aluno(s), matéria(s), plano, valor final (campos em revisão não editáveis)
- Destacar dados pessoais que foram editados pelo responsável (se houver)
- Oferecer botões Aprovar / Recusar com feedback de confirmação

**Paleta:** Alfabeto azul `#0467DB` (primário). Componentes shadcn/ui (tema claro, acessibilidade WCAG AA). Texto: pt-BR, informal.

**Breakpoints:** 375px (mobile), 768px (tablet), 1440px (desktop).

---

## 7. Fluxo de Dados Resumido

1. Orientadora inicia → Busca ou Novo Guardian
2. Preenche Guardian (+ Student(s) se `selfPayer = false`)
3. Por aluno: escolhe matéria, plano, desconto (opcional)
4. Revisão: exibe resumo + valor final
5. Botão: "Enviar link ao responsável" (status → `PENDING_CONFIRMATION`) OU "Confirmar agora" (status → `PENDING_SCHOOL_APPROVAL`)
6. Orientadora acessa painel → lista matrículas em `PENDING_SCHOOL_APPROVAL`
7. Clica Aprovar → POST `/customers` Asaas → transição `ACTIVE`

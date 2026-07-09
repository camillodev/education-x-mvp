# Design Handoff — Matrícula (assistida + aprovação)

> **Fase:** MVP · **Ordem:** 02 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-02-matricula.md`](../mvp-02-matricula.md) — fonte de verdade dos campos e regras.
> **Marca:** Alfabeto azul `#0467DB` · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440.
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

## Como usar este handoff (conciliação com o protótipo existente)

Já existe um protótipo do Education X em andamento no Claude Design. **Não recrie do zero.** Para este fluxo:

1. Localize as telas deste fluxo que já existem no protótipo (referência: `screens-b.jsx`, `screens-c2.jsx`).
2. Concilie com a spec abaixo: mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. Onde a spec e o protótipo conflitarem, **a spec vence**. Sinalize divergências relevantes ao Rafa.

---

## 1. Objetivo

**Criar uma matrícula:** vincular um Guardian (responsável financeiro) a um ou mais Students (alunos), em uma ou mais Enrollments (aluno × matéria × plano × preço).

**Dois caminhos:**
- **Link:** responsável preenche tudo no celular e assina o contrato da escola (fluxo público).
- **Manual:** orientador preenche, responsável recebe link só para confirmar e assinar (fluxo assistido com aprovação dupla).

**Ao final:** Guardian existe no Asaas como customer + Students + Enrollments criados e prontos para cobrança mensal.

---

## 2. Telas/passos — Fluxo via Link (responsável, mobile)

Referência: `screens-b.jsx` como baseline visual.

| Tela | Passo | Componentes principais | Mascara PII? | Resultado |
|------|-------|------------------------|--------------|-----------|
| **B1 Boas-vindas** | Intro | Logo unidade, nome aluno pré-preenchido (opcional), CTA "Começar" | Não | Inicia fluxo |
| **B2 Seus dados** | 1/4 | Guardian.name, Guardian.cpf (com máscara `***.456.789-**`), Guardian.email, Guardian.phone (WhatsApp) | Sim | Coleta dados responsável |
| **B3 Dados do aluno** | 2/4 | Student.name, Student.birthDate, chips de matéria (Subject.name com cor). Limite: 5 alunos. Botão "Adicionar outro aluno" ativo se < 5 | Não input, não exibir | Coleta dados aluno(s) |
| **B4 Escolha o plano** | 3/4 | Cards de plano (MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL — só exibir se têm preço em Subject). Badge "Mais popular" ou "Melhor custo-benefício" (config. escola). Caixa de resumo com total consolidado | Não | Escolhe plano por matéria |
| **B5 Quase lá** | 4/4 | Resumo (aluno(s), matérias, plano, vencimento BillingConfig.dueDay). Condições (multa/juros/cancelamento). Contrato expandível (TermsVersion.body tipo ESCOLA_RESPONSAVEL). **Checkbox de aceite (OBRIGATÓRIO para liberar botão)** | Não | Aceita termos |
| **B6 Enviado** | Confirma | Confirmação visual "Sua matrícula foi enviada". Instrução "Aguarde aprovação da escola" | Não | Enrollment → PENDING_SCHOOL_APPROVAL |

---

## 3. Telas/passos — Fluxo Manual (orientador, desktop)

Referência: `screens-c2.jsx` como baseline visual (seleção responsável + desconto).

| Tela | Passo | Componentes principais | Campos editáveis? | Resultado |
|------|-------|------------------------|-------------------|-----------|
| **C1 Responsável** | 1/4 | Busca Guardian por nome/CPF (busca interna, reutiliza se existe) OU cadastro novo (Guardian.name, Guardian.cpf, Guardian.email, Guardian.phone). **Toggle `selfPayer`** (oculta passo C2 se ativado) | Sim | Guardian novo ou existente |
| **C2 Aluno(s)** | 2/4 | Até 5 Students: Student.name, Student.birthDate. Botão "Adicionar aluno" | Sim | Coleta dados aluno(s) |
| **C3 Matérias, plano e desconto** | 3/4 | Por aluno: chips Subject (multiseleção), dropdown Enrollment.plan (MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL, só com preço), desconto opcional (`discountType` PERCENT/FIXED com input e calculadora). Exibe valor final por mês | Sim (matérias, plano, desconto) | Define Enrollments com desconto |
| **C4 Revisão** | 4/4 | Tabela resumo: Guardian (dados), Students (nomes), Enrollments (matéria, plano, preço, desconto, total). Botão "Enviar link ao responsável" (gera confirmationToken, envia email) OU "Confirmar agora" (presencial: orientador marca aceite, IP orientador, nota "confirmado presencialmente") | Não (visualização) | Cria Enrollment PENDING_CONFIRMATION |

**Nota — selfPayer:**
Se `Guardian.selfPayer = true`, oculta passo "Dados do aluno" e reutiliza dados do Guardian como Student (name + cpf já coletados). Enrollment.studentId aponta a Student automaticamente criado.

---

## 4. Estados da Matrícula

```
[início]
    ↓
PENDING_CONFIRMATION        ← Fluxo manual: orientador criou, aguarda responsável abrir link
    ↓ responsável abre link, edita dados pessoais (sobrescreve orientador), aceita termos
PENDING_SCHOOL_APPROVAL     ← Responsável aceitou; escola precisa aprovar
    ↓ orientador/escola aprova no painel → POST /customers Asaas aqui
ACTIVE                      ← Pronto para cobrança
    ↓
CANCELLED                   ← Cancelamento (irreversível no MVP)
```

**Fluxo link (B1→B6):** responsável preenche → aceita termos → `PENDING_SCHOOL_APPROVAL` imediatamente → escola aprova → `ACTIVE`.

**Fluxo manual (C1→C4):** orientador preenche → gera token → responsável abre link (C5) → edita dados pessoais → aceita termos → `PENDING_SCHOOL_APPROVAL` → escola aprova → `ACTIVE`.

---

## 5. Campos — Coleta de dados

### Guardian (responsável financeiro)

| Campo | Tipo | Obrigatório? | Criptografia | Máscara UI | Enviado ao Asaas? |
|-------|------|--------------|--------------|------------|-------------------|
| `name` | texto | Sim | Não | Não | Sim |
| `cpfEnc` | CPF | Sim | AES-256-GCM | `***.456.789-**` | Descriptografar na borda |
| `emailEnc` | email | Sim | AES-256-GCM | `ma***@email.com` | Descriptografar na borda |
| `phoneEnc` | WhatsApp | Sim | AES-256-GCM | `(31) 9****-4321` | Descriptografar na borda |
| `selfPayer` | boolean | Não | Não | Não | Não |

### Student (aluno)

| Campo | Tipo | Obrigatório? | Criptografia | Máscara UI | Notas |
|-------|------|--------------|--------------|------------|-------|
| `nameEnc` | texto | Sim | AES-256-GCM | Não exibir descriptografado | Nome do aluno |
| `birthDateEnc` | data (DD/MM/AAAA) | Sim | AES-256-GCM | Não exibir descriptografado | Data de nascimento |
| `notes` | texto | Não | Não | Não | Observações livres |

### Enrollment (aluno × matéria × plano × preço)

| Campo | Tipo | Obrigatório? | Origem | Editável? | Notas |
|-------|------|--------------|--------|-----------|-------|
| `subjectId` | FK Subject | Sim | Chips de matéria | Sim (fluxo manual) | Multiseleção por aluno |
| `plan` | enum | Sim | Dropdown (MONTHLY/QUARTERLY/SEMIANNUAL/ANNUAL) | Sim (fluxo manual) | Apenas planos com preço |
| `agreedPriceCents` | inteiro (centavos) | Sim | Subject.priceCents snapshot | Não (fluxo link), Sim (fluxo manual) | Valor mensal no momento da matrícula |
| `discountType` | enum | Não | Segmented (PERCENT/FIXED) | Só fluxo manual | Desconto por aluno |
| `discountValueBp` | inteiro | Não (se PERCENT) | Input % | Só fluxo manual | Basis points (ex.: 500 = 5%) |
| `discountValueCents` | inteiro | Não (se FIXED) | Input R$ | Só fluxo manual | Centavos (ex.: 5000 = R$ 50) |
| `finalPriceCents` | inteiro (calculado) | Sim | `agreedPriceCents - desconto` | Não (somente leitura) | Salvo no servidor para auditoria |
| `status` | enum | Sim | Auto (PENDING_CONFIRMATION) | Não | Controlado por sistema |

---

## 6. Regras que afetam a UI

| Regra | Quando | Impacto visual |
|-------|--------|----------------|
| **Limite de 5 alunos** | Botão "Adicionar aluno" é clicado após 5 alunos | Botão desabilitado + mensagem "Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula." |
| **Planos com preço** | Fluxo link ou manual chega ao passo de plano | Dropdown/cards exibem APENAS planos com `Subject.priceCents` configurado (ex.: só MONTHLY e ANNUAL se QUARTERLY/SEMIANNUAL forem null) |
| **Desconto manual only** | Fluxo link (B4) vs. fluxo manual (C3) | Fluxo link NÃO exibe campo desconto. Fluxo manual exibe segmented (% ou R$) + calculadora em tempo real. |
| **Calculadora desconto** | Fluxo manual, responsável muda desconto | Recalcula `finalPriceCents = agreedPriceCents - desconto` em tempo real na tela. |
| **selfPayer ativo** | Orientador ativa toggle `selfPayer` em C1 | Passo C2 "Dados do aluno" é ocultado. Sistema cria Student automaticamente com dados Guardian. |
| **Dupla aprovação (manual)** | Responsável clica "Confirmar matrícula" em link | Status → `PENDING_SCHOOL_APPROVAL`. Painel da escola exibe nova entrada → orientador/admin aprova → POST /customers Asaas → Status → `ACTIVE`. |
| **Contrato expandível** | Fluxo link, passo B5 | TermsVersion.body (tipo ESCOLA_RESPONSAVEL) em um <details>. Checkbox de aceite **obrigatório** para liberar botão "Enviar matrícula". |
| **Resumo consolidado** | Fluxo link, passo B4 | Mostra total de todos os Enrollments (alunos × matérias) no mês: ex. "3 alunos × 2 matérias = 6 mensalidades = R$ 1.200/mês". |
| **Email descriptografado** | Fluxo manual, botão "Enviar link ao responsável" | Envia para `Guardian.emailEnc` (descriptografar na borda, não logar). Inclui link com `confirmationToken`. |
| **Mascaramento PII em tela** | Responsável vê dados seus em B5 ou edição em link manual | CPF: `***.456.789-**`. Email: `ma***@email.com`. Phone: `(31) 9****-4321`. Nunca mostrar completo, exceto na borda Asaas. |

---

## 7. Painel de Aprovação (Orientador/Admin)

**Rota:** `/dashboard/matriculas/pendentes` (autenticada, role orientador/admin).

**O que exibe:**
- Lista de Enrollments com `status = PENDING_SCHOOL_APPROVAL`.
- Cards com: Guardian (nome + CPF mascarado), Student(s), Subject(s), plano, valor final, data de submissão.
- Destacar se dados foram editados pelo responsável (diferenciar do que orientador digitou).

**Ações:**
- Botão **"Aprovar"** → POST `/customers` no Asaas → grava `Guardian.asaasCustomerId` → `Enrollment.status = ACTIVE` → email notificando responsável.
- Botão **"Recusar"** → `Enrollment.status = CANCELLED` → email notificando responsável com motivo (optional).

**Nota:** este painel não é especificado em detalhe no protótipo `screens-c2.jsx`. Criar tela simples e direta (tabela + modal de detalhe).

---

## 8. Link de Confirmação do Responsável (Fluxo Manual)

**Rota pública:** `/m/confirmar/[token]` (gerado em C4).

**Tela (C5):**
- Resumo da matrícula: Guardian (dados), Student(s), Subject(s), plano, valor final.
  - **Campos só leitura (travados):** Subject, plano, `agreedPriceCents`, `finalPriceCents` (responsável NÃO edita negociação).
  - **Campos editáveis:** Guardian.name, Guardian.cpf, Guardian.email, Guardian.phone; Student.name, Student.birthDate (sobrescreve orientador).
- Contrato expandível (TermsVersion.body tipo ESCOLA_RESPONSAVEL).
- Checkbox de aceite **obrigatório**.
- Botão "Confirmar matrícula" → POST `/m/confirmar/[token]/submit` → salva edições, registra TermsAcceptance (IP responsável), `Enrollment.status = PENDING_SCHOOL_APPROVAL`. **NÃO chama POST /customers aqui** — isso ocorre após aprovação da escola.
- **Token expirado (72h):** exibe mensagem "Link expirado. Contate a escola para reenviar." Oferece email da escola (se disponível).

---

## 9. Referência Visual (Protótipo Existente)

- **`screens-b.jsx`** — baseline para fluxo via link (B1→B6). Manter estrutura, validar contra spec campos/regras.
- **`screens-c2.jsx`** — baseline para fluxo manual (C1→C4), especialmente seleção responsável e desconto. Manter padrão calculadora.
- **Breakpoints validados:** 375px (mobile), 768px (tablet), 1440px (desktop).
- **Marca:** azul Alfabeto `#0467DB`, tipografia Alfabeto (Google Fonts), espaçamento Alfabeto.

---

## 10. Checklist de Conciliação

**Antes de enviar pro desenvolvimento:**

- [ ] **B1 Boas-vindas:** logo, nome aluno pré-preenchido, botão "Começar".
- [ ] **B2 Seus dados:** Guardian.name, cpf mascarado, email, phone. Validação Zod.
- [ ] **B3 Dados aluno:** Student.name, birthDate, chips de matéria. Limite 5 alunos. Botão "Adicionar outro aluno" desabilitado se 5.
- [ ] **B4 Plano:** exibir apenas planos com preço. Cards com badge "Mais popular". Resumo consolidado (total alunos × matérias).
- [ ] **B5 Quase lá:** resumo, condições, contrato expandível, checkbox aceite (libera botão).
- [ ] **B6 Enviado:** confirmação visual. Enrollment criado com `status = PENDING_SCHOOL_APPROVAL`.
- [ ] **C1 Responsável:** busca Guardian existente. Cadastro novo. Toggle `selfPayer`.
- [ ] **C2 Alunos:** até 5. Botão "Adicionar aluno".
- [ ] **C3 Matérias/plano/desconto:** por aluno, chips Subject, dropdown plano (só com preço), desconto % ou R$ com calculadora.
- [ ] **C4 Revisão:** tabela resumo. Botão "Enviar link" (gera token, email) ou "Confirmar agora" (presencial).
- [ ] **C5 Link confirmação:** resumo (travado: matéria, plano, valor). Editáveis: Guardian + Student dados pessoais. Contrato. Aceite. POST confirmar.
- [ ] **Painel aprovação:** lista PENDING_SCHOOL_APPROVAL. Botões Aprovar/Recusar. Email notificação.
- [ ] **Mascara PII:** CPF `***.456.789-**`, email `ma***@email.com`, phone `(31) 9****-4321` em toda tela. Nunca plaintext.
- [ ] **Validação:** Zod em todos os inputs. Bloqueios (limite 5, planos null, desconto manual only) ativados.
- [ ] **Estado:** transições PENDING_CONFIRMATION → PENDING_SCHOOL_APPROVAL → ACTIVE funcionando.
- [ ] **Asaas:** POST /customers chamado só após aceite termos + aprovação escola. Guardian.asaasCustomerId gravado.
- [ ] **Responsivo:** 375px (mobile), 768px (tablet), 1440px (desktop) testados e ótimos.

---

## 11. Divergências Conhecidas (Rafa: revisar)

Se encontradas durante conciliação, sinalize:

| Onde | Protótipo | Spec | Decisão |
|------|-----------|------|---------|
| (a completar) | - | - | Spec vence. Ajuste protótipo. |

---

**Próximos passos:** dev segue este handoff + spec-fonte. QA valida contra checklist. Ship no Vercel. Rafa aprova antes de prod.

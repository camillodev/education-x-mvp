# Spec — Fluxo 02: Matrícula

> **Status:** rascunho (Claude, 2026-06-19)
> **Fonte de verdade:** doc Asaas POST /customers + `prisma/schema.prisma` + decisões de produto abaixo. Design (`screens-b.jsx`, `screens-c.jsx`, `screens-c2.jsx`) = referência de UX, NÃO fonte dos campos.
> **DS:** Alfabeto.

---

## 1. Objetivo

Criar uma matrícula: víncula um Guardian (responsável financeiro) a um ou mais Students (alunos), em uma ou mais Enrollments (aluno x matéria x plano x preço). Dois caminhos: **link** (responsável preenche tudo no celular e assina o contrato da escola) e **manual** (orientador preenche, responsável recebe link só para confirmar e assinar). Ao final, o Guardian existe no Asaas como customer e cada Enrollment está pronto para gerar assinatura recorrente mensal.

**DoD (Rafa):** conseguir abrir um link de matrícula no mobile, preencher os dados de Guardian + Student(s), escolher matéria(s) e plano, ler e aceitar o contrato da escola, enviar, e ter Guardian gravado no banco com `asaasCustomerId` + Student(s) + Enrollment(s) criados.

---

## 2. Dados necessários

### 2a. Piso Asaas - POST /customers

| Campo Asaas | Tipo | Obrigatorio? | Descricao |
|---|---|---|---|
| `name` | string | **Sim** | Nome do Guardian |
| `cpfCnpj` | string | **Sim** | CPF do Guardian (apenas numeros) |
| `email` | string | Nao | Email do Guardian |
| `phone` | string | Nao | Telefone fixo |
| `mobilePhone` | string | Nao | Celular (WhatsApp) |
| `address` | string | Nao | Logradouro |
| `addressNumber` | string | Nao | Numero |
| `complement` | string | Nao | Complemento |
| `province` | string | Nao | Bairro |
| `postalCode` | string | Nao | CEP |
| `externalReference` | string | Nao | **Altamente recomendado** - Guardian.id do banco |
| `notificationDisabled` | boolean | Nao | Default false |
| `additionalEmails` | string | Nao | Emails extras para notificacao |
| `municipalInscription` | string | Nao | Inscricao municipal (util para NFS-e) |
| `stateInscription` | string | Nao | Inscricao estadual |
| `observations` | string | Nao | Notas livres |
| `groupName` | string | Nao | Agrupamento logico |
| `company` | string | Nao | Razao social (nao se aplica para Guardian PF) |
| `foreignCustomer` | boolean | Nao | Default false |

**Campos obrigatorios para criar o customer Asaas:** `name` + `cpfCnpj`.
**Campos obrigatorios para cobrar (NFS-e):** `email` (recebe boleto) + `municipalInscription` (opcional, mas facilita NFS-e).
**Campo critico de vinculo:** `externalReference` = Guardian.id (permite reconciliacao sem depender do asaasCustomerId chegar via webhook).

### 2b. Negocio

| Dado | Descricao |
|---|---|
| Guardian.name | Nome do responsavel financeiro |
| Guardian.cpf | CPF (PII - criptografar) |
| Guardian.email | Email para boleto/NFS-e (PII) |
| Guardian.phone | WhatsApp (PII) |
| Guardian.selfPayer | Boolean - o aluno eh o proprio pagante (aluno adulto que paga a propria mensalidade) |
| Student.name | Nome do aluno |
| Student.birthDate | Data de nascimento (PII) |
| Student.notes | Observacoes livres (opcional) |
| Enrollment.subjectId | FK para Subject |
| Enrollment.plan | `MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL` - periodo de fidelidade do contrato |
| Enrollment.agreedPriceCents | Valor mensal acordado em centavos (pode diferir do Subject.priceCents por negociacao) |
| Enrollment.discountType | `PERCENT | FIXED | null` |
| Enrollment.discountValueBp | Desconto em basis points (so se PERCENT) |
| Enrollment.discountValueCents | Desconto em centavos (so se FIXED) |
| Enrollment.finalPriceCents | Valor mensal apos desconto (campo calculado, salvo para auditoria) |
| TermsAcceptance | Aceite do contrato ESCOLA_RESPONSAVEL com IP + timestamp |
| Enrollment.status | `PENDING_CONFIRMATION | ACTIVE | CANCELLED | SUSPENDED` |

### 2c. Fiscal / NFS-e

A NFS-e ja depende do `nfseServiceCode` em Subject (ja existe no schema). O Guardian como tomador de servico exige:
- Nome e CPF (ja coletados)
- Municipio: inferido do CEP (BrasilAPI, se coletado) ou do endereco da Unit
- `municipalInscription` nao se aplica para PF (Guardian eh pessoa fisica) - campo ignorado no payload do customer
- Cada Enrollment gera uma NFS-e por mes ao confirmar pagamento (escopo da cobranca, nao desta spec)

### 2d. Compliance / LGPD

| Campo PII | Modelo | Criptografia | Justificativa |
|---|---|---|---|
| `cpfEnc` | Guardian | AES-256-GCM | Documento de identidade - dado sensivelmente identificavel |
| `emailEnc` | Guardian | AES-256-GCM | Contato direto - PII classico |
| `phoneEnc` | Guardian | AES-256-GCM | Contato direto - PII classico |
| `birthDateEnc` | Student | AES-256-GCM | Data de nascimento de menor |
| `nameEnc` | Student | AES-256-GCM | Nome de menor de idade |

**Consentimento:** TermsAcceptance do tipo `ESCOLA_RESPONSAVEL` registrada com `ip`, `acceptedAt`, `termsVersionId`, `unitId`. No fluxo via link, o IP e o do dispositivo do responsavel. No fluxo manual, o IP e o do orientador no momento do preenchimento + link enviado ao responsavel para confirmar (gera segunda TermsAcceptance com IP do responsavel).

**Mascaramento:** CPF exibido na UI como `***.456.789-**`. Email exibido como `ma***@email.com`. Nunca descriptografar para exibir completo exceto no momento de envio ao Asaas (borda de saida).

**Retencao:** dados de Guardian e Student permanecem enquanto houver Enrollment ACTIVE. Apos cancelamento, retencao minima de 5 anos (obrigacao fiscal NFS-e).

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio? | Prisma (existe?/falta?) | Campo Asaas | No design (screens-b)? | Resolucao |
|---|---|---|---|---|---|---|
| Guardian.name | Negocio + Asaas | Sim | Guardian.name (existe) | `name` | Sim (step 0) | Formulario step 0 (link) ou step 1 (manual) |
| Guardian.cpf | Asaas + LGPD | Sim | Guardian.cpfEnc (existe, PII) | `cpfCnpj` | Sim (step 0) | Formulario - descriptografar so na borda Asaas |
| Guardian.email | Negocio + Asaas | Sim (negocio) | Guardian.emailEnc (existe, PII) | `email` | Sim (step 0) | Formulario |
| Guardian.phone | Negocio + Asaas | Sim (negocio) | Guardian.phoneEnc (existe, PII) | `mobilePhone` | Sim (step 0, WhatsApp) | Formulario |
| Guardian.selfPayer | Negocio | Nao | FALTA | - | Nao | Campo boolean no formulario manual; default false |
| Guardian.asaasCustomerId | Asaas | Sim (retorno) | Guardian.asaasCustomerId (existe, nullable) | retorno `id` | Nao (interno) | Preenchido apos POST /customers |
| externalReference | Asaas | Recomendado | Guardian.id (existe) | `externalReference` | Nao (interno) | Enviar Guardian.id no payload |
| Student.name | Negocio | Sim | FALTA (model nao existe) | - | Sim (step 1) | Novo model Student com nameEnc |
| Student.birthDate | Negocio | Sim | FALTA | - | Sim (step 1) | Novo model Student com birthDateEnc |
| Student.notes | Negocio | Nao | FALTA | - | Nao | Campo opcional no Student |
| Enrollment.subjectId | Negocio | Sim | FALTA (model nao existe) | - | Sim (step 1, chips de materia) | Novo model Enrollment |
| Enrollment.plan | Negocio | Sim | FALTA | - | Sim (step 2, card de plano) | Enum EnrollmentPlan no Enrollment |
| Enrollment.agreedPriceCents | Negocio | Sim | FALTA | - | Sim (step 2, valor exibido) | Calculado no servidor a partir do Subject + plano selecionado; pode ser sobrescrito no fluxo manual |
| Enrollment.discountType | Negocio | Nao | FALTA | - | Sim (screens-c2, calc desconto) | Campo opcional no Enrollment; so disponivel no fluxo manual |
| Enrollment.discountValueBp | Negocio | Nao | FALTA | - | Sim (screens-c2) | So se discountType = PERCENT |
| Enrollment.discountValueCents | Negocio | Nao | FALTA | - | Sim (screens-c2) | So se discountType = FIXED |
| Enrollment.finalPriceCents | Negocio + auditoria | Sim | FALTA | - | Sim (total calculado) | Campo calculado salvo no servidor |
| Enrollment.status | Negocio | Sim | FALTA | - | Nao | Enum EnrollmentStatus |
| TermsAcceptance (ESCOLA_RESPONSAVEL) | LGPD + negocio | Sim | TermsAcceptance (existe) | - | Sim (step 3, checkbox) | Registrar com ip + acceptedAt + termsVersionId |
| BillingConfig.dueDay | Negocio (exibir) | Leitura | BillingConfig.dueDay (existe) | - | Sim (step 3, "Todo dia 10") | Ler da Unit para exibir no resumo |

---

## 4. Deltas de schema

```prisma
// ─── Enums novos ──────────────────────────────────────────────────────────────

enum EnrollmentPlan {
  MONTHLY
  QUARTERLY
  SEMIANNUAL
  ANNUAL
}

enum EnrollmentStatus {
  PENDING_CONFIRMATION   // fluxo manual: orientador criou, aguardando responsavel revisar e aceitar termos
  PENDING_SCHOOL_APPROVAL // responsavel revisou/aceitou termos, aguardando aprovacao da escola
  ACTIVE                 // escola aprovou + Asaas customer criado
  CANCELLED
  SUSPENDED
}

// ─── Models novos ─────────────────────────────────────────────────────────────

model Student {
  id     String @id @default(cuid())
  unitId String

  // PII encrypted with AES-256-GCM
  nameEnc      String // nome do aluno
  birthDateEnc String // data de nascimento

  notes String? // observacoes livres (nao PII)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  enrollments Enrollment[]

  @@index([unitId])
  @@map("students")
}

model Enrollment {
  id         String @id @default(cuid())
  unitId     String
  guardianId String
  studentId  String
  subjectId  String

  plan             EnrollmentPlan
  agreedPriceCents Int // valor mensal do plano selecionado (snapshot do Subject.priceCents no momento da matricula)

  // Desconto por aluno (negociacao no fluxo manual)
  discountType       DiscountType? // reusa enum existente
  discountValueBp    Int?          // basis points, so se PERCENT
  discountValueCents Int?          // centavos, so se FIXED
  finalPriceCents    Int           // agreedPriceCents apos desconto; salvo para auditoria

  status EnrollmentStatus @default(PENDING_CONFIRMATION)

  // Link de confirmacao (fluxo manual)
  confirmationToken          String?   @unique
  confirmationTokenExpiresAt DateTime?
  confirmedAt                DateTime?

  // Asaas: preenchido quando a assinatura recorrente for criada (escopo do proximo fluxo)
  asaasSubscriptionId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit      Unit      @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian  Guardian  @relation(fields: [guardianId], references: [id])
  student   Student   @relation(fields: [studentId], references: [id])
  subject   Subject   @relation(fields: [subjectId], references: [id])

  @@index([unitId])
  @@index([guardianId])
  @@index([studentId])
  @@map("enrollments")
}

// ─── Adicionar ao Guardian (existente) ───────────────────────────────────────
// selfPayer Boolean @default(false)  // aluno paga a propria mensalidade
// enrollments Enrollment[]

// ─── Adicionar ao Subject (existente) ────────────────────────────────────────
// enrollments Enrollment[]

// ─── Adicionar ao Unit (existente) ───────────────────────────────────────────
// students  Student[]
// enrollments Enrollment[]
```

**Nota sobre selfPayer:** quando `Guardian.selfPayer = true`, o formulario esconde "Dados do aluno" e usa o proprio Guardian como Student (nome + CPF ja coletados). Enrollment.studentId aponta para um Student automaticamente criado com os dados do Guardian. Isso simplifica o caso de aluno adulto.

---

## 5. Contratos Asaas

### POST /customers - Criar Guardian como customer

**Quando:** apos aceite dos termos (fluxo link) ou apos confirmacao do responsavel (fluxo manual). Nunca antes do aceite.

**Payload (valores em reais na borda):**

```json
{
  "name": "Maria Silva",
  "cpfCnpj": "12345678900",
  "email": "maria.silva@email.com",
  "mobilePhone": "31987654321",
  "externalReference": "cld_abc123guardian",
  "notificationDisabled": false
}
```

**Campos omitidos intencionalmente:**
- `address`, `postalCode`, `province`: nao coletados no fluxo base (Guardian nao tem endereco proprio no produto - o endereco relevante eh o da Unit para NFS-e). Podem ser adicionados em iteracao futura se a Receita Federal exigir para NFS-e do tomador.
- `municipalInscription`, `stateInscription`: Guardian eh PF, nao se aplica.
- `additionalEmails`, `groupName`, `company`, `foreignCustomer`: fora do escopo.

**Conversao de borda:** `Guardian.cpfEnc` -> descriptografar AES-256-GCM em memoria -> enviar como `cpfCnpj` sem mascara -> nao logar o valor descriptografado.

**Retorno esperado:**

```json
{
  "id": "cus_000000000001",
  "name": "Maria Silva",
  "cpfCnpj": "123.456.789-00",
  ...
}
```

**Acao pos-retorno:** gravar `Guardian.asaasCustomerId = "cus_000000000001"` + setar `Enrollment.status = ACTIVE`. Este POST ocorre na aprovacao da escola (R14), nao no momento do aceite do responsavel.

**Sandbox-first:** usar `https://sandbox.asaas.com/api/v3/customers` ate o fluxo de cobranca estar validado end-to-end.

---

## 6. Regras de negocio (EARS)

**R1 - Limite de alunos por matricula:**
WHEN o responsavel tentar adicionar um 6o aluno no mesmo fluxo de matricula THEN o sistema SHALL bloquear a adicao e exibir "Maximo de 5 alunos por matricula. Para mais alunos, crie uma nova matricula."

**R2 - Plano mensal obrigatorio:**
WHEN um Subject esta configurado THEN ele SHALL ter `priceCents` preenchido (mensal obrigatorio). Os demais planos sao opcionais.

**R3 - Exibir apenas planos disponiveis:**
WHEN o responsavel chega na tela de escolha de plano THEN o sistema SHALL exibir apenas os planos com preco configurado no Subject (ex.: so mensal e anual se trimestral e semestral forem null).

**R4 - Desconto somente no fluxo manual:**
IF o caminho for link (responsavel autopreenchimento) THEN o sistema SHALL aplicar apenas o preco tabelado do Subject sem campo de desconto. IF o caminho for manual (orientador preenche) THEN o sistema SHALL exibir o campo de desconto por aluno (% ou R$).

**R5 - finalPriceCents calculado no servidor:**
WHEN um Enrollment for criado THEN o servidor SHALL calcular `finalPriceCents = agreedPriceCents - desconto` e salvar no banco. O cliente nao pode enviar `finalPriceCents` diretamente.

**R6 - Guardian ja existente:**
WHEN o orientador busca um responsavel no fluxo manual THEN o sistema SHALL verificar Guardian existente por CPF (descriptografado na borda de busca interna) e reutilizar o Guardian existente em vez de criar duplicata.

**R7 - Asaas customer idempotente:**
IF `Guardian.asaasCustomerId != null` THEN o sistema SHALL pular o POST /customers e usar o ID ja existente. Nao criar customer duplicado.

**R8 - Aceite dos termos antes do POST Asaas:**
WHEN o responsavel envia a matricula THEN o sistema SHALL registrar TermsAcceptance (ESCOLA_RESPONSAVEL) antes de chamar POST /customers. Se o POST falhar, a TermsAcceptance permanece registrada (o responsavel ja aceitou; pode tentar novamente sem re-aceite).

**R9 - Token de confirmacao (fluxo manual):**
WHEN o orientador finaliza o preenchimento manual THEN o sistema SHALL gerar `Enrollment.confirmationToken` (UUID v4), enviar link para `Guardian.emailEnc` descriptografado, e manter `Enrollment.status = PENDING_CONFIRMATION`. O token expira em 72 horas.

WHEN o responsavel acessa o link de confirmacao THEN o sistema SHALL validar o token (nao expirado, nao usado), exibir resumo da matricula com campos de dados pessoais editaveis (Guardian: nome/CPF/email/telefone; Student: nome/data de nascimento), coletar aceite dos termos, registrar TermsAcceptance com IP do responsavel, e setar `Enrollment.status = PENDING_SCHOOL_APPROVAL`. O POST /customers no Asaas ocorre somente apos aprovacao da escola (R13).

**R13 - Edicao de dados pessoais pelo responsavel:**
WHEN o responsavel acessa o link de confirmacao e edita dados pessoais THEN o sistema SHALL sobrescrever os valores digitados pelo orientador com os valores informados pelo responsavel nos seguintes campos: Guardian.name, Guardian.cpfEnc, Guardian.emailEnc, Guardian.phoneEnc, Student.nameEnc, Student.birthDateEnc. Os campos de materia, plano e valor (subjectId, plan, agreedPriceCents, discountType, discountValueBp, discountValueCents, finalPriceCents) NAO sao editaveis pelo responsavel e devem ser exibidos como somente-leitura.

**R14 - Aprovacao final da escola:**
WHEN `Enrollment.status = PENDING_SCHOOL_APPROVAL` THEN somente um usuario com role orientador ou admin da unidade SHALL poder aprovar a matricula no painel. WHEN a escola aprova THEN o sistema SHALL chamar POST /customers no Asaas (ou reutilizar asaasCustomerId se Guardian ja existe), gravar asaasCustomerId, e setar `Enrollment.status = ACTIVE`. Este fluxo aplica-se tanto ao caminho via link quanto ao caminho manual.

**R10 - selfPayer:**
WHEN `Guardian.selfPayer = true` THEN o sistema SHALL criar automaticamente um Student com os mesmos dados do Guardian (nameEnc = Guardian.nameEnc, birthDateEnc = null ou data declarada). O formulario de "Dados do aluno" e ocultado.

**R11 - Multi-aluno com mesmas materias:**
WHEN a matricula tem mais de 1 aluno THEN o sistema SHALL criar Enrollments individuais por aluno x materia. A selecao de materias e por aluno, nao compartilhada.

**R12 - Valor em centavos:**
WHEN qualquer Enrollment for criado THEN `agreedPriceCents` e `finalPriceCents` SHALL ser inteiros positivos em centavos. A conversao para reais ocorre apenas na borda de exibicao (UI) e na borda Asaas.

---

## 7. Estados e transicoes

```
[inicio]
    |
    v
PENDING_CONFIRMATION        <-- fluxo manual: orientador criou, aguarda responsavel abrir link
    |
    | responsavel abre link, edita dados pessoais (sobrescreve orientador), aceita termos
    v
PENDING_SCHOOL_APPROVAL     <-- responsavel aceitou; escola precisa aprovar
    |
    | orientador/escola aprova no painel
    | POST /customers no Asaas executado aqui (apos aprovacao da escola)
    v
ACTIVE  <-- fluxo link (via link publico): responsavel preenche tudo direto ->
            apos submit, entra tambem em PENDING_SCHOOL_APPROVAL -> escola aprova -> ACTIVE
    |
    |-- cancelamento pelo orientador ou responsavel
    v
CANCELLED
    |
    |-- (irreversivel no MVP)

ACTIVE --suspender--> SUSPENDED (ex.: inadimplencia - escopo do fluxo de cobranca)
SUSPENDED --reativar--> ACTIVE
```

**Nota de dupla aprovacao (fluxo manual):** o responsavel edita apenas dados pessoais (Guardian: nome, CPF, email, telefone; Student: nome, data de nascimento) e aceita os termos. Apos aceite, o status move para PENDING_SCHOOL_APPROVAL. A escola revisa no painel e aprova: so entao o POST /customers e chamado e o status vai para ACTIVE. A edicao do responsavel sobrescreve o que o orientador digitou nos dados pessoais.

---

## 8. Fluxo de coleta (UX)

### 8a. Fluxo via link (responsavel, mobile)

Referencia: `screens-b.jsx`. 4 passos + tela de boas-vindas + tela de confirmacao.

- **B1 - Boas-vindas:** logo da unidade, nome do aluno pre-preenchido (vem do link), CTA "Comecar". O link carrega `unitId` + `prefilledStudentName` (opcional, orientador pode ter preenchido o nome do aluno antes de enviar).
- **B2 - Seus dados (Passo 1):** Guardian.name, Guardian.cpf, Guardian.email, Guardian.phone(WhatsApp). Mascara de CPF inline. Hint "Onde voce recebe boletos".
- **B3 - Dados do aluno (Passo 2):** Student.name, Student.birthDate, chips de materia (Subject.name, cor por materia). Limite: 5 alunos - botao "Adicionar outro aluno" aparece se < 5.
- **B4 - Escolha o plano (Passo 3):** cards de plano (apenas planos com preco configurado). Valor sempre "por mes". Badge "Mais popular" ou "Melhor custo-beneficio" configuravel pela escola. Caixa de resumo mostra total consolidado de todas as Enrollments do fluxo.
- **B5 - Quase la (Passo 4):** resumo (aluno(s), materias, plano, vencimento do BillingConfig.dueDay), condicoes (multa/juros/cancelamento), expandir contrato da escola (TermsVersion.body do tipo ESCOLA_RESPONSAVEL), checkbox de aceite. Botao "Enviar matricula" bloqueado ate aceite.
- **B6 - Enviado:** confirmacao visual, instrucao de aguardar aprovacao da escola. Enrollment.status = PENDING_SCHOOL_APPROVAL. A escola recebe notificacao e aprova no painel — so entao a matricula fica ACTIVE.

### 8b. Fluxo manual (orientador, desktop)

Referencia: `screens-c2.jsx` (C5Nova como referencia para selecao de responsavel + desconto).

- **Passo 1 - Responsavel:** busca por nome ou CPF (Guardian existente) OU cadastro novo. Campo `selfPayer` toggle.
- **Passo 2 - Aluno(s):** nome, data de nascimento, ate 5 alunos. Botao "Adicionar aluno".
- **Passo 3 - Materias e plano:** por aluno, selecao de materia(s) + plano + desconto opcional (% ou R$, tipo segmented como em screens-c2). Calculadora de desconto exibe valor final por mes.
- **Passo 4 - Revisao:** tabela resumo. Botao "Enviar link ao responsavel" (gera confirmationToken + email) OU "Confirmar agora" se o responsavel estiver presencialmente (orientador marca aceite em nome do responsavel - registrar IP do orientador + nota "confirmado presencialmente").

---

## 9. Definition of Done (binario)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration aplicada
pnpm prisma migrate deploy

# 3. E2E Playwright - fluxo link (responsavel mobile)
pnpm dlx playwright test matricula-link --reporter=line
# Prova: Guardian criado com asaasCustomerId, 1 Student, 1 Enrollment ACTIVE, TermsAcceptance registrada

# 4. E2E Playwright - fluxo manual (orientador)
pnpm dlx playwright test matricula-manual --reporter=line
# Prova: Enrollment criado com status PENDING_CONFIRMATION + confirmationToken, 
#        apos acesso ao link o status muda para ACTIVE

# 5. Regra de negocio critica - sem POST Asaas antes do aceite
pnpm dlx playwright test matricula-no-asaas-before-terms --reporter=line
# Prova: interceptar rede e confirmar que POST /customers nao e chamado antes do checkbox de aceite

# 6. Idempotencia - Guardian ja existente nao cria customer duplicado no Asaas
pnpm dlx playwright test matricula-guardian-existente --reporter=line
# Prova: Guardian com asaasCustomerId preexistente - POST /customers nao e chamado novamente

# 7. PII nunca plaintext no banco
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.guardian.findFirst().then(g => {
  if (!g) process.exit(0);
  // cpfEnc deve ter formato iv:authTag:ciphertext (nao ser CPF plaintext)
  if (/^\d{11}$/.test(g.cpfEnc)) { console.error('PII PLAINTEXT DETECTED'); process.exit(1); }
  console.log('PII check OK');
  process.exit(0);
});
"
```

---

## 10. Decisoes fechadas

1. **Unidade de cobranca = Enrollment (aluno x materia).** Um Guardian com 2 alunos em 2 materias cada = 4 Enrollments = 4 assinaturas mensais no Asaas.
2. **Plano = periodo de fidelidade do contrato.** Valor exibido sempre e o valor mensal. Cobranca sempre mensal. Nao ha parcelamento.
3. **Desconto somente no fluxo manual.** O responsavel no fluxo de link nao ve nem pode negociar desconto.
4. **POST /customers somente apos TermsAcceptance.** Nunca antes.
5. **selfPayer:** Guardian pode ser o proprio pagante (aluno adulto). Simplifica o formulario ocultando "Dados do aluno".
6. **Limite de 5 alunos por matricula** (nao por Guardian). Um Guardian pode ter multiplas matriculas.
7. **Guardian existente e reutilizado** (busca por CPF no fluxo manual). Nao criar duplicata Asaas.
8. **Enrollment.agreedPriceCents = snapshot** do preco no momento da matricula. Mudanca de preco no Subject nao afeta Enrollments existentes.
9. **Token de confirmacao expira em 72 horas.** Apos expirar, orientador precisa reenviar link.
10. **Fluxo de link nao exige login do responsavel.** Autenticacao via token no URL (similar ao confirmationToken do onboarding de escola).

---

## 11. Pendencias

| # | Pendencia | Impacto | Resolucao sugerida |
|---|---|---|---|
| P1 | ~~Aprovacao manual pela escola?~~ **DECIDIDO (2026-06-19):** a matricula NUNCA vira ACTIVE automaticamente. Apos o responsavel aceitar os termos (fluxo link ou fluxo manual), o status vai para PENDING_SCHOOL_APPROVAL. A escola aprova no painel → ACTIVE. Dupla aprovacao no fluxo manual (orientador cadastra → responsavel aceita → escola aprova). Ver secao 7 e R14. | Resolvido | — |
| P2 | Multi-materia com planos diferentes? Ex.: aluno A com matematica no plano anual e portugues no plano mensal | Afeta UX (plano por aluno x por materia) | Decisao de produto. Recomendacao MVP: 1 plano por aluno (aplica a todas as materias do aluno). Simplifica UX e logica de assinatura |
| P3 | Contrato da escola (TermsVersion.body tipo ESCOLA_RESPONSAVEL) - quem cadastra e onde? | Bloqueante para o aceite no passo B5 | Escopo do onboarding: orientador cadastra o texto do contrato no painel (proximo fluxo ou extensao do fluxo 01) |
| P4 | Cor dos chips de materia (B3) - configuravel pela escola ou fixo? | UX menor | Recomendacao: campo `color` opcional no Subject; default por indice |
| P5 | Limite de 5 alunos por matricula - e por Guardian no total? | Regra de negocio | Pendente decisao: Guardian pode ter ilimitados Students ao longo do tempo, mas no fluxo de uma unica matricula o limite e 5 |
| P6 | "Confirmar agora" no fluxo manual presencial - compliance LGPD | LGPD | Orientador assinar em nome do responsavel exige nota no registro ("confirmado presencialmente"). Validar com advogado se e suficiente ou se precisa de assinatura digital |

---

## 12. Fatiamento em Task Contracts

### Fatia 1 - Migration + models Student e Enrollment

**Objetivo:** criar os novos models no schema Prisma e gerar a migration.

**Scope in:**
- Novos models: `Student`, `Enrollment`
- Novos enums: `EnrollmentPlan`, `EnrollmentStatus`
- Adicionar relacoes em `Guardian`, `Subject`, `Unit`
- Adicionar campo `selfPayer Boolean @default(false)` em Guardian

**Nao incluido:**
- Nenhuma logica de aplicacao
- Nenhuma rota ou componente

**DoD:**
```bash
pnpm prisma migrate dev --name add-student-enrollment
pnpm typecheck
# exit 0
```

---

### Fatia 2 - API routes: criar matricula (fluxo link)

**Objetivo:** endpoints para o responsavel criar Guardian + Students + Enrollments via link publico (sem autenticacao Clerk).

**Scope in:**
- `POST /api/enrollment/link/[token]/submit` - recebe dados do Guardian + Students + plano + aceite dos termos; valida token da unidade; cria Guardian (ou reutiliza por CPF); registra TermsAcceptance; cria Students e Enrollments; chama POST /customers no Asaas Sandbox; grava asaasCustomerId; retorna `{ success: true }`
- `GET /api/enrollment/link/[token]` - retorna dados publicos da unidade para pre-preencher a tela de boas-vindas (Unit.name, BillingConfig.dueDay, Subjects ativos com precos)
- Validacao Zod de todos os inputs
- Criptografia PII (cpf, email, phone, nome e data de nascimento do Student)
- Calculo de finalPriceCents no servidor

**Nao incluido:**
- UI (proxima fatia)
- Fluxo manual
- POST /subscriptions no Asaas (proximo fluxo)

**DoD:**
```bash
pnpm test:run -- enrollment-link
pnpm dlx playwright test matricula-link-api --reporter=line
# exit 0 = Guardian criado, asaasCustomerId gravado, Enrollment ACTIVE
```

---

### Fatia 3 - UI mobile: fluxo via link (responsavel)

**Objetivo:** telas B1 a B6 (screens-b.jsx como referencia de UX) consumindo as rotas da Fatia 2.

**Scope in:**
- Rota publica `/m/[token]` - Next.js, sem layout autenticado
- 4 passos com MProgress + validacao de form de alta qualidade (mesmo padrao da spec 01)
- Mascaramento de CPF inline
- Chips de materia a partir dos Subjects ativos da unidade
- Cards de plano com apenas planos configurados
- Resumo + contrato expandivel (TermsVersion.body) + checkbox de aceite
- Tela de confirmacao (B6) com instrucao de proximo passo
- Responsivo 375px (mobile-first)

**Nao incluido:**
- Fluxo manual
- Logica de desconto (manual only)

**DoD:**
```bash
pnpm dlx playwright test matricula-link-ui --reporter=line
# exit 0 = fluxo completo no viewport 375px, Guardian + Enrollment criados
```

---

### Fatia 4 - UI desktop: fluxo manual (orientador)

**Objetivo:** tela de matricula manual no painel autenticado (orientador preenche, responsavel recebe link para confirmar).

**Scope in:**
- Rota autenticada `/dashboard/matriculas/nova`
- Busca de Guardian existente por nome ou CPF (busca interna, nao chama Asaas)
- Formulario de cadastro de Guardian novo (com campo selfPayer)
- Adicionar ate 5 Students com nome + data de nascimento
- Selecao de materia por aluno + plano + desconto (% ou R$) com calculadora em tempo real
- Revisao com tabela resumo
- Botao "Enviar link ao responsavel" (gera confirmationToken + envia email)
- Tratamento de Guardian existente (reutilizar vs criar novo)

**Nao incluido:**
- "Confirmar agora" presencialmente (ver P6 nas pendencias)
- Criacao de Asaas customer (isso e feito quando o responsavel confirma via link)

**DoD:**
```bash
pnpm dlx playwright test matricula-manual-ui --reporter=line
# exit 0 = Enrollment PENDING_CONFIRMATION criado, token gerado, email enviado (mock)
```

---

### Fatia 5 - Link de confirmacao do responsavel (fluxo manual)

**Objetivo:** tela que o responsavel abre ao clicar no link recebido por email, aceita os termos e confirma a matricula.

**Scope in:**
- Rota publica `/m/confirmar/[token]`
- Exibe resumo da Enrollment (Student + Subject + plano + valor) — materia, plano e valor somente-leitura (travados)
- Campos editaveis pelo responsavel: Guardian.name, Guardian.cpf, Guardian.email, Guardian.phone; Student.name, Student.birthDate (sobrescreve o que o orientador digitou)
- Exibe termos da escola (TermsVersion.body)
- Checkbox de aceite + botao "Confirmar matricula"
- POST de confirmacao: valida token, salva edicoes de dados pessoais, registra TermsAcceptance (IP do responsavel), seta Enrollment.status = PENDING_SCHOOL_APPROVAL. **Nao chama POST /customers Asaas aqui** — isso ocorre apos aprovacao da escola (R14)
- Tratamento de token expirado (exibe mensagem de contato com a escola)

**Nao incluido:**
- Aprovacao da escola (escopo da Fatia 6)
- Edicao de materia, plano ou valores (travados para o responsavel)

**DoD:**
```bash
pnpm dlx playwright test matricula-confirmacao-link --reporter=line
# exit 0 = Enrollment PENDING_SCHOOL_APPROVAL, edicoes de dados pessoais salvas, TermsAcceptance registrada com IP do responsavel
pnpm dlx playwright test matricula-token-expirado --reporter=line
# exit 0 = tela de token expirado exibida corretamente
```

---

### Fatia 6 - Aprovacao da escola (painel orientador)

**Objetivo:** tela no painel autenticado para a escola revisar e aprovar matriculas em PENDING_SCHOOL_APPROVAL.

**Scope in:**
- Rota autenticada `/dashboard/matriculas/pendentes`
- Lista de Enrollments com status PENDING_SCHOOL_APPROVAL
- Tela de detalhe: dados do Guardian (com edicoes do responsavel destacadas), Student(s), Subject(s), plano, valor
- Botao "Aprovar" → POST /customers Asaas → grava asaasCustomerId → Enrollment.status = ACTIVE
- Botao "Recusar" → Enrollment.status = CANCELLED + notificacao ao responsavel
- Notificacao ao responsavel via email apos aprovacao ou recusa

**Nao incluido:**
- Edicao dos dados pelo orientador apos confirmacao do responsavel (fora do MVP)

**DoD:**
```bash
pnpm dlx playwright test matricula-aprovacao-escola --reporter=line
# exit 0 = Enrollment ACTIVE, asaasCustomerId gravado apos aprovacao, email de confirmacao enviado (mock)
pnpm dlx playwright test matricula-recusa-escola --reporter=line
# exit 0 = Enrollment CANCELLED, email de recusa enviado (mock)
```

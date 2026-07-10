# Handoff de Design — Fluxo 02 Matrícula: Campos, Validação e Regras de Negócio

> **Status:** pronto para design · **Spec-fonte:** [`mvp-02-matricula.md`](../mvp-02-matricula.md) — fonte de verdade absoluta. Se este doc divergir da spec, a spec vence.
> **DS:** Alfabeto (já existe, não redesenhar). Este doc **não é visual** — não descreve layout, cor, espaçamento. Descreve o que cada tela precisa coletar, validar e reagir.
> **Diferença deste doc vs. `mvp-02-matricula.md` (handoff antigo, mesma pasta):** aquele documenta o *fluxo de telas* (o quê existe, em que ordem). Este documenta *campo por campo* — tipo, obrigatoriedade, máscara, validação client vs. server, mensagens de erro, estados. Use os dois juntos: o antigo para orientação de fluxo, este para preencher cada formulário sem perguntar nada de volta.
> **Cobertura:** 6 telas do fluxo link (B1–B6) + 4 passos do fluxo manual + tela de confirmação do responsável (C5/Fatia 7) + painel de aprovação da escola (Fatia 8) + settings de contrato (Fatia 6).

---

## Convenções usadas neste documento

- **Validação client-side** = checagem de formato, executada no browser, pode ser burlada. Serve para dar feedback imediato, nunca é a barreira real.
- **Validação de negócio (server-side)** = regra que só o servidor pode garantir (unicidade, cálculo, idempotência, timing de chamadas externas). Mesmo que o client valide, o servidor **sempre** revalida — é a barreira real.
- **Máscara de input** ≠ **máscara de exibição de PII**. Máscara de input é formatação enquanto digita (`000.000.000-00`). Máscara de PII é ofuscação de dado já salvo, exibido depois (`***.456.789-**`). São mecanismos diferentes — cada tela abaixo diz qual usa.
- Todo campo de dinheiro é **digitado em reais** (`R$ 150,00`) e **convertido para centavos só no payload** enviado ao servidor. Nunca exibir centavos crus na UI.
- Todo campo de data é **digitado em DD/MM/AAAA** e convertido para ISO no payload.

---

## Tela: B1 — Boas-vindas (fluxo link)

**Rota:** `/m/[token]` (estado inicial) · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

Nenhum campo de input nesta tela — é uma tela de intro.

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Nome do aluno (exibição) | texto, somente leitura | Não | — | — | — |

O nome do aluno vem pré-preenchido via query param `prefilledStudentName` (o orientador pode ter digitado antes de enviar o link). Se ausente, a tela não exibe o campo — não mostrar placeholder vazio "Nome do aluno: —".

### Estados da tela

- **Loading:** ao carregar `GET /api/enrollment/link/[token]`, mostrar skeleton do logo + nome da unidade enquanto busca `Unit.name`, `BillingConfig.dueDay`, Subjects ativos.
- **Erro:** token inválido ou unidade não encontrada → tela cheia "Link inválido ou expirado. Fale com a secretaria da escola." Sem botão de retry (link é de uso único por sessão de matrícula, não expira por tempo nesta etapa — quem expira em 72h é o `confirmationToken` do fluxo manual, não este).
- **Sucesso:** logo da unidade carregado, botão "Começar" habilitado.

### Regras de negócio visíveis na tela

- O link carrega `unitId` obrigatoriamente — sem ele, a tela não resolve e cai no estado de erro.
- Esta tela nunca faz nenhuma escrita no banco — é 100% leitura.

### Copy sugerido (mensagens-chave)

- CTA: **"Começar matrícula"**
- Erro de link: **"Esse link não é válido ou já expirou. Fale com a secretaria da [Nome da Unidade] para receber um novo."**

---

## Tela: B2 — Seus dados (Passo 1 de 4, fluxo link)

**Rota:** `/m/[token]/dados` · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Nome completo (`Guardian.name`) | texto | **Sim** | — | mín. 3 caracteres, deve conter espaço (nome + sobrenome) | "Digite seu nome completo" |
| CPF (`Guardian.cpf`) | texto numérico | **Sim** | `000.000.000-00` | 11 dígitos + algoritmo de dígito verificador (módulo 11, 2 dígitos) | "CPF inválido" |
| E-mail (`Guardian.email`) | texto (email) | **Sim** | — | regex padrão de email (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) | "Digite um e-mail válido" |
| Celular/WhatsApp (`Guardian.phone`) | texto numérico | **Sim** | `(00) 00000-0000` | 11 dígitos (DDD + 9 dígitos, celular BR) | "Digite um celular válido com DDD" |
| Tipo de responsável (`Guardian.type`) | select (3 opções fixas) | **Sim** | — | um dos valores: `FATHER` \| `MOTHER` \| `LEGAL_GUARDIAN` | "Selecione o tipo de responsável" |

Labels sugeridos para `Guardian.type`: "Mãe" / "Pai" / "Responsável legal".

**Sem opção de Consulta Serasa nesta tela** — R18: o botão "Consultar Serasa" existe **apenas** no fluxo manual. O responsável nunca consulta o próprio score.

### Estados da tela

- **Loading:** ao submeter, botão "Continuar" mostra spinner e desabilita; sem debounce de validação de CPF em tempo real além do formato (dígito verificador roda no blur do campo, não em cada tecla).
- **Erro:** cada campo exibe erro inline abaixo dele no primeiro submit falho; campos com erro ganham borda vermelha. Erro de duplicidade de CPF **não existe** nesta tela — B2 sempre cria/atualiza o Guardian associado ao fluxo, a verificação de duplicata (R6) é lógica do fluxo manual (busca ativa por orientador), não deste form.
- **Sucesso:** avança para B3 (Dados do aluno). Progresso "Passo 1 de 4".

### Regras de negócio visíveis na tela

- Todos os 5 campos são obrigatórios — botão "Continuar" fica desabilitado até os 5 estarem preenchidos e válidos.
- CPF, email e phone são armazenados criptografados (AES-256-GCM) no servidor — irrelevante para a UI, mas explica por que não há autocomplete de "CPF já usado" nesta tela (o servidor não pode buscar por CPF em texto plano sem descriptografar todos os registros; a UI não deve prometer esse comportamento).
- Hint sob o campo de e-mail: "É onde você vai receber os boletos."

### Copy sugerido (mensagens-chave)

- Título do passo: **"Seus dados"**
- Hint e-mail: **"É onde você vai receber os boletos."**
- Hint celular: **"Usamos para avisos importantes por WhatsApp."**
- Erro CPF: **"CPF inválido. Confira os números."**
- Erro nome: **"Digite seu nome completo."**
- Erro e-mail: **"Digite um e-mail válido."**
- Erro celular: **"Digite um celular válido, com DDD."**

---

## Tela: B3 — Dados do aluno (Passo 2 de 4, fluxo link)

**Rota:** `/m/[token]/aluno` · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Nome do aluno (`Student.name`) | texto | **Sim** | — | mín. 2 caracteres | "Digite o nome do aluno" |
| Data de nascimento (`Student.birthDate`) | data | **Sim** | `DD/MM/AAAA` | data válida, não futura, idade plausível (0–99 anos) | "Data de nascimento inválida" |
| Matéria(s) (`Enrollment.subjectId`, via chips) | chips, multi-seleção | **Sim** (mín. 1) | — | ao menos 1 chip selecionado por aluno | "Selecione ao menos uma matéria" |
| Botão "Adicionar outro aluno" | ação, não campo | — | — | — | — |

Repita o bloco (nome + nascimento + chips de matéria) para cada aluno adicionado.

### Limites

- **Máximo 5 alunos por matrícula** (R1, R20 — limite é por fluxo, não por Guardian). Ao tentar adicionar o 6º aluno: bloquear e exibir mensagem — ver copy abaixo. Botão "Adicionar outro aluno" **desaparece ou desabilita** ao atingir 5 alunos preenchidos.
- Nenhum limite de matérias por aluno (pode selecionar todas as disponíveis).

### Estados da tela

- **Loading:** chips de matéria vêm de `Subject` ativos da unidade, carregados junto com B1 — se a lista demorar, mostrar skeleton de chips.
- **Erro:** validação por bloco de aluno — se o aluno 2 tem erro, não impede revisar o aluno 1; cada bloco de aluno tem seu próprio conjunto de mensagens de erro.
- **Sucesso:** avança para B4 (Escolha o plano). Progresso "Passo 2 de 4".

### Regras de negócio visíveis na tela

- Se `Guardian.selfPayer = true` (não aplicável no fluxo link — este toggle só existe no fluxo manual, R10/R18-adjacente) — **nesta tela do fluxo link, sempre exibir o formulário de aluno**, pois o fluxo link não tem o toggle `selfPayer`. (Nota para o designer: `selfPayer` é exclusivo do fluxo manual — não desenhar essa lógica condicional em B3.)
- Cor do chip de matéria é atribuída por índice (posição na lista), não configurável — não desenhar seletor de cor.
- Cada aluno pode ter matérias diferentes — a seleção de matéria é por aluno, nunca compartilhada entre alunos (R11).

### Copy sugerido (mensagens-chave)

- Título do passo: **"Dados do aluno"** (ou "Dados dos alunos" se já houver mais de 1)
- Botão: **"Adicionar outro aluno"**
- Bloqueio de limite: **"Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula."**
- Erro nome aluno: **"Digite o nome do aluno."**
- Erro data nascimento: **"Verifique a data de nascimento."**
- Erro matéria: **"Selecione ao menos uma matéria para [nome do aluno]."**

---

## Tela: B4 — Escolha o plano (Passo 3 de 4, fluxo link)

**Rota:** `/m/[token]/plano` · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Plano (`Enrollment.plan`) | cards de seleção única | **Sim** | valor sempre exibido "por mês" | um dos planos disponíveis no Subject | "Escolha um plano para continuar" |

### Estados da tela

- **Loading:** cálculo do resumo consolidado (soma de todas as Enrollments) acontece client-side a partir dos preços já carregados — não deve ter loading próprio, é instantâneo.
- **Erro:** botão "Continuar" desabilitado até um plano ser selecionado.
- **Sucesso:** avança para B5 (Quase lá). Progresso "Passo 3 de 4".

### Regras de negócio visíveis na tela

- **R3 — só planos com preço configurado aparecem.** Se `Subject.quarterlyPriceCents` é `null`, o card "Trimestral" simplesmente não existe na tela — não aparece desabilitado, não existe.
- **R19 — 1 plano por aluno para todas as matérias.** Se o aluno tem 2 matérias, ambas usam o mesmo plano selecionado aqui. Não há seleção de plano por matéria.
- Valor exibido em cada card é sempre "R$ X/mês" — mesmo em planos ANNUAL/SEMIANNUAL/QUARTERLY, o valor mostrado é o **valor mensal equivalente**, nunca o total do período (decisão #2 da spec: "Plano = período de fidelidade do contrato. Valor exibido sempre é o valor mensal.").
- Badge "Mais popular" ou "Melhor custo-benefício" é configurável pela escola (fora do escopo desta spec — campo de configuração futuro); se não configurado, nenhum badge aparece.
- **Sem campo de desconto nesta tela** (R4 — desconto é exclusivo do fluxo manual).
- Caixa de resumo mostra o total consolidado: todas as Enrollments (todos os alunos × todas as matérias) somadas no valor mensal do plano escolhido.

### Copy sugerido (mensagens-chave)

- Título do passo: **"Escolha o plano"**
- Rótulo de valor: **"R$ [valor] /mês"**
- Resumo: **"[N] aluno(s) × [M] matéria(s) = R$ [total] /mês"**
- Erro: **"Escolha um plano para continuar."**

---

## Tela: B5 — Quase lá (Passo 4 de 4, fluxo link)

**Rota:** `/m/[token]/revisao` · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Resumo (aluno(s), matéria(s), plano, vencimento) | texto, somente leitura | — | — | — | — |
| Contrato da escola (`TermsVersion.body`, tipo `ESCOLA_RESPONSAVEL`) | texto expansível (accordion) | — | — | — | — |
| Checkbox de aceite dos termos | checkbox | **Sim** | — | deve estar marcado | botão "Enviar matrícula" permanece desabilitado (não há mensagem de erro — é bloqueio, não erro de validação) |

### Estados da tela

- **Loading:** ao clicar "Enviar matrícula", botão mostra spinner, desabilita, e a tela impede duplo submit.
- **Erro:** se o `POST /api/enrollment/link/[token]/submit` falhar (rede, servidor), exibir toast/banner "Não foi possível enviar sua matrícula. Tente novamente." e reabilitar o botão. O checkbox de aceite permanece marcado (não perder o estado do usuário).
- **Sucesso:** navega para B6 (Enviado).

### Regras de negócio visíveis na tela

- **Botão "Enviar matrícula" fica desabilitado até o checkbox de aceite ser marcado** — regra visível e obrigatória (R8).
- O texto do contrato vem de `TermsVersion.body` cadastrado pela escola no painel (Fatia 6) — se a escola não cadastrou nenhum, o texto pode vir vazio; nesse caso, tratar como pendência operacional da escola, não bloquear a tela (mostrar aviso genérico "Contrato em preparação" só se `body` vier vazio/nulo — comportamento de fallback, confirmar com dev antes de assumir).
- Resumo mostra o vencimento lido de `BillingConfig.dueDay` da unidade — ex.: "Todo dia 10".
- **A submissão desta tela dispara `TermsAcceptance` (tipo `ESCOLA_RESPONSAVEL`) no servidor, mas isso é interno — não é um campo visível.** O que a UI precisa saber: a chamada ao Asaas (`POST /customers`) **não acontece aqui**. Ela só ocorre depois que a escola aprovar (R14) — o responsável nunca vê "criando sua conta de pagamento" nesta tela, só vê confirmação de envio.

### Copy sugerido (mensagens-chave)

- Título do passo: **"Quase lá"**
- Checkbox: **"Li e aceito o contrato de matrícula da [Nome da Unidade]"**
- Botão: **"Enviar matrícula"**
- Erro de envio: **"Não foi possível enviar sua matrícula agora. Tente novamente em instantes."**

---

## Tela: B6 — Enviado (fluxo link)

**Rota:** `/m/[token]/confirmado` · **Quem acessa:** responsável financeiro (mobile) · **Fluxo:** link

### Campos

Nenhum campo — tela de confirmação, somente leitura.

### Estados da tela

- **Sucesso (único estado possível):** ícone de confirmação, mensagem de sucesso, instrução de próximo passo.

### Regras de negócio visíveis na tela

- `Enrollment.status` está agora em `PENDING_SCHOOL_APPROVAL` — a UI comunica isso como "aguardando aprovação da escola", nunca como "matrícula ativa" ou "pronto".
- Não há ação nesta tela — é uma tela terminal do fluxo link.

### Copy sugerido (mensagens-chave)

- **"Matrícula enviada! A [Nome da Unidade] vai revisar e confirmar em breve. Você recebe um aviso assim que for aprovada."**

---

## Tela: Manual Passo 1 — Responsável (+ Consulta Serasa)

**Rota:** `/dashboard/matriculas/nova` (passo 1) · **Quem acessa:** orientador (desktop, autenticado) · **Fluxo:** manual

### Campos — busca / cadastro do responsável

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Buscar responsável (nome ou CPF) | texto (busca) | Não (ação opcional) | CPF formata como `000.000.000-00` se detectado padrão numérico | busca interna por nome ou CPF descriptografado na borda | "Nenhum responsável encontrado" (não é erro de campo, é estado vazio da busca) |
| Nome completo (`Guardian.name`) | texto | **Sim** (se cadastro novo) | — | mín. 3 caracteres, com espaço | "Digite o nome completo" |
| CPF (`Guardian.cpf`) | texto numérico | **Sim** (se cadastro novo) | `000.000.000-00` | 11 dígitos + dígito verificador | "CPF inválido" |
| E-mail (`Guardian.email`) | texto (email) | **Sim** (se cadastro novo) | — | regex de email | "Digite um e-mail válido" |
| Celular/WhatsApp (`Guardian.phone`) | texto numérico | **Sim** (se cadastro novo) | `(00) 00000-0000` | 11 dígitos | "Digite um celular válido com DDD" |
| Tipo de responsável (`Guardian.type`) | select (3 opções) | **Sim** | — | `FATHER` \| `MOTHER` \| `LEGAL_GUARDIAN` | "Selecione o tipo de responsável" |
| Aluno paga a própria mensalidade (`Guardian.selfPayer`) | toggle | Não (default `false`) | — | booleano | — |

### Campos — Consulta Serasa (card dentro deste mesmo passo)

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Checkbox de consentimento LGPD (consulta Serasa) | checkbox | **Sim, para habilitar a consulta** (a matrícula em si não exige isso) | — | deve estar marcado antes do clique em "Consultar Serasa" | botão permanece desabilitado, sem mensagem de erro (é bloqueio, R16) |
| Botão "Consultar Serasa" | ação | — | — | desabilitado até checkbox marcado | — |
| Resultado: score + badge | texto + badge, somente leitura | — | número inteiro + cor (verde/amarelo/vermelho) | — | — |

### Estados da tela

- **Loading (busca de responsável):** spinner curto inline no campo de busca.
- **Loading (Consulta Serasa):** ao clicar "Consultar Serasa" (já habilitado), botão mostra spinner. **SLA declarado: resposta em até 5 segundos.** Se passar de 5s sem resposta, tratar como timeout (mesmo tratamento do erro abaixo).
- **Erro (Consulta Serasa indisponível):** se a chamada a `POST /creditBureau/serasa` falhar ou der timeout, exibir banner "Consulta indisponível — continue manualmente" **e não bloquear o restante do formulário nem o avanço para o Passo 2** (R15). Não gravar nenhum score.
- **Sucesso (Consulta Serasa):** badge exibido:
  - **Verde** (`success`): score ≥ 700
  - **Amarelo** (`warning`): score entre 400 e 699
  - **Vermelho** (`danger`): score < 400 **ou** `negativado = true`
- **Guardian já consultado antes:** se `Guardian.serasaCheckedAt` já existe (Guardian reaproveitado via busca), a tela exibe o score/badge **já salvo diretamente**, sem chamar a API de novo (R17). O botão "Consultar Serasa" some ou vira "Consultado em [data]" — não oferecer reconsulta nesta versão (fora do escopo do MVP).

### Regras de negócio visíveis na tela

- **R16 — botão "Consultar Serasa" nasce desabilitado.** Só habilita depois que o checkbox de consentimento é marcado **e** o sistema registra a `TermsAcceptance` (tipo `CONSULTA_SERASA`) com o IP do orientador — a UI deve tratar isso como uma chamada de rede síncrona ao marcar o checkbox (pequeno delay antes de habilitar o botão é esperado e correto, não é bug).
- **R18 — este card só existe no fluxo manual.** Nunca replicar no fluxo link.
- **Consulta é opcional por matrícula** — o orientador pode avançar para o Passo 2 sem consultar. Nunca bloquear o fluxo por falta de consulta Serasa.
- **Custo de R$ 16,99 por consulta, repassado à escola** — vale considerar um aviso textual perto do botão informando o custo, já que é repassado (decisão de copy, não uma trava técnica — confirmar com Rafa se o aviso deve aparecer).
- **R6 — Guardian existente é reaproveitado.** Se a busca por CPF encontra um Guardian já cadastrado, o formulário de cadastro novo não aparece — em vez disso, mostra os dados do Guardian encontrado (somente leitura ou editável, a definir pelo design; a spec não exige travamento aqui) e segue para Serasa/Passo 2 usando esse Guardian.
- **`selfPayer = true` (R10):** ao ativar o toggle, a tela do Passo 2 (Aluno) inteira é **ocultada/pulada** — o sistema cria um Student automaticamente com os dados do Guardian. Sinalizar isso nesta tela com um texto de apoio, já que o efeito só aparece no próximo passo.

### Copy sugerido (mensagens-chave)

- Busca: **"Buscar por nome ou CPF"**
- Estado vazio da busca: **"Nenhum responsável encontrado. Cadastre um novo abaixo."**
- Card Serasa — título: **"Consulta Serasa (opcional)"**
- Checkbox consentimento: **"O responsável autoriza a consulta de score de crédito (Serasa) para esta matrícula."**
- Botão: **"Consultar Serasa"**
- Erro/timeout: **"Consulta indisponível — continue manualmente."**
- Score já consultado: **"Consultado em [DD/MM/AAAA]"**
- Toggle selfPayer: **"O aluno é o próprio responsável financeiro (paga a própria mensalidade)"**

---

## Tela: Manual Passo 2 — Aluno(s)

**Rota:** `/dashboard/matriculas/nova` (passo 2) · **Quem acessa:** orientador (desktop) · **Fluxo:** manual

**Esta tela é pulada inteiramente se `Guardian.selfPayer = true`** (definido no Passo 1) — não desenhar como "desabilitada", ela simplesmente não aparece no wizard.

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Nome do aluno (`Student.name`) | texto | **Sim** | — | mín. 2 caracteres | "Digite o nome do aluno" |
| Data de nascimento (`Student.birthDate`) | data | **Sim** | `DD/MM/AAAA` | data válida, não futura | "Data de nascimento inválida" |
| Observações (`Student.notes`) | texto livre (textarea) | Não | — | — | — |
| Botão "Adicionar aluno" | ação | — | — | — | — |

### Limites

- **Máximo 5 alunos por matrícula** (mesma regra de R1/R20 do fluxo link). Botão "Adicionar aluno" some/desabilita ao atingir 5.

### Estados da tela

- **Erro:** validação por bloco de aluno, mesma lógica de B3.
- **Sucesso:** avança para Passo 3 (Matérias e plano).

### Regras de negócio visíveis na tela

- Mesma regra de limite do fluxo link (R1/R20) — copy idêntico.
- Campo `notes` é o único campo opcional desta tela — não tem equivalente no fluxo link (B3 não coleta notes).

### Copy sugerido (mensagens-chave)

- Título: **"Alunos"**
- Botão: **"Adicionar aluno"**
- Bloqueio de limite: **"Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula."**

---

## Tela: Manual Passo 3 — Matérias, plano e desconto

**Rota:** `/dashboard/matriculas/nova` (passo 3) · **Quem acessa:** orientador (desktop) · **Fluxo:** manual

### Campos (por aluno)

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Matéria(s) (`Enrollment.subjectId`, chips) | chips, multi-seleção | **Sim** (mín. 1) | — | ao menos 1 por aluno | "Selecione ao menos uma matéria" |
| Plano (`Enrollment.plan`) | segmented/dropdown, seleção única **por aluno** | **Sim** | valor sempre "por mês" | um dos planos com preço configurado | "Escolha um plano" |
| Tipo de desconto (`Enrollment.discountType`) | segmented (2 opções) | Não | `%` ou `R$` | `PERCENT` \| `FIXED` \| ausente | — |
| Valor do desconto — percentual (`Enrollment.discountValueBp`) | número | Só se `discountType = PERCENT` | `0,00%`, salvo como basis points (ex.: 5% → 500 bp) | 0 ≤ valor ≤ 100% | "Desconto não pode passar de 100%" |
| Valor do desconto — fixo (`Enrollment.discountValueCents`) | número (moeda) | Só se `discountType = FIXED` | `R$ 0,00`, salvo em centavos | valor ≥ 0 e menor que `agreedPriceCents` | "Desconto não pode ser maior que o valor da mensalidade" |
| Valor final calculado (`Enrollment.finalPriceCents`) | texto, somente leitura, calculado em tempo real | — | `R$ X,XX/mês` | client-side é só exibição — o valor real e auditável é recalculado no servidor (R5) | — |

### Estados da tela

- **Loading:** nenhum — cálculo do valor final é local/imediato conforme o orientador digita o desconto.
- **Erro:** desconto fora do intervalo permitido bloqueia avanço, com mensagem inline no campo.
- **Sucesso:** avança para Passo 4 (Revisão).

### Regras de negócio visíveis na tela

- **R4 — desconto só existe no fluxo manual.** Esta tela é o único lugar do produto com esse campo.
- **R19 — 1 plano por aluno.** Se o aluno tem 2+ matérias selecionadas, o seletor de plano aparece **uma vez por aluno**, não uma vez por matéria — todas as matérias daquele aluno herdam o mesmo plano.
- **R3 — só planos com preço aparecem** (mesma regra do B4).
- **R5a — o valor "de tabela" (`agreedPriceCents`) muda conforme o plano escolhido**, lendo o campo correspondente do Subject (`MONTHLY→priceCents`, `QUARTERLY→quarterlyPriceCents`, etc.) — a UI exibe esse valor de tabela antes do desconto, para o orientador enxergar o "de/por".
- **Cálculo exibido em tela é só uma prévia** — o `finalPriceCents` que vale de verdade é recalculado no servidor no momento da criação do Enrollment (R5). Client nunca envia `finalPriceCents` calculado por ele mesmo como valor final de auditoria — o servidor recalcula e ignora o que veio do client.
- Desconto é **por aluno**, não por matéria individual — se o aluno tem 2 matérias, o mesmo percentual/valor de desconto se aplica a cada Enrollment dele (a spec não detalha desconto por matéria; tratar como desconto único por aluno aplicado a cada Enrollment gerada).

### Copy sugerido (mensagens-chave)

- Título: **"Matérias, plano e desconto"**
- Rótulo desconto: **"Desconto (opcional)"**
- Prévia: **"De R$ [agreedPriceCents] por R$ [finalPriceCents]/mês"**
- Erro desconto percentual: **"O desconto não pode passar de 100%."**
- Erro desconto fixo: **"O desconto não pode ser maior que o valor da mensalidade."**

---

## Tela: Manual Passo 4 — Revisão

**Rota:** `/dashboard/matriculas/nova` (passo 4) · **Quem acessa:** orientador (desktop) · **Fluxo:** manual

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Tabela resumo (Guardian, Students, Enrollments) | tabela, somente leitura | — | CPF mascarado `***.456.789-**` | — | — |
| Botão "Enviar link ao responsável" | ação | — | — | — | — |
| Botão "Confirmar agora" (presencial) | ação | — | — | — | — |

### Estados da tela

- **Loading:** ao clicar qualquer um dos dois botões finais, mostrar spinner e desabilitar ambos (evitar duplo clique/duplo envio).
- **Erro:** se o envio de e-mail falhar (opção "Enviar link"), mostrar toast de erro mas **não perder os dados preenchidos** — o Enrollment já foi criado como `PENDING_CONFIRMATION` mesmo que o e-mail falhe; oferecer "Reenviar e-mail" em vez de recomeçar o fluxo.
- **Sucesso:** confirmação visual + redireciona para a lista de matrículas do orientador.

### Regras de negócio visíveis na tela

- **Dois caminhos finais, mutuamente exclusivos:**
  1. **"Enviar link ao responsável"** — gera `Enrollment.confirmationToken` (válido por 72h), envia e-mail para o Guardian, mantém `Enrollment.status = PENDING_CONFIRMATION`.
  2. **"Confirmar agora"** (presencial) — usado quando o responsável está fisicamente presente. Registra nota "confirmado presencialmente" + IP do orientador no momento do clique, e avança o Enrollment diretamente (sem esperar o link) — **atenção:** a suficiência jurídica dessa confirmação presencial (vs. assinatura digital) é um **débito conhecido, não bloqueante para o MVP** (decisão #15 da spec) — não é preocupação de UI, mas o botão deve deixar claro que é uma confirmação em nome do responsável, não do próprio orientador.
- Matéria, plano e valor **não são mais editáveis** nesta tela — é revisão final antes do envio.
- Campos de dados pessoais (Guardian/Student) ainda podem ser corrigidos se o orientador perceber um erro de digitação (voltar ao passo anterior via navegação do wizard, não editar inline na revisão).

### Copy sugerido (mensagens-chave)

- Título: **"Revisão"**
- Botão 1: **"Enviar link ao responsável"**
- Botão 2: **"Confirmar agora (responsável presente)"**
- Sucesso (envio de link): **"Link enviado! O responsável tem 72 horas para confirmar."**
- Sucesso (confirmação presencial): **"Matrícula registrada. Agora é só aguardar a aprovação da escola."**
- Erro de e-mail: **"Matrícula salva, mas não conseguimos enviar o e-mail. Tente reenviar."**

---

## Tela: Confirmação do responsável (link enviado pelo orientador)

**Rota:** `/m/confirmar/[token]` · **Quem acessa:** responsável financeiro (mobile ou desktop, chega por e-mail) · **Fluxo:** manual (etapa final antes da aprovação da escola)

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Nome completo (`Guardian.name`) | texto, **editável** | **Sim** | — | mín. 3 caracteres, com espaço | "Digite seu nome completo" |
| CPF (`Guardian.cpf`) | texto numérico, **editável** | **Sim** | `000.000.000-00` | 11 dígitos + dígito verificador | "CPF inválido" |
| E-mail (`Guardian.email`) | texto (email), **editável** | **Sim** | — | regex de email | "Digite um e-mail válido" |
| Celular/WhatsApp (`Guardian.phone`) | texto numérico, **editável** | **Sim** | `(00) 00000-0000` | 11 dígitos | "Digite um celular válido com DDD" |
| Nome do aluno (`Student.name`) | texto, **editável** | **Sim** | — | mín. 2 caracteres | "Digite o nome do aluno" |
| Data de nascimento do aluno (`Student.birthDate`) | data, **editável** | **Sim** | `DD/MM/AAAA` | data válida, não futura | "Data de nascimento inválida" |
| Matéria (`Subject.name`) | texto, **somente leitura** | — | — | — | — |
| Plano (`Enrollment.plan`) | texto, **somente leitura** | — | — | — | — |
| Valor mensal (`Enrollment.finalPriceCents`) | texto, **somente leitura** | — | `R$ X,XX/mês` | — | — |
| Contrato da escola (`TermsVersion.body`) | texto expansível | — | — | — | — |
| Checkbox de aceite dos termos | checkbox | **Sim** | — | deve estar marcado | botão "Confirmar matrícula" desabilitado |

### Estados da tela

- **Loading:** ao carregar o token, valida se existe, não expirou, não foi usado.
- **Erro — token expirado/inválido/já usado:** tela substitui todo o formulário por mensagem de erro — ver copy. **Não mostrar formulário nenhum nesse caso.**
- **Erro de submit:** se `POST` falhar, toast de erro, mantém dados preenchidos, permite tentar de novo.
- **Sucesso:** navega para tela de confirmação simples ("Recebemos sua confirmação, aguarde aprovação da escola").

### Regras de negócio visíveis na tela

- **R13 — apenas dados pessoais são editáveis.** Matéria, plano e valor (`subjectId`, `plan`, `agreedPriceCents`, `discountType`, `discountValueBp`, `discountValueCents`, `finalPriceCents`) são **travados** — exibidos como somente leitura, sem input algum. Se o responsável quiser negociar valor/matéria diferente, isso precisa ser resolvido fora do fluxo (contato com a escola), não editado aqui.
- **Qualquer edição feita aqui sobrescreve o que o orientador digitou** — não é um merge, é substituição direta dos campos pessoais.
- Ao confirmar: `Enrollment.status` vai para `PENDING_SCHOOL_APPROVAL`. **`POST /customers` no Asaas não acontece nesta tela** — só depois que a escola aprovar (R14). A UI não deve dar a entender que a matrícula já está "pronta" ou "paga" ao final desta tela.
- Token expira em **72 horas** desde a geração no Passo 4 do fluxo manual.

### Copy sugerido (mensagens-chave)

- Título: **"Confirme sua matrícula"**
- Aviso de campos travados: **"Matéria, plano e valor foram combinados com a secretaria e não podem ser alterados aqui."**
- Checkbox: **"Li e aceito o contrato de matrícula da [Nome da Unidade]"**
- Botão: **"Confirmar matrícula"**
- Token expirado: **"Esse link expirou. Fale com a secretaria da [Nome da Unidade] para receber um novo."**
- Sucesso: **"Confirmado! A [Nome da Unidade] vai revisar e aprovar em breve."**

---

## Tela: Aprovação da escola (painel do orientador)

**Rota:** `/dashboard/matriculas/pendentes` · **Quem acessa:** orientador ou admin da unidade (role obrigatória — R14) · **Fluxo:** interno, painel autenticado

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Lista de matrículas pendentes | tabela | — | CPF mascarado `***.456.789-**` | filtra por `status = PENDING_SCHOOL_APPROVAL` | — |
| Indicador "editado pelo responsável" | badge/ícone | — | — | comparação entre dados originais do orientador e dados finais | — |
| Botão "Aprovar" | ação | — | — | — | — |
| Botão "Recusar" | ação | — | — | — | — |

### Estados da tela

- **Loading:** skeleton de tabela ao carregar a lista.
- **Vazio:** "Nenhuma matrícula aguardando aprovação no momento." quando a lista está vazia.
- **Loading (ação):** ao clicar "Aprovar", spinner no botão — esta ação dispara `POST /customers` no Asaas (ou reutiliza `asaasCustomerId` existente, R7) e pode levar alguns segundos; não deixar o botão clicável de novo até resposta.
- **Erro (aprovação):** se o `POST /customers` falhar, exibir erro claro e **manter o Enrollment em `PENDING_SCHOOL_APPROVAL`** (não avançar o status sem o Asaas confirmar) — permitir tentar aprovar de novo.
- **Sucesso (aprovação):** `Enrollment.status → ACTIVE`, remove da lista, notifica responsável por e-mail (fora da UI, mock no MVP).
- **Sucesso (recusa):** `Enrollment.status → CANCELLED`, remove da lista, notifica responsável por e-mail.

### Regras de negócio visíveis na tela

- **Somente role orientador ou admin da unidade pode aprovar** (R14) — se o usuário logado não tem essa role, a rota nem deveria estar acessível (tratamento de acesso, não desta spec de campos, mas relevante para o design saber que não há um terceiro botão "visualizar apenas" para outras roles neste MVP).
- **Restrição — R14 aplica-se tanto ao fluxo link quanto ao manual.** Toda matrícula, independente da origem, passa por esta tela antes de virar `ACTIVE`.
- Ao aprovar, se o Guardian já tinha `asaasCustomerId` de uma matrícula anterior, o sistema **não cria um novo customer** — reaproveita o existente (R7, idempotência) — a UI não precisa expor essa lógica, mas não deve travar/demorar mais por isso.
- Destacar visualmente quando os dados finais divergem do que o orientador digitou originalmente (o responsável pode ter corrigido algo na tela de confirmação) — ajuda a escola a notar erros de digitação do orientador vs. correções legítimas do responsável.

### Copy sugerido (mensagens-chave)

- Título: **"Matrículas pendentes de aprovação"**
- Vazio: **"Nenhuma matrícula aguardando aprovação no momento."**
- Botão: **"Aprovar"** / **"Recusar"**
- Confirmação de aprovação (se houver modal): **"Ao aprovar, criamos o cadastro de cobrança no Asaas para [Nome do Guardian]."**
- Erro de aprovação: **"Não foi possível aprovar agora. Tente novamente."**
- Sucesso: **"Matrícula aprovada. [Nome do Guardian] já pode ser cobrado."**

---

## Tela: Contrato da escola (settings, cadastro do contrato)

**Rota:** `/dashboard/configuracoes/contrato` · **Quem acessa:** orientador ou admin (autenticado) · **Fluxo:** painel de configuração (Fatia 6, alimenta B5 e a tela de confirmação do responsável)

### Campos

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Texto do contrato (`TermsVersion.body`) | textarea ou rich text simples | **Sim, para publicar** | — | não vazio | "O contrato não pode ficar em branco" |
| Preview do contrato | texto, somente leitura | — | mostra exatamente como aparece em B5/confirmação | — | — |

### Estados da tela

- **Loading:** carrega a `TermsVersion` mais recente do tipo `ESCOLA_RESPONSAVEL`, se existir.
- **Erro:** falha ao salvar → toast de erro, mantém o texto digitado no campo (não perder trabalho do usuário).
- **Sucesso:** salva como **nova** `TermsVersion` — nunca sobrescreve a anterior (preserva auditoria de aceites já feitos contra a versão antiga).

### Regras de negócio visíveis na tela

- **Cada edição gera uma nova versão do contrato**, não uma edição in-place — isso é importante para a UI comunicar: "Salvar" cria uma versão nova que passa a valer a partir de agora; matrículas já aceitas continuam vinculadas à versão que aceitaram.
- Se não houver nenhum contrato cadastrado ainda, os fluxos de matrícula (B5, confirmação do responsável) ficam com o texto vazio — vale considerar (fora do escopo de campos, mas relevante) um aviso no painel: "Você ainda não cadastrou o contrato da escola — os responsáveis vão ver esse aviso na matrícula" (a decidir com Rafa se deve bloquear ou só avisar).

### Copy sugerido (mensagens-chave)

- Título: **"Contrato de matrícula"**
- Botão: **"Salvar nova versão"**
- Aviso de versionamento: **"Salvar aqui cria uma nova versão do contrato. Matrículas já aceitas continuam valendo com a versão anterior."**
- Erro: **"O contrato não pode ficar em branco."**

---

## Componentes do Design System a reusar

Mapeamento do que já existe em `src/components/ui/` para as necessidades deste fluxo. **Três necessidades não têm componente pronto — sinalizadas como gap ao final.**

| Necessidade da tela | Componente existente | Como usar |
|---|---|---|
| Badge de score Serasa (verde/amarelo/vermelho) | `badge.tsx` — `Badge` com `variant` | `variant="success"` (score ≥700), `variant="warning"` (400–699), `variant="danger"` (<400 ou negativado). Já existe mapa `STATUS` em `badge.tsx` para status de matrícula (ex.: `pendente`→`warning`, `aprovado`→`success`) — reusar o mesmo padrão de cor para o status do Enrollment (`PENDING_CONFIRMATION`/`PENDING_SCHOOL_APPROVAL`→warning, `ACTIVE`→success, `CANCELLED`→danger) via `StatusBadge`. |
| Chips de matéria (B3, Manual Passo 2/3) | `Chip.tsx` | `active` para matéria selecionada, prop `color` aceita a cor por índice da matéria (círculo colorido antes do label). |
| Cards de plano (B4) | `SegmentedCard` (`segmented.tsx`) | `options` = planos disponíveis (filtrados server-side pelos que têm preço), `label` = nome do plano, `description` = valor "R$ X/mês". |
| Seletor de plano por aluno (Manual Passo 3) | `Segmented` ou `SegmentedCard` (`segmented.tsx`) | Mesmo componente do B4, repetido por bloco de aluno. |
| Segmented de tipo de desconto (% vs R$) | `Segmented` (`segmented.tsx`) | 2 opções: `PERCENT` / `FIXED`. |
| Toggle `selfPayer` | `toggle.tsx` — `Toggle` | `checked`/`onChange` padrão, já usado nesse padrão de switch em outras telas. |
| Inputs de texto/CPF/email/telefone/valor/data | `input.tsx` — `Input` | Usar `error` prop para estado de erro (borda vermelha), `leadingIcon`/`trailing` se o design quiser ícone de CPF/telefone. Máscara de formatação é lógica de componente controlado, não vem pronta no `Input` — implementar no form (ex.: `react-imask` ou handler custom), mas o componente visual é este. |
| Wrapper de campo com label + erro + hint | `field.tsx` — `Field` | Usar em **todo** campo do formulário — já resolve label, asterisco de obrigatório, mensagem de erro em vermelho com ícone, hint. Isso cobre a maior parte da "Mensagens de erro exatas" pedida neste doc: renderizar a string de erro na prop `error` do `Field`. |
| Botões de ação (Continuar, Enviar, Aprovar, Consultar Serasa) | `button.tsx` — `Button` | `variant="primary"` para ações principais, `variant="secondary"` para "Recusar"/cancelar, `variant="danger"`/`danger-outline` para recusa de matrícula. Estado de loading = `disabled` + ícone/spinner (o componente não tem prop `loading` nativa — controlar via `disabled` e children condicionais). |
| Tabela de revisão (Manual Passo 4, Painel de aprovação) | `table.tsx` — `Table`, `TableHeader`, `TableRow`, `TableCell` | Uso direto, já estilizado com hover e bordas do DS. |
| Card de agrupamento (Consulta Serasa, blocos de aluno) | `Card.tsx` | `interactive` se for clicável, `active` para destacar o bloco selecionado/em foco. |
| Métricas/resumo (total consolidado em B4) | `Metric.tsx` | Pode ser usado para exibir "Total: R$ X/mês" com destaque, embora um texto simples também resolva — avaliar se o resumo consolidado merece o peso visual de um `Metric` ou só um texto grande. |
| Toast de erro/sucesso (envio de matrícula, aprovação, etc.) | `toast.tsx` — `useToast()` | `toast(mensagem, 'success' | 'error' | 'info')` — usar para todos os toasts de erro de rede/submit descritos neste doc. |
| Modal de confirmação (aprovar/recusar matrícula) | `dialog.tsx` — `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` | Se o design decidir confirmar a ação de aprovação/recusa com um modal antes de disparar o `POST /customers`. |
| Gráfico (não usado neste fluxo) | `BarChart.tsx` | Sem uso previsto em Matrícula — mencionado só para descartar. |

### Gaps — não existe componente pronto no DS para:

1. **Checkbox.** Necessário em: aceite de termos (B5, tela de confirmação do responsável) e consentimento LGPD da Consulta Serasa (Manual Passo 1). Não há `checkbox.tsx` em `src/components/ui/`. Precisa ser criado (ou usar um input nativo estilizado) antes de implementar essas telas.
2. **Select/dropdown nativo.** Necessário em: `Guardian.type` (mãe/pai/responsável legal). Como são só 3 opções fixas, o `Segmented` (`segmented.tsx`) pode servir como substituto funcional (radiogroup de 3 botões) sem precisar de um dropdown de verdade — mas isso é uma decisão de design a confirmar, não um mapeamento direto.
3. **Date picker.** Necessário em: `Student.birthDate` (todas as telas que coletam data de nascimento). Não há componente de calendário no DS listado — provável caminho é `input type="date"` nativo ou um `Input` de texto com máscara `DD/MM/AAAA` e validação client-side, sem calendário visual. Confirmar abordagem com o design antes de implementar.

---

## Referência rápida — validações client-side vs. server-side por tipo de dado

| Dado | Validação client-side (formato) | Validação de negócio (server-side, sempre revalidada) |
|---|---|---|
| CPF | 11 dígitos + algoritmo de dígito verificador (módulo 11) | Descriptografia na borda antes de enviar ao Asaas; nunca logar valor cru |
| E-mail | regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` | — |
| Celular | 11 dígitos (DDD + 9 dígitos) | — |
| Data de nascimento | data válida, não futura | — |
| Nome | não vazio, mín. de caracteres | — |
| Desconto (%) | 0–100% | Servidor recalcula `finalPriceCents`; client nunca define o valor final de auditoria (R5) |
| Desconto (R$) | ≥ 0 e < valor da mensalidade | idem acima |
| Plano | um dos valores do enum, com preço configurado no Subject | `agreedPriceCents` é derivado no servidor a partir do plano + Subject (R5a) — client nunca envia esse valor calculado |
| Guardian existente | — | Busca por CPF descriptografado na borda de busca interna (R6); reaproveitamento de `asaasCustomerId` (R7) |
| Aceite de termos | checkbox marcado (bloqueia botão) | `TermsAcceptance` registrada com IP + timestamp antes de qualquer `POST /customers` (R8) |
| Token de confirmação | — | Validação de expiração (72h) e uso único, sempre no servidor (R9) |
| Consentimento Serasa | checkbox marcado (bloqueia botão) | `TermsAcceptance` tipo `CONSULTA_SERASA` registrada com IP do orientador antes de habilitar a chamada (R16) |
| Reconsulta Serasa | — | Bloqueada no servidor se `serasaCheckedAt` já existe (R17) |
| Limite de alunos | contagem no client desabilita botão em 5 | Servidor também rejeita o 6º Student no mesmo fluxo, mesmo que o client falhe em bloquear (R1/R20) |

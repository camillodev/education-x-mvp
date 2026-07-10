# Design Handoff — Cobrança Automática: Campos, Validação e Regras de Negócio

> **Fase:** MVP · **Fatia:** F2 (Cobrança + Webhook) · **Persona:** secretaria/dona de unidade
> **Spec-fonte:** [`mvp-03-cobranca-automatica.md`](../mvp-03-cobranca-automatica.md) — fonte de verdade. Toda referência RN-xx e decisão-xx remete a ela.
> **Handoff irmão:** [`mvp-03-cobranca.md`](./mvp-03-cobranca.md) — cobre layout/visual/paleta/timeline. **Este documento NÃO repete visual** — Design System Alfabeto já existe e está pronto. Foco exclusivo: quais campos existem, como validam, o que a UI precisa mostrar/bloquear por regra de negócio.
> **DS:** Alfabeto (componentes prontos em `src/components/ui/`, ver seção final).
> **Moeda:** todo valor é armazenado em **centavos** (Int) no banco e nunca trafega em ponto flutuante. A UI SEMPRE exibe formatado em R$ (`Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})` ou equivalente) — nunca mostrar o centavo cru.

---

## 0. Cinco telas cobertas

| # | Tela | Rota (referência) | Endpoint(s) |
|---|------|-------------------|-------------|
| 1 | Lista de cobranças (C3) | `/cobrancas` | `GET /api/invoices` |
| 2 | Detalhe da cobrança (C4) | `/cobrancas/[id]` | `GET /api/invoices/[id]`, `POST` reenviar, `DELETE` cancelar, `POST` reemitir |
| 3 | Emissão manual avulsa | modal/drawer a partir de C1 (detalhe Enrollment) ou linha de C3 | `POST /api/enrollments/{id}/invoices` |
| 4 | Emissão em lote | modal/drawer a partir de C3 ou tela de turma/matéria | `POST /api/billing/batch` |
| 5 | Estado BLOCKED (variação de C3/C4, não é tela nova) | dentro de C3/C4 | leitura apenas; CTA leva a cadastro de Guardian (fora de escopo desta spec) |

---

## 1. Lista de cobranças (C3)

### 1.1 Filtros

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Status | select múltiplo (chip/segmented) | Não (default = "Todas") | Enum `InvoiceStatus`: PENDING, PAID, OVERDUE, BLOCKED, ERROR, CANCELLED | Deve ser subconjunto do enum válido | N/A (UI controlada, não é input livre) |
| Período (referenceMonth) | date range picker (mês/ano) | Não (default = mês corrente) | `MM/AAAA` na UI → serializa `"2026-07"` | `de <= até`; formato `YYYY-MM` | "Selecione um intervalo válido" |
| Matéria/turma (subjectId) | select (busca por nome) | Não | Nome da matéria | Deve existir na Unit da sessão | N/A (populado por lista fechada) |
| Aluno/Responsável | input texto com debounce (400ms) | Não | Texto livre | Sem validação de formato; busca por `LIKE` em `Student.name` / `Guardian.name` (nome, não PII sensível) | N/A |

**Regra de negócio visível:** filtro nunca cruza `unitId` — a lista SEMPRE é escopada à Unit da sessão Clerk (multi-tenant, decisão 7 da spec). Não expor esse filtro na UI; é implícito no backend.

### 1.2 Colunas da tabela

| Coluna | Campo fonte | Formato exibido | Alinhamento | Ordenável |
|---|---|---|---|---|
| Responsável | `Guardian.name` (via Enrollment) | Texto | Esquerda | Sim (A-Z) |
| Aluno | `Student.name` (via Enrollment) | Texto | Esquerda | Sim (A-Z) |
| Matéria | `Subject.name` (via Enrollment) | Texto | Esquerda | Sim (A-Z) |
| Valor | `Invoice.amountCents / 100` | `R$ 1.250,00` (2 casas, separador milhar `.`, decimal `,`) | Direita | Sim (numérico) |
| Vencimento | `Invoice.dueDate` | `DD/MM/AAAA` | Esquerda | Sim (data, default desc) |
| Status | `Invoice.status` | Badge (ver seção 6) | Centro | Sim (agrupa por status) |
| Ação | condicional | Botão "Reemitir" só se `status = ERROR` | Centro | N/A |

**Regra de negócio visível:** a coluna "Valor" mostra `amountCents`, não `netAmountCents` recalculado na tela — o valor já é o snapshot gravado no momento da emissão (RN-09: nunca relê `Subject.priceCents`). Se a Invoice está `OVERDUE`, a tabela **não** soma multa/juros na lista — isso só aparece no detalhe (C4). Mostrar multa na lista geraria inconsistência com o valor que o Asaas realmente cobra no momento X (multa é pro-rata até a data de consulta).

### 1.3 Estados da tela

| Estado | Gatilho | O que mostrar |
|---|---|---|
| Loading | Fetch inicial ou troca de filtro | Skeleton de 5-8 linhas na tabela, filtros desabilitados |
| Vazio (sem filtro) | Unit sem nenhuma Invoice ainda | Empty state: "Nenhuma cobrança emitida ainda" + explicação de que o cron roda dia 1 |
| Vazio (com filtro) | Filtro não retorna resultado | "Nenhuma cobrança encontrada com esses filtros" + botão "Limpar filtros" |
| Erro de fetch | Falha de rede/servidor | Toast vermelho "Não foi possível carregar as cobranças" + botão retry |
| Populado | Fetch com sucesso e ≥1 resultado | Tabela paginada (sugestão: 20/página) |

### 1.4 Regras de negócio visíveis

- Badge de status usa exatamente as 6 cores/estados da seção 6 — nunca inventar variação.
- Botão "Reemitir" só aparece em linhas `ERROR` (decisão 13). Clique chama o mesmo endpoint de reemissão do C4 (ver seção 2.4) sem sair da lista — usar toast de feedback, não navegação.
- Nenhuma ação de emitir avulso/lote acontece dentro da tabela em si — os botões "Emitir cobrança" e "Emitir cobrança em lote" ficam fora da tabela (topo da tela ou tela de turma), ver seções 3 e 4.

### Copy sugerido (C3)

- Título da tela: "Cobranças"
- Empty state (sem dado): "Nenhuma cobrança emitida ainda. As cobranças do mês são geradas automaticamente todo dia 1."
- Empty state (filtro sem match): "Nenhuma cobrança encontrada com esses filtros."
- Erro de carregamento: "Não foi possível carregar as cobranças. Tentar de novo."
- Tooltip botão Reemitir: "Tentar emitir esta cobrança novamente no Asaas"

---

## 2. Detalhe da cobrança (C4)

### 2.1 Campos exibidos (somente leitura, vindos da Invoice)

| Campo | Tipo | Obrigatório na exibição | Máscara/Formato | Validação | Erro se inválido/ausente |
|---|---|---|---|---|---|
| Aluno + Matéria + Competência | `Student.name` + `Subject.name` + `referenceMonth` | Sim | "Marina Silva — Matemática — Julho/2026" (`referenceMonth "2026-07"` → "Julho/2026") | N/A (leitura) | Se `referenceMonth` mal formado, mostrar cru sem crash |
| Valor base | `amountCents / 100` | Sim | `R$ 1.250,00` | N/A | — |
| Desconto (se houver) | `Enrollment.discountType` + `discountValueBp`/`discountValueCents` (referência histórica, não recalculado) | Não (só se Enrollment tinha desconto no momento da emissão) | Linha "Desconto aplicado: -R$ 50,00 (negociado na matrícula)" | N/A | — |
| Multa (se OVERDUE) | `BillingConfig.lateFeePercent / 100` aplicado sobre `amountCents` | Só se `status = OVERDUE` | "Multa por atraso (2%): +R$ 25,00" | Ver 2.2 (cálculo) | Se `lateFeePercent` nulo/0, omitir linha |
| Juros (se OVERDUE) | `BillingConfig.monthlyInterestBp / 100`, pro rata dias em atraso | Só se `status = OVERDUE` | "Juros (1% a.m., 12 dias): +R$ 5,00" | Ver 2.2 (cálculo) | Se `monthlyInterestBp` nulo/0, omitir linha |
| Total a pagar | soma acima | Sim | "Total: R$ 1.280,00" em destaque (negrito/maior) | N/A | — |
| Valor efetivamente pago | `paidAmountCents / 100` | Só se `status = PAID` | "Pago: R$ 1.280,00 em DD/MM às HH:MM" | N/A | — |
| Vencimento | `dueDate` | Sim | `DD/MM/AAAA` | N/A | — |
| Linha digitável | `asaasBarCode` | Só se Invoice não `BLOCKED` | Monospace, agrupado em blocos de 5 dígitos, botão "Copiar código" | N/A | Se `asaasBarCode` nulo e status não é BLOCKED/ERROR, mostrar skeleton (ainda propagando do Asaas) |
| PIX copia-e-cola / QR | derivado do boleto Asaas (mesmo documento embute PIX) | Só se Invoice não `BLOCKED` | QR Code + string monospace com botão "Copiar" | N/A | Mesma regra do boleto |
| Link do boleto (PDF) | `asaasBankSlipUrl` | Só se Invoice não `BLOCKED` | Botão "Baixar boleto (PDF)" | N/A | Se nulo, desabilitar botão com tooltip "Boleto ainda sendo gerado" |
| ID da cobrança no Asaas | `asaasPaymentId` | Não (informativo, rodapé) | "#pay_xxx" pequeno, cinza | N/A | Omitir se nulo (ex: BLOCKED nunca chamou o Asaas) |
| Histórico/timeline | `Invoice.status` + `emittedAt` + `paidAt` + `Payment[]` | Sim | Lista cronológica (ver handoff visual irmão para o componente de timeline) | N/A | Se não há nenhum evento ainda (Invoice recém-criada), mostrar só "Cobrança gerada em DD/MM" |

### 2.2 Regra de negócio visível — cálculo de multa + juros (OVERDUE)

Esta é a regra mais sensível da tela e PRECISA estar visível e correta:

- **Multa:** `BillingConfig.lateFeePercent` é armazenado em basis points (ex: `200` = 2%). Fórmula de exibição: `multaCents = round(amountCents * (lateFeePercent / 100) / 100)`. Aplicada uma única vez, não pro rata — é fixa a partir do 1º dia de atraso.
- **Juros:** `BillingConfig.monthlyInterestBp` também em basis points (ex: `100` = 1% ao mês), mas o juro é **pro rata dia**: `jurosCents = round(amountCents * (monthlyInterestBp / 100 / 100) * (diasEmAtraso / 30))`, onde `diasEmAtraso = hoje - dueDate` (mínimo 1, nunca negativo).
- **Total exibido:** `amountCents + multaCents + jurosCents`, sempre em centavos internamente, convertido pra R$ só na renderização final.
- Se o webhook já retornou `paidAmountCents` (Invoice `PAID` após estar `OVERDUE`), a tela mostra o valor **realmente cobrado pelo Asaas** (`paidAmountCents`), não o valor recalculado no front — o cálculo acima é só para exibir a **estimativa** enquanto ainda está `OVERDUE` e não pago.
- Nunca deixar a UI "inventar" um valor de multa/juros para status que não seja `OVERDUE` — em `PENDING`, mostrar só o valor base.

### 2.3 Regra de negócio visível — desconto

- O desconto **não é recalculado no detalhe**. `Enrollment.finalPriceCents` já é o valor pós-desconto e é o que a Invoice usa como `amountCents` (RN-08/RN-09, decisão 12). A UI mostra a linha de desconto **apenas como contexto informativo** (para a secretaria entender por que o valor é menor que o `Subject.priceCents` cadastrado) — não é um campo editável nem recalculável na tela de cobrança.
- Se `Enrollment.discountType` é `null`, a linha de desconto não aparece.
- Se `discountType = PERCENT`: copy "Desconto aplicado: -X% (negociado na matrícula)".
- Se `discountType = FIXED`: copy "Desconto aplicado: -R$ X,XX (negociado na matrícula)".

### 2.4 Ações (botões)

| Ação | Quando disponível | Confirmação? | Efeito | Feedback |
|---|---|---|---|---|
| Reenviar cobrança | `status` != `PAID` e != `CANCELLED` | Não (ação não destrutiva) | Reenvia notificação do boleto (Asaas built-in) | Toast "Reenviando..." → "Responsável notificado novamente" |
| Cancelar cobrança | `status = PENDING` apenas | Sim — modal "Tem certeza? A cobrança será cancelada no Asaas e não pode ser desfeita." | `DELETE /payments/{id}` no Asaas + `Invoice.status = CANCELLED` | Toast verde "Cobrança cancelada" → volta pra C3 |
| Reemitir | `status = ERROR` apenas | Não (ação corretiva, não destrutiva) | Chama `BillingService.emitInvoice` de novo pra mesma Invoice/Enrollment — **não é bloqueado pela idempotência**, pois idempotência só previne duplicar Invoice bem-sucedida (decisão 13) | Toast "Tentando emitir novamente..." → sucesso atualiza pra PENDING ou mantém ERROR com novo motivo |
| Copiar linha digitável / PIX | Invoice não `BLOCKED` | Não | Copia pra clipboard | Toast "Copiado!" |

**Regra de negócio visível:** botões "Cancelar" e "Reenviar" desaparecem/desabilitam fora das condições acima — nunca mostrar ativo e falhar silenciosamente no clique. Ex: em `PAID`, ambos ficam ocultos (não apenas desabilitados) porque não fazem sentido semântico ali.

### 2.5 Estados da tela

| Estado | Gatilho | O que mostrar |
|---|---|---|
| Loading | Fetch da Invoice por id | Skeleton do cabeçalho + valor + boleto |
| Não encontrada / outra Unit | Invoice não existe OU pertence a outra Unit (isolamento de tenant) | 404 — "Cobrança não encontrada" (nunca vazar dado de outra Unit) |
| BLOCKED | `status = BLOCKED` | Ver seção 5 (tela dedicada a esse estado) |
| ERROR | `status = ERROR` | Boleto/PIX ocultos, banner vermelho com motivo do erro + botão "Reemitir" em destaque |
| Populada normal | PENDING/PAID/OVERDUE/CANCELLED | Layout completo descrito acima |
| Erro de ação (reenviar/cancelar/reemitir falhou) | Falha de rede/Asaas indisponível | Toast vermelho "Não foi possível completar a ação. Tentar de novo." — Invoice mantém estado anterior |

### Copy sugerido (C4)

- Cabeçalho: "{Aluno} — {Matéria} — {Mês/Ano}"
- Linha multa: "Multa por atraso ({X}%): +R$ {valor}"
- Linha juros: "Juros ({X}% a.m., {N} dias de atraso): +R$ {valor}"
- Total: "Total a pagar: R$ {valor}"
- Botão copiar: "Copiar código" / "Copiar chave PIX"
- Confirmação de cancelamento: "Cancelar esta cobrança? Essa ação não pode ser desfeita e o boleto deixará de ser válido."
- Banner ERROR: "Não conseguimos gerar esta cobrança no sistema de pagamento. Motivo: {mensagem técnica resumida}. Vamos tentar de novo automaticamente, ou você pode tentar agora."

---

## 3. Emissão manual (avulsa)

**Objetivo:** emitir 1 Invoice fora do ciclo do cron, para 1 Enrollment específica (RN-17).

### 3.1 Campos do formulário

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Enrollment (aluno + matéria) | select ou pré-preenchido (se aberto a partir do detalhe do aluno) | Sim | "Marina Silva — Matemática" | Deve ser Enrollment com `status = ACTIVE` na Unit da sessão | "Selecione uma matrícula ativa" |
| Mês de referência (referenceMonth) | select (mês/ano) ou campo oculto com default | Não (default = mês corrente, `YYYY-MM`) | "Julho/2026" | Formato `YYYY-MM`; não permitir mês retroativo além do atual (evitar cobrança de competência já fechada sem intenção clara) | "Selecione o mês corrente ou um mês futuro" |
| Confirmação | checkbox ou botão único de ação | Implícito no botão "Emitir" | N/A | N/A | N/A |

### 3.2 Estados da tela

| Estado | Gatilho | O que mostrar |
|---|---|---|
| Formulário inicial | Abertura do modal | Enrollment pré-selecionada (se veio do contexto) + mês corrente já preenchido |
| Enviando | Clique em "Emitir" | Botão em loading, formulário desabilitado |
| Sucesso — nova Invoice criada | Resposta 201/200 com Invoice nova | Toast verde "Cobrança emitida com sucesso" + fecha modal + atualiza lista |
| Sucesso — já existia (idempotência) | Resposta com Invoice pré-existente (mesma `idempotencyKey`) | Toast informativo (não erro) "Esta cobrança já havia sido emitida para este mês" + mostra a Invoice existente (link pra C4) |
| BLOCKED | Guardian sem `asaasCustomerId` | Toast/aviso amarelo "Não foi possível emitir: responsável não está cadastrado no sistema de pagamento" + Invoice criada como BLOCKED (visível em C3) |
| Erro | Falha de rede/Asaas | Toast vermelho "Não foi possível emitir a cobrança. Tentar de novo." |

### 3.3 Regras de negócio visíveis

- **Idempotência (RN-03/RN-17):** se já existe Invoice com `idempotencyKey = enrollmentId:referenceMonth` (seja do cron ou de emissão manual anterior), o sistema **não duplica** — retorna a existente. A UI **precisa comunicar isso como sucesso informativo, não erro**, e nunca deixar a secretaria pensar que criou 2 cobranças. Sugestão de proteção adicional na UI: se o mês selecionado já tem Invoice para aquela Enrollment (dá pra saber via lookup antes do submit, se o form tiver esse contexto), desabilitar o botão "Emitir" preventivamente com tooltip "Já existe cobrança para {mês} desta matrícula" — reduz round-trip desnecessário, mas o backend é a fonte de verdade final.
- **BLOCKED sem bypass (RN-19):** não existe "forçar emissão" para Guardian sem `asaasCustomerId`. O formulário sempre pode ser submetido, mas o resultado será BLOCKED se a condição não for satisfeita — não há campo na UI pra contornar isso.
- **Boleto sempre com PIX embutido:** não há seletor de forma de pagamento no formulário. Nenhum campo "Boleto" vs "PIX" — é sempre o mesmo documento (`billingType: BOLETO`, decisão 3).

### Copy sugerido

- Título modal: "Emitir cobrança avulsa"
- Label mês: "Mês de referência"
- Botão principal: "Emitir cobrança"
- Sucesso: "Cobrança emitida com sucesso."
- Já existia: "Esta cobrança já foi emitida para {mês}. Ver cobrança existente."
- BLOCKED: "Não foi possível emitir: o responsável ainda não está cadastrado no sistema de pagamento."

---

## 4. Emissão em lote

**Objetivo:** emitir Invoices para todas as Enrollments `ACTIVE` de uma matéria/turma de uma vez (RN-18).

### 4.1 Campos do formulário

| Campo | Tipo | Obrigatório | Máscara/Formato | Validação | Erro se inválido |
|---|---|---|---|---|---|
| Matéria/turma (subjectId) | select (busca) | Sim | Nome da matéria | Deve existir na Unit da sessão; deve ter ≥1 Enrollment ACTIVE | "Selecione uma matéria com alunos ativos" |
| Mês de referência (referenceMonth) | select (mês/ano) | Não (default = mês corrente) | "Julho/2026" | Formato `YYYY-MM`; mesma regra de não retroagir além do mês corrente | "Selecione o mês corrente ou um mês futuro" |
| Preview de quantidade | somente leitura, calculado ao selecionar matéria | N/A | "Serão geradas até N cobranças" | N/A | — |
| Confirmação | botão "Emitir em lote" | Implícito | N/A | N/A | — |

### 4.2 Preview antes de confirmar

Ao selecionar a matéria (antes de confirmar o disparo), mostrar um resumo estimado:

| Campo do preview | Fonte | Formato |
|---|---|---|
| Total de matrículas ativas | `COUNT(Enrollment WHERE subjectId = X AND status = ACTIVE)` | "12 alunos ativos nesta matéria" |
| Valor total estimado | soma de `Enrollment.finalPriceCents` das Enrollments elegíveis | "Valor total estimado: R$ 15.000,00" |
| Aviso de já emitidas | se detectável antes do submit: quantas já têm Invoice no mês (idempotência) | "3 já têm cobrança emitida este mês — serão ignoradas" (informativo, não bloqueia) |

**Nota:** o preview de "já emitidas"/BLOCKED antes do submit é desejável mas opcional — o resultado definitivo e confiável só vem depois do POST (seção 4.3), já que a checagem de `asaasCustomerId` e idempotência é feita Enrollment a Enrollment no backend.

### 4.3 Resultado agregado (pós-confirmação)

A resposta do `POST /api/billing/batch` traz contagem agregada — a UI PRECISA mostrar as 4 categorias, não só "sucesso":

| Categoria | Copy | Cor/ícone sugerido |
|---|---|---|
| Emitidas com sucesso | "{N} cobranças emitidas" | Verde |
| Puladas por já existirem (idempotência) | "{N} já haviam sido emitidas este mês" | Cinza/neutro |
| Bloqueadas (Guardian sem cadastro) | "{N} bloqueadas — responsável sem cadastro no sistema de pagamento" | Amarelo |
| Com erro | "{N} falharam ao emitir" | Vermelho, com link "Ver detalhes" (leva pra C3 filtrada por `status=ERROR` e o `subjectId` usado) |

### 4.4 Estados da tela

| Estado | Gatilho | O que mostrar |
|---|---|---|
| Formulário inicial | Abertura do modal | Select de matéria vazio, preview oculto |
| Preview carregado | Matéria selecionada | Card com contagem + valor estimado (seção 4.2) |
| Enviando | Clique em "Emitir em lote" | Loading — para lotes grandes, considerar barra de progresso ou "Isso pode levar alguns segundos" |
| Resultado agregado | Resposta do batch | Resumo com as 4 categorias (seção 4.3) + botão "Fechar" que atualiza C3 |
| Erro geral (batch inteiro falhou, ex: subjectId inválido) | Falha antes de processar qualquer Enrollment | Toast vermelho "Não foi possível processar o lote. Tentar de novo." |

### 4.5 Regras de negócio visíveis

- **Nunca há bypass de BLOCKED em lote** (RN-19) — mesma regra da emissão avulsa, mas em lote o volume de bloqueios é mais visível e deve ser destacado no resultado agregado, não escondido.
- **Idempotência por Enrollment, não por lote** (RN-03/RN-17/RN-18): rodar o lote 2x no mesmo mês não duplica nada — a segunda rodada simplesmente move tudo pra categoria "já haviam sido emitidas". A UI deve deixar claro que reprocessar o lote é seguro (copy: "Rodar de novo não duplica cobranças já emitidas").
- **Confirmação obrigatória antes de disparar** — como a ação gera N cobranças reais no Asaas (efeito financeiro, não reversível trivialmente), o botão final deve pedir confirmação explícita (modal ou double-check), mesmo que cada emissão individual não peça.

### Copy sugerido

- Título modal: "Emitir cobrança em lote"
- Label matéria: "Matéria/turma"
- Preview: "{N} alunos ativos — valor total estimado R$ {valor}"
- Botão confirmação: "Confirmar emissão para {N} alunos"
- Modal de confirmação: "Confirmar emissão em lote? Isso vai gerar até {N} cobranças reais no valor total de R$ {valor}."
- Resultado: "{N} emitidas · {N} já existiam · {N} bloqueadas · {N} com erro"

---

## 5. Estado BLOCKED (o que a secretaria vê)

Não é uma tela nova — é uma variação de estado dentro de C3 (badge na lista) e C4 (detalhe). Documentado à parte porque tem uma regra de UX própria: **CTA de correção**.

### 5.1 Em C3 (lista)

| Elemento | Comportamento |
|---|---|
| Badge | Amarelo, copy "Aguardando cadastro" (ver seção 6) |
| Linha clicável | Sim, leva pro detalhe (C4) — não há ação direta na lista além do badge informativo |

### 5.2 Em C4 (detalhe)

| Elemento | Campo/Regra | Comportamento |
|---|---|---|
| Banner de aviso (topo, destaque) | `Guardian.asaasCustomerId IS NULL` | Amarelo, ícone de alerta: "Este responsável ainda não está cadastrado no sistema de pagamento. Nenhum boleto foi gerado." |
| CTA | Link/botão "Completar cadastro do responsável" | Leva pro fluxo de cadastro/edição do Guardian (fora do escopo desta spec — só o ponto de entrada) |
| Valor | `amountCents / 100` | Ainda exibido normalmente (a cobrança "existe" no sistema, só não foi ao Asaas) |
| Boleto / PIX / linha digitável | N/A — nunca gerados | Seção inteira oculta, substituída por texto: "O boleto e o PIX serão gerados assim que o cadastro for concluído" |
| Botões de ação | Reenviar/Cancelar/Reemitir | Todos ocultos — não há o que reenviar (nunca foi emitido) nem cancelar no Asaas (nunca existiu lá). Cancelar a Invoice em si (mudar pra CANCELLED sem nunca ter ido ao Asaas) pode ser permitido, mas é uma decisão de produto não coberta pela spec — se implementado, tratar como "Cancelar" normal sem chamada DELETE ao Asaas |

### 5.3 Regra de negócio

- `BLOCKED` nunca chama o Asaas (RN-02/RN-19) — não existe `asaasPaymentId`, `asaasBarCode`, `asaasBankSlipUrl` pra essa Invoice. A UI não pode assumir que esses campos existem; sempre checar antes de renderizar.
- A escola é notificada por e-mail quando uma Invoice cai em BLOCKED (fora da UI, canal separado) — a tela não precisa disparar nada, só refletir o estado.
- Assim que o Guardian ganha `asaasCustomerId` (fora desta spec), a Invoice BLOCKED **não se autocorrige sozinha** — ela precisa ser reemitida (manual ou no próximo ciclo do cron/retry). Se o botão "Reemitir" for exposto aqui também (mesma lógica do ERROR), isso deve ficar condicionado a `asaasCustomerId` já não ser mais nulo; caso contrário mostrar o mesmo banner de bloqueio outra vez.

### Copy sugerido

- Banner: "Responsável não cadastrado no sistema de pagamento. Nenhum boleto foi gerado para esta cobrança."
- CTA: "Completar cadastro do responsável"
- Placeholder do boleto: "O boleto e o PIX aparecerão aqui assim que o cadastro do responsável for concluído."
- Badge da lista: "Aguardando cadastro"

---

## 6. Referência de badges de status (usada em C3 e C4)

| Status | Cor | Copy do badge | Copy auxiliar (subtítulo/tooltip) |
|---|---|---|---|
| `PENDING` | Amarelo-claro | "A vencer" | "Vence em DD/MM" |
| `PAID` | Verde | "Pago" | "Pago em DD/MM" |
| `OVERDUE` | Vermelho | "Vencida" | "Venceu em DD/MM — multa e juros aplicados" |
| `BLOCKED` | Amarelo | "Aguardando cadastro" | "Responsável sem cadastro no sistema de pagamento" |
| `ERROR` | Vermelho-escuro | "Falha na emissão" | "Não foi possível gerar esta cobrança" |
| `CANCELLED` | Cinza | "Cancelada" | "Cancelada pela escola" |

Usar o componente `badge.tsx` do DS Alfabeto com a variant correspondente a cada cor — não introduzir tom novo fora da paleta já definida no handoff visual irmão (`mvp-03-cobranca.md`, seção 6).

---

## 7. Regras de negócio transversais (aparecem em mais de uma tela)

Resumo consolidado — cada uma já está detalhada na seção da tela correspondente, listada aqui pra checagem rápida:

1. **Idempotência de emissão** (RN-03/RN-17/RN-18): nunca é possível emitir 2 Invoices pro mesmo `enrollmentId:referenceMonth`. UI comunica como sucesso informativo, nunca como erro, quando a tentativa esbarra numa Invoice já existente. Aparece em: emissão avulsa (3.3), emissão em lote (4.5).
2. **Boleto sempre com PIX embutido** (decisão 3): jamais expor um seletor "Boleto vs PIX" como formas de pagamento distintas — é sempre o mesmo `billingType: BOLETO`, que já embute QR Code PIX no mesmo documento. Aparece em: emissão avulsa (3.3), detalhe C4 (2.1 — abas Boleto/PIX são apenas visualizações do mesmo documento, não escolhas).
3. **Multa 2% + juros 1% a.m. pro rata** (seção 2.2): só calculado/exibido quando `status = OVERDUE`; multa é fixa, juros é pro rata por dia de atraso. Nunca aparece em PENDING/PAID (exceto `paidAmountCents` real, que reflete o que o Asaas efetivamente cobrou).
4. **Desconto vem da Enrollment, não é recalculado na tela de cobrança** (RN-08/RN-09): `finalPriceCents` já é o valor com desconto aplicado no momento da emissão; a UI só exibe como contexto informativo, nunca como campo editável nesta spec.
5. **Centavos internos, R$ formatado na tela**: todo campo `*Cents` do banco é convertido pra reais só na camada de apresentação. Nunca fazer aritmética com valores já formatados em string.
6. **BLOCKED e ERROR nunca têm bypass manual que force o envio ao Asaas sem satisfazer a condição** (RN-19 pra BLOCKED; ERROR usa "Reemitir" que tenta de novo, não força).
7. **Isolamento de tenant**: toda tela (lista, detalhe, formulários) opera implicitamente dentro da `unitId` da sessão. Tentar acessar uma Invoice de outra Unit por URL direta retorna 404, nunca vaza dado.

---

## Componentes do Design System a reusar

Nenhum componente novo deve ser criado para as 5 telas deste handoff — o DS Alfabeto em `/Users/rafae/projetos/education-x-mvp/src/components/ui/` já cobre tudo:

| Componente | Arquivo | Uso nesta spec |
|---|---|---|
| Badge | `badge.tsx` | Status de Invoice (PENDING/PAID/OVERDUE/BLOCKED/ERROR/CANCELLED) em C3 e C4 — seção 6 |
| Table | `table.tsx` | Tabela de cobranças em C3 (colunas da seção 1.2) |
| Card | `Card.tsx` | Cards de resumo (valor total em lote, preview de emissão), banner BLOCKED/ERROR em C4 |
| Metric | `Metric.tsx` | Contagem agregada do resultado de lote (emitidas/puladas/bloqueadas/erro — seção 4.3), preview de quantidade (seção 4.2) |
| Dialog | `dialog.tsx` | Confirmação de cancelamento (C4, seção 2.4), confirmação de emissão em lote (seção 4.5), modal de emissão avulsa (seção 3) |
| Toast | `toast.tsx` | Todo feedback de ação: copiar código, reenviar, cancelar, reemitir, sucesso/erro de emissão avulsa e em lote |
| Chip / Segmented | `Chip.tsx` / `segmented.tsx` | Filtro de status e abas "Todas/A vencer/Pagas/Vencidas" em C3 |
| Field / Input | `field.tsx` / `input.tsx` | Campos dos formulários de emissão avulsa e em lote (seções 3.1, 4.1) |
| Popover / Command | `popover.tsx` / `command.tsx` | Select com busca de matéria/Enrollment nos formulários de emissão |
| Icon | `Icon.tsx` | Ícones de alerta (BLOCKED/ERROR), sucesso (PAID), timeline |

---

**Fim do handoff.**

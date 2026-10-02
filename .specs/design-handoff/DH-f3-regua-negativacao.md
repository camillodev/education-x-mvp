# Handoff de Design — Fluxo 045: Régua de Cobrança + Negativação Automática

> **Fonte:** `.specs/mvp-045-regua-negativacao.md` (spec fechada, 2026-07-09)
> **Escopo deste handoff:** campos, estados, regras de negócio visíveis na UI, copy pt-BR — **não visual**. Design System Alfabeto já existe, usar componentes prontos (ver §7).
> **Leitor-alvo:** designer/PM montando telas no Figma/código sobre o DS Alfabeto.
> **Fatia de implementação correspondente:** Fatia 5 (UI) da spec, mais os elementos derivados usados pelas Fatias 2-4 (badge de etapa, timeline).

---

## Como ler este documento

Cada tela tem: **Campos** (tabela) → **Estados** → **Regras de negócio visíveis** → **Copy sugerido pt-BR**. As regras de negócio marcadas com ⚠️ são as que a spec exige que fiquem **visíveis/explícitas na UI** — não é opcional escondê-las atrás de um tooltip genérico.

Vocabulário fixo usado em todo o documento (não traduzir/variar):
- **Régua** = a sequência automática de cobrança (lembrete → aviso 1 → aviso 2 → negativação).
- **Negativação** = inclusão da dívida no SPC/Serasa via Asaas.
- **Pausar régua** = ação por matrícula (Enrollment), bloqueia tudo.
- **Opt-out** = ação por responsável (Guardian), bloqueia só negativação.
- **Baixa** = remoção do registro no SPC/Serasa (automática ao pagar, ou manual).

---

## Tela 1 — Configuração da régua (Settings)

**Rota:** `/dashboard/configuracoes/regua` · **Escopo:** 1 config por Unit (`DunningConfig`).

### Campos

| Campo | Tipo | Obrigatório | Default | Máscara | Validação | Mensagem de erro |
|---|---|---|---|---|---|---|
| Lembrete (dias antes do vencimento) | number input | Sim | `5` | inteiro, sem decimais | > 0 | "Informe um número de dias maior que zero." |
| Primeiro aviso (dias após o vencimento) | number input | Sim | `3` | inteiro | > 0 E < Segundo aviso | "O primeiro aviso deve ser antes do segundo aviso." |
| Segundo aviso (dias após o vencimento) | number input | Sim | `10` | inteiro | > Primeiro aviso E < Negativação | "O segundo aviso deve ficar entre o primeiro aviso e a negativação." |
| Negativação (dias após o vencimento) | number input | Sim | `30` | inteiro | > Segundo aviso | "A negativação deve ocorrer depois do segundo aviso." |
| Régua ativa | toggle | Sim | `true` (ligado) | — | — | — |

**Ordem lógica obrigatória (validação cruzada, bloqueia "Salvar" se violada):**
`0 < Primeiro aviso < Segundo aviso < Negativação`. O campo "Lembrete" é independente (conta dias *antes* do vencimento, não depois) — não entra nessa cadeia, só precisa ser `> 0`.

Validar no blur de cada campo E novamente ao clicar "Salvar" (client-side + resposta do endpoint `POST /api/units/:unitId/dunning-config`, que deve replicar a mesma regra server-side).

### Estados

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton nos 4 inputs + toggle enquanto `GET /api/units/:unitId/dunning-config` resolve |
| Sem config prévia (Unit nova) | Formulário pré-preenchido com os defaults (5/3/10/30, ativa=true) — **não** exibir vazio, pois defaults sempre existem no schema |
| Erro de validação (ordem lógica) | Input(s) envolvidos com borda de erro + mensagem inline abaixo do campo; botão "Salvar" desabilitado até corrigir |
| Salvo com sucesso | Toast de confirmação; se o cron rodar no mesmo dia, a mudança só vale a partir da próxima execução (8h BRT) |
| Régua desativada (`active = false`) | Os 4 campos numéricos ficam com opacidade reduzida (visualmente desabilitados, mas ainda editáveis — desativar não apaga os prazos configurados) |

### Regras de negócio visíveis

- ⚠️ **Ordem lógica é obrigatória e deve ser validada na tela antes de salvar** — não deixar o usuário salvar `warning2 < warning1`, por exemplo (R do schema, seção 4 da spec).
- ⚠️ **Toggle "Régua ativa" desligado = a Unit inteira é pulada pelo cron, nenhuma ação e nenhum log são gerados** (R9). Isso precisa ficar claro no texto de apoio do toggle, não só no nome.
- **Custos são informativos, não editáveis** — bloco somente leitura, não é um formulário.
- Mudança de prazos **não é retroativa**: só afeta o cálculo do cron a partir da próxima execução; invoices que já dispararam uma etapa não "voltam atrás".

### Copy sugerido pt-BR

**Título da página:** "Régua de cobrança"
**Subtítulo:** "Configure os prazos de lembrete, avisos e negativação automática no SPC/Serasa."

**Labels dos campos:**
- "Lembrete — dias antes do vencimento" (helper: "Enviado por WhatsApp/e-mail antes da data de vencimento.")
- "Primeiro aviso — dias após o vencimento" (helper: "Enviado quando a cobrança está em atraso.")
- "Segundo aviso — dias após o vencimento" (helper: "Aviso final antes da negativação.")
- "Negativação automática — dias após o vencimento" (helper: "A partir deste prazo, a dívida é enviada automaticamente ao SPC/Serasa. Não é preciso aprovar nada.")

**Toggle:**
- Label: "Régua ativa"
- Helper (ligado): "A régua está rodando para esta unidade."
- Helper (desligado): "Nenhuma cobrança desta unidade recebe lembrete, aviso ou negativação enquanto a régua estiver desligada."

**Bloco de custos (somente leitura, card informativo):**
- Título: "Custos da régua"
- Linha 1: "WhatsApp / e-mail — R$ 0,55 por mensagem enviada"
- Linha 2: "Negativação — R$ 9,90 por cobrança negativada"
- Nota de rodapé: "Valores cobrados pelo Asaas, repassados por uso."

**Botão:** "Salvar configuração"

**Erros de validação (inline, abaixo do campo):**
- "Informe um número de dias maior que zero."
- "O primeiro aviso deve ser antes do segundo aviso."
- "O segundo aviso deve ficar entre o primeiro aviso e a negativação."
- "A negativação deve ocorrer depois do segundo aviso."

---

## Tela 2 — Coluna/badge de etapa da régua (lista de cobranças)

**Onde aparece:** lista de cobranças (dashboard Módulo 5, F5) — coluna nova "Etapa da régua". Também reaproveitada em qualquer visão de detalhe da cobrança/matrícula.

**Origem do dado:** não é um campo persistido — é derivado por `getReguaEtapa(invoiceId)` (spec §7b), lendo o `DunningLog` mais avançado com `result = "success"`, cruzado com `Invoice.status`.

### Campos (badge)

| Campo | Tipo | Obrigatório | Fonte |
|---|---|---|---|
| Etapa | badge (texto + cor) | Sim (sempre há um valor, mínimo `NONE`) | `getReguaEtapa(invoiceId)` |

### Estados (as 6 etapas)

| Etapa | Variante Badge (DS Alfabeto) | Cor sugerida | O que significa pro usuário |
|---|---|---|---|
| `NONE` | `neutral` | cinza | Nenhuma ação da régua disparada ainda para esta cobrança (nem venceu, ou venceu há pouco tempo) |
| `REMINDED` | `info` | azul claro | Lembrete de pré-vencimento já enviado |
| `WARNED1` | `warning` | amarelo | Primeiro aviso de atraso enviado — cobrança já vencida |
| `WARNED2` | `warning` (ou variante mais forte se DS permitir escala, senão manter `warning`) | laranja* | Aviso final enviado — negativação vai ocorrer em breve se não houver pagamento |
| `NEGATIVATED` | `danger` | vermelho/preto | Dívida já negativada no SPC/Serasa |
| `REGULARIZED` | `success` | verde | Cobrança paga (ou negativação baixada) — régua encerrada com sucesso |

*O componente `badge.tsx` do DS expõe 6 variantes: `success`, `warning`, `danger`, `info`, `primary`, `neutral`. Não há uma 7ª cor nativa para diferenciar `WARNED1` de `WARNED2` — usar `warning` para ambos é aceitável; se for necessário diferenciar visualmente, usar `size` ou o texto do badge ("Aviso 1" vs "Aviso 2") para a distinção, não inventar uma cor fora do DS.

### Regras de negócio visíveis

- ⚠️ **A etapa reflete a régua daquela invoice especificamente** — em matrículas com múltiplas cobranças vencidas, cada linha tem sua própria etapa independente (R16). Não agregar/resumir etapas por matrícula nesta coluna.
- ⚠️ Se `Enrollment.dunningPaused = true`, a etapa fica **congelada** no valor atual (nenhuma nova ação é disparada) — considerar um indicador visual adicional (ex.: ícone de pausa ao lado do badge) para não confundir "parou de avançar" com "não tem mais atraso". Ver Tela 3 para a ação em si.
- `REGULARIZED` cobre dois casos distintos na spec (pagamento direto sem nunca ter sido negativado, e baixa após negativação) — não é preciso diferenciar visualmente os dois casos nesta coluna; o detalhe (Tela 4) explica qual caminho ocorreu.

### Copy sugerido pt-BR

Texto dentro do badge (curto, cabe em lista):
- `NONE` → "—" ou "Sem régua"
- `REMINDED` → "Lembrete enviado"
- `WARNED1` → "Aviso 1"
- `WARNED2` → "Aviso 2"
- `NEGATIVATED` → "Negativada"
- `REGULARIZED` → "Regularizada"

Tooltip ao passar o mouse (opcional, recomendado para `NEGATIVATED` e `WARNED2`):
- `WARNED2`: "Último aviso antes da negativação automática."
- `NEGATIVATED`: "Dívida registrada no SPC/Serasa em [Dunning.requestedAt]."

---

## Tela 3 — Ação "Pausar régua" (por matrícula)

**Onde aparece:** ação rápida na linha da lista de cobranças (ou no detalhe da matrícula/Enrollment) — afeta `Enrollment.dunningPaused`.

### Campos

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Botão/toggle "Pausar régua" | toggle ou botão de ação | Sim | Estado atual reflete `Enrollment.dunningPaused` |
| Confirmação (modal) | dialog com texto de impacto | Sim, sempre que for **ativar** a pausa | Não precisa de confirmação forte para **reverter** (despausar), mas recomenda-se manter o mesmo padrão de dialog por consistência |

### Estados

| Estado | UI |
|---|---|
| Régua ativa (não pausada) | Toggle desligado / botão "Pausar régua" disponível |
| Pausada | Toggle ligado / badge ou selo "Pausada" visível ao lado do nome da matrícula na lista; botão vira "Retomar régua" |
| Confirmando pausa | Modal aberto, ação bloqueada até confirmar ou cancelar |

### Regras de negócio visíveis

- ⚠️ **Pausa bloqueia TUDO, não só negativação** — nem lembrete, nem aviso 1, nem aviso 2, nem negativação são disparados para nenhuma invoice dessa matrícula enquanto pausada (R7). Isso é a regra mais importante desta tela e precisa estar explícita no texto do modal — é o erro mais fácil de um usuário cometer (achar que só "trava a negativação").
- ⚠️ Pausa é **por matrícula (Enrollment)**, não por cobrança individual — afeta todas as invoices passadas e futuras dessa matrícula (decisão fechada #4 da spec). O modal deve deixar claro que é abrangente, não pontual.
- Reverter a pausa é uma ação simples (toggle de volta) — não precisa de confirmação com o mesmo peso, mas deve deixar claro que a régua **retoma do ponto em que já estava** (não reenvia lembretes/avisos já disparados antes da pausa, por causa da idempotência do `DunningLog`).

### Copy sugerido pt-BR

**Botão (estado ativo, ação disponível):** "Pausar régua"
**Botão (estado pausado):** "Retomar régua"

**Modal de confirmação (ao pausar):**
- Título: "Pausar régua para [Nome do aluno]?"
- Corpo: "Enquanto a régua estiver pausada, **nenhuma cobrança desta matrícula** vai receber lembrete, aviso de atraso ou negativação automática — mesmo que já esteja vencida. A pausa vale para todas as cobranças, atuais e futuras."
- Botão primário: "Pausar régua"
- Botão secundário: "Cancelar"

**Modal de confirmação (ao retomar, opcional mas recomendado):**
- Título: "Retomar régua para [Nome do aluno]?"
- Corpo: "A régua volta a rodar normalmente a partir da próxima execução diária. Lembretes e avisos já enviados antes da pausa não são repetidos."
- Botão primário: "Retomar régua"
- Botão secundário: "Cancelar"

**Indicador na lista (matrícula pausada):** badge secundário "Régua pausada" (variante `neutral` com ícone de pausa) ao lado do badge de etapa (Tela 2) — os dois convivem na mesma linha.

---

## Tela 4 — Painel de negativação (detalhe)

**Onde aparece:** detalhe da cobrança quando `Invoice.status = NEGATIVATED` (ou já foi `REGULARIZED` a partir de uma negativação) — mostra os dados do `Dunning` 1:1 com a Invoice.

### Campos

| Campo | Tipo | Obrigatório (exibição) | Fonte | Formatação |
|---|---|---|---|---|
| ID da negativação (Asaas) | texto | Sim, quando existe | `Dunning.asaasDunningId` | monoespaçado, copiável |
| Valor negativado | moeda | Sim | `Dunning.valueCents` | `R$ X.XXX,XX` (centavos → reais) |
| Taxa de negativação | moeda | Sim | `Dunning.feeCents` | `R$ X,XX` (tipicamente R$ 9,90, mas exibir o valor real persistido, não hardcoded) |
| Data da solicitação | data | Sim | `Dunning.requestedAt` | `DD/MM/AAAA` |
| Data do aviso CDC | data | Sim, se disponível | `Dunning.warningSentAt` | `DD/MM/AAAA`; se nulo, exibir "Aguardando confirmação do Asaas" |
| Data da baixa | data | Só quando `status = REGULARIZED` | `Dunning.resolvedAt` | `DD/MM/AAAA` |
| Status da negativação | badge | Sim | `Dunning.status` (`NEGATIVATED` / `REGULARIZED`) | ver mapeamento de cor na Tela 2 |
| Origem da negativação | texto | Sim | `Dunning.actorId` | `null` → "Automática (régua)"; preenchido → nome do operador |
| Timeline de eventos | lista cronológica | Sim | `DunningLog` filtrado por `invoiceId`, ordenado por `createdAt` | ver Tela 6 (reaproveita o mesmo componente) |
| Ação "Solicitar baixa manual" | botão | Condicional | Visível somente quando `status = NEGATIVATED` e a invoice **ainda não foi paga** | — |

### Estados

| Estado | UI |
|---|---|
| `Dunning.status = NEGATIVATED`, aguardando confirmação Asaas (`Dunning.asaasDunningId` existe mas sem confirmação `CONFIRMED` há < 1h) | Badge "Negativada" + selo "Confirmando com o Asaas..." |
| `Dunning.status = NEGATIVATED`, confirmado | Badge "Negativada" cheio, todos os campos preenchidos, botão "Solicitar baixa manual" disponível |
| `Dunning.status = REGULARIZED` (baixa automática, pagamento recebido) | Badge "Regularizada", `resolvedAt` preenchido, ação de baixa manual escondida, timeline mostra o evento `CANCELLATION` com origem "automática (pagamento recebido)" |
| `Dunning.status = REGULARIZED` (baixa manual solicitada) | Idêntico ao acima, mas o log `CANCELLATION` tem `actorId` preenchido |
| Falha ao solicitar baixa manual | Toast de erro; `Dunning.status` permanece `NEGATIVATED`; log `CANCELLATION` com `result: "error: ..."` some da timeline como sucesso — aparece como tentativa falha (ver Tela 6) |

### Regras de negócio visíveis

- ⚠️ **Não existe botão "Negativar agora"** — a negativação é 100% automática via cron em D+30 (ou o prazo configurado). Este painel só existe **depois** que a negativação já ocorreu; não deve haver nenhuma ação nesta tela que force uma negativação manual antecipada (decisão fechada #2 da spec — diverge da versão antiga que tinha esse botão).
- ⚠️ **"Solicitar baixa manual" é a única ação manual disponível aqui.** Ela existe para os casos em que o pagamento foi registrado por fora do fluxo automático (ex.: erro de webhook) ou a escola precisa reverter uma negativação por decisão administrativa — mas o caminho padrão é a baixa automática ao receber `PAYMENT_RECEIVED` (R17). O botão deve deixar claro que é um fallback, não o caminho principal.
- Taxa exibida (`feeCents`) é **sempre o valor real retornado pelo Asaas na resposta**, não um valor fixo hardcoded na tela — mesmo que na prática seja quase sempre R$ 9,90.
- `actorId = null` deve ser comunicado de forma neutra ("Automática — régua"), não como ausência de dado.

### Copy sugerido pt-BR

**Título do painel:** "Negativação SPC/Serasa"

**Labels dos campos:**
- "ID da negativação (Asaas)"
- "Valor negativado"
- "Taxa de negativação"
- "Solicitada em"
- "Aviso legal enviado em" (CDC, art. 43)
- "Baixa em" (só quando aplicável)
- "Origem" → "Automática (régua)" ou "Manual — por [Nome do operador]"

**Estado "aguardando confirmação":**
"Negativação enviada ao Asaas, aguardando confirmação..."

**Botão de ação:**
"Solicitar baixa manual"

**Modal de confirmação da baixa manual:**
- Título: "Solicitar baixa desta negativação?"
- Corpo: "Isso remove a cobrança do SPC/Serasa. Use esta opção apenas se o pagamento já foi confirmado por outro meio — o caminho padrão é a baixa automática, que ocorre assim que o pagamento é registrado no sistema."
- Botão primário: "Solicitar baixa"
- Botão secundário: "Cancelar"

**Toast de sucesso:** "Baixa solicitada com sucesso. A cobrança foi regularizada."
**Toast de erro:** "Não foi possível solicitar a baixa agora. Tente novamente ou aguarde o próximo ciclo automático."

---

## Tela 5 — Opt-out do responsável (Guardian)

**Onde aparece:** detalhe do Guardian (responsável financeiro) — ação que seta `Guardian.dunningOptOut = true`. Afeta **todas** as invoices de **todas** as matrículas vinculadas àquele responsável.

### Campos

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Toggle/botão "Nunca negativar este responsável" | toggle | Sim | Reflete `Guardian.dunningOptOut` |
| Confirmação forte (modal) | dialog reforçado (não é um confirm simples) | Sim, ao **ativar** | Ação sensível — precisa de fricção deliberada |
| Reversão | ação disponível a qualquer momento | Sim | "Reverter opt-out" — sem a mesma fricção da ativação, mas deve deixar claro que volta ao comportamento padrão |

### Estados

| Estado | UI |
|---|---|
| Opt-out desligado (padrão) | Toggle desligado, texto "Este responsável pode ser negativado conforme a régua normal" |
| Opt-out ligado | Toggle ligado + badge permanente "Nunca negativar" no perfil do Guardian, visível em qualquer tela onde o responsável apareça (não só aqui) |
| Confirmando ativação | Modal com texto de impacto forte, exige ação explícita (não é um simples `window.confirm`) |

### Regras de negócio visíveis

- ⚠️ **Opt-out bloqueia SÓ a negativação — lembrete, aviso 1 e aviso 2 continuam sendo enviados normalmente** (R8). Este é o erro mais fácil de cometer na leitura da UI: opt-out não é "silenciar o responsável", é "nunca levar ao SPC/Serasa". O modal e o texto de apoio do toggle precisam deixar isso inequívoco.
- ⚠️ **É "permanente até reverter manualmente"** — não expira, não é por cobrança, não é por matrícula. Cobre automaticamente qualquer matrícula nova que esse Guardian venha a ter no futuro (é um campo do Guardian, não da Invoice/Enrollment — decisão fechada #5 da spec).
- ⚠️ **A confirmação precisa ser "forte"** (conforme pedido do usuário) — não um dialog padrão de "tem certeza?". Sugestão de padrão de fricção: exigir que o operador digite o nome do responsável ou marque um checkbox adicional de "Entendo que os avisos continuam sendo enviados" antes de habilitar o botão de confirmar — usar o `dialog.tsx` do DS com esse padrão de dupla confirmação.
- Reverter o opt-out (desligar) não precisa da mesma fricção — é o caminho de "voltar ao normal", deve ser fácil de fazer quando o responsável pede.

### Copy sugerido pt-BR

**Label do toggle:** "Nunca negativar este responsável"
**Helper (desligado):** "Este responsável segue a régua normal: lembretes, avisos e negativação automática."
**Helper (ligado):** "Este responsável nunca terá dívidas enviadas ao SPC/Serasa. Avisos de cobrança continuam sendo enviados normalmente."

**Modal de confirmação forte (ao ativar):**
- Título: "Marcar [Nome do responsável] como opt-out de negativação?"
- Corpo: "A partir de agora, **nenhuma cobrança deste responsável será enviada ao SPC/Serasa**, em nenhuma matrícula — atual ou futura. Essa configuração é permanente até que alguém a reverta manualmente aqui mesmo. **Lembretes e avisos de cobrança continuam sendo enviados normalmente** — o opt-out afeta apenas a negativação."
- Checkbox de dupla confirmação: "Entendo que esta é uma configuração permanente e afeta todas as matrículas deste responsável."
- Botão primário (desabilitado até marcar o checkbox): "Confirmar opt-out"
- Botão secundário: "Cancelar"

**Modal de reversão:**
- Título: "Reverter opt-out de [Nome do responsável]?"
- Corpo: "Este responsável volta a seguir a régua normal, incluindo negativação automática em caso de atraso prolongado."
- Botão primário: "Reverter opt-out"
- Botão secundário: "Cancelar"

**Badge permanente no perfil (quando ativo):** "Nunca negativar" (variante `neutral` ou `primary` — evitar `danger`, pois não é um estado de alerta sobre o responsável, é uma preferência configurada)

**Toast de sucesso:** "Opt-out ativado. As cobranças deste responsável nunca serão negativadas."

---

## Tela 6 — Histórico/log (DunningLog) por cobrança

**Onde aparece:** dentro do detalhe da cobrança (pode ser a mesma seção da Tela 4 quando a invoice está negativada, ou uma seção "Histórico da régua" independente para qualquer invoice, negativada ou não).

### Campos (por linha da timeline)

| Campo | Tipo | Obrigatório | Fonte | Formatação |
|---|---|---|---|---|
| Ação | texto/ícone | Sim | `DunningLog.action` | ver mapeamento abaixo |
| Data/hora | timestamp | Sim | `DunningLog.createdAt` | `DD/MM/AAAA às HH:mm` |
| Resultado | texto/ícone de status | Sim | `DunningLog.result` | "Sucesso" (verde) ou "Erro: [mensagem]" (vermelho) |

### Mapeamento de `DunningAction` → texto da timeline

| `action` | Texto na timeline |
|---|---|
| `REMINDER` | "Lembrete de vencimento enviado" |
| `WARNING1` | "Primeiro aviso de atraso enviado" |
| `WARNING2` | "Segundo aviso (final) enviado" |
| `NEGATIVATION` | "Negativação solicitada ao Asaas" |
| `CANCELLATION` | "Baixa da negativação solicitada" |

### Estados

| Estado | UI |
|---|---|
| Sem nenhum log ainda | Estado vazio: "Nenhuma ação da régua registrada para esta cobrança ainda." |
| Log(s) com sucesso | Item da timeline com ícone de sucesso (check verde) |
| Log com erro | Item da timeline com ícone de alerta (vermelho) + texto do erro (sem PII, conforme a spec — a mensagem já vem tratada do backend) |
| Múltiplas tentativas da mesma ação (1 erro + depois 1 sucesso) | **Mostrar todas as entradas na ordem cronológica**, não colapsar — a auditoria exige ver a tentativa que falhou e a que funcionou (decisão fechada #7 da spec: idempotência é regra de negócio, não constraint de banco, exatamente para permitir reprocessamento visível) |

### Regras de negócio visíveis

- ⚠️ **Uma mesma `action` pode aparecer mais de uma vez na timeline** se a primeira tentativa falhou e foi reprocessada no cron seguinte — isso é esperado e não é um bug de exibição. Não deduplicar, não esconder tentativas com erro.
- ⚠️ **A etapa "vencedora" (a que conta para o badge da Tela 2) é sempre a mais avançada com `result = "success"`** — se houver `WARNING2` com erro seguido de `WARNING2` com sucesso, a etapa exibida no badge é `WARNED2`, mas a timeline mostra as duas tentativas.
- Ordenação: cronológica, mais recente no topo (padrão de timeline/log).

### Copy sugerido pt-BR

**Título da seção:** "Histórico da régua"

**Item de sucesso (exemplo):** "Primeiro aviso de atraso enviado — 12/06/2026 às 08:03 · Sucesso"
**Item de erro (exemplo):** "Negativação solicitada ao Asaas — 15/06/2026 às 08:04 · Erro: falha de comunicação com o Asaas"
**Estado vazio:** "Nenhuma ação da régua registrada para esta cobrança ainda."

---

## Resumo das regras de negócio que precisam estar visíveis na UI (checklist)

| # | Regra | Tela(s) onde precisa aparecer |
|---|---|---|
| 1 | Pausa bloqueia TUDO (nem lembrete, nem avisos, nem negativação) | Tela 3 (modal de confirmação) |
| 2 | Opt-out bloqueia SÓ negativação (avisos continuam) | Tela 5 (helper + modal) |
| 3 | Negativação é automática no cron D+30 — não existe botão "negativar agora" | Tela 4 (ausência deliberada do botão) |
| 4 | Baixa é automática ao pagar, mas pode ser manual (fallback) | Tela 4 (botão "Solicitar baixa manual" com copy de fallback) |
| 5 | Idempotência — nunca a mesma etapa disparada 2x com sucesso pra mesma invoice; falhas são reprocessadas e ficam visíveis | Tela 6 (timeline não deduplica) |
| 6 | Ordem lógica dos prazos (reminder independente; warning1 < warning2 < negativation) | Tela 1 (validação inline) |
| 7 | Pausa é por matrícula (afeta todas as invoices, passadas e futuras) | Tela 3 (copy do modal) |
| 8 | Opt-out é por responsável (afeta todas as matrículas, permanente) | Tela 5 (copy do modal + badge permanente) |
| 9 | Régua desligada na Unit = zero ação, zero log | Tela 1 (helper do toggle) |

---

## Componentes do Design System a reusar

Todos em `/Users/rafae/projetos/education-x-mvp/src/components/ui/`:

- **`badge.tsx`** — badge de etapa da régua (Tela 2) e badge de status da negativação (Tela 4). Variantes disponíveis: `success`, `warning`, `danger`, `info`, `primary`, `neutral` — usar o mapeamento de cores da Tela 2. Também serve para o selo permanente "Nunca negativar" (Tela 5) e o selo "Régua pausada" (Tela 3).
- **`toggle.tsx`** — toggle "Régua ativa" (Tela 1), toggle/ação "Pausar régua" (Tela 3), toggle "Nunca negativar este responsável" (Tela 5). Props: `checked`, `onChange`, `disabled`.
- **`field.tsx` + `input.tsx`** — os 4 campos numéricos do formulário de configuração da régua (Tela 1), com label + helper + mensagem de erro inline.
- **`dialog.tsx`** — todos os modais de confirmação: pausa (Tela 3), opt-out com dupla confirmação (Tela 5), solicitar baixa manual (Tela 4). Para o opt-out, usar o padrão de dialog com checkbox adicional bloqueando o botão primário até marcado.
- **`Card.tsx`** — bloco de "Escala de custos" somente leitura (Tela 1), painel de dados da negativação (Tela 4), container da timeline de histórico (Tela 6).
- **`table.tsx`** — se a timeline de histórico (Tela 6) for renderizada como lista tabular em vez de timeline vertical, usar este componente para as colunas Ação/Data/Resultado.
- **`toast.tsx`** — confirmações de sucesso/erro em todas as ações (salvar config, pausar, opt-out, baixa manual).

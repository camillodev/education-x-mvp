# Design Handoff — Portal do Responsável (mobile)

> **Fase:** Fatia 5 (F4) · **Persona:** responsável (pai/mãe/guardião) · **Não é a dona da escola.**
> **Spec-fonte:** [`f2-02-portal-responsavel.md`](../f2-02-portal-responsavel.md) — fonte de verdade dos campos e regras. Este handoff não redefine nada, só traduz a spec em decisões de tela.
> **DS:** Alfabeto — já existe e pronto. Este documento **não é sobre visual** (cor de marca, tipografia, espaçamento já resolvidos no DS). É sobre **campos, estados e regras de negócio visíveis na tela**.
> **Viewport:** mobile-first, 375px de referência (iPhone SE / Playwright `--project=mobile`). O portal roda **dentro do navegador in-app do WhatsApp** — sem barra de endereço, sem extensões, engine mais limitada que Safari/Chrome padrão. Testar leitura de QR Code e clipboard nesse contexto especificamente.
> **Idioma:** pt-BR, tom institucional-acolhedor (escola falando com a família — não é fintech, não é cobrança agressiva).

---

## Como usar este handoff

1. As 7 telas abaixo cobrem os 5 itens do DoD + auxiliares (`historico`, `notif`) + estados que o design precisa prever (`cardOk`, link inválido).
2. Cada tela tem: **Campos** (tabela), **Estados**, **Regras de negócio visíveis**, **Copy sugerido**.
3. Onde a spec já define a string exata (mensagens de erro, avisos legais/fiscais), o copy é **verbatim** — não parafrasear, principalmente RN-01a (LGPD) e RN-09 (taxa cartão).
4. Gap de Design System encontrado durante este handoff está documentado na seção final — **ação necessária antes de implementar os badges**.

---

## 0. Nota de débito técnico — DT-01 (contexto, não é decisão de design)

A spec mantém **magic link** (link único por e-mail/WhatsApp) como auth desta fatia. O PRD original (M4) pede **CPF + código OTP por SMS**, mas o provedor de SMS ainda não foi escolhido — isso é debito técnico registrado (DT-01), não bloqueia esta fatia. Consequência prática pro design: **não há tela de "digitar CPF" nem "digitar código de 6 dígitos"** nesta versão. O responsável entra direto pelo link. Quando a migração acontecer (fatia futura), essas duas telas precisarão ser desenhadas — não fazer isso agora.

---

## 1. Home / Link expirado (validação do magic link)

Tela de entrada. Renderiza **antes** de qualquer dado do portal — é o gate.

### Campos

| Campo | Fonte | Exibido? |
|---|---|---|
| Token da URL (`?token={t}`) | Querystring | Não (uso interno) |
| — | — | Nenhum campo de formulário nesta tela. Não há input de CPF/código (ver DT-01). |

### Estados

| Estado | Condição | O que a tela mostra |
|---|---|---|
| **Validando** | Token está sendo checado no servidor | Loading simples (spinner/skeleton) — deve ser rápido, é 1 query |
| **Válido** | `PortalSession.token = t`, `expiresAt > now()`, `usedAt IS NULL` | Redireciona direto para Home (lista de cobranças) — **não existe tela de sucesso intermediária** |
| **Inválido/expirado/usado/inexistente** | Qualquer uma das 4 falhas | Tela de erro genérica (única, ver RN-01a abaixo) |

### Regras de negócio visíveis

- **RN-01a (LGPD — crítica):** a mensagem de erro é **sempre a mesma**, independente do motivo real (token não existe, expirou, já foi usado, ou o `guardianId` associado não existe mais). O sistema **nunca revela se o cadastro existe** — isso previne enumeração de contas por terceiros que tentem adivinhar tokens.
  - **Não usar** a variação "Link expirado — solicite um novo link à escola" (essa string aparece em RN-01 mas foi **substituída** pela versão genérica de RN-01a — RN-01a é a que vale, está marcada como requisito PRD/LGPD).
  - **Não diferenciar visualmente, por tempo de resposta ou por copy** os 4 casos. Design deve garantir uma única tela para todos.
- Não há CTA de "tentar de novo" com input — a única saída é contatar a escola (fora do portal, por telefone/WhatsApp já conhecido da família).
- Sessão, quando válida: magic link dura **7 dias** até ser clicado (`PortalSession.expiresAt`); depois de clicado e autenticado, o cookie de sessão dura **24 horas** (ver regra completa na seção "Sessão" mais abaixo). São dois prazos diferentes — não confundir na tela.

### Copy sugerido

**Título:** Link inválido ou expirado

**Corpo (texto verbatim — RN-01a):**
> Link inválido ou expirado — contate a escola.

**Sem botão de ação primário.** Opcional: exibir nome/telefone/WhatsApp da unidade se esse dado estiver disponível no momento do erro (avaliar com engenharia — a spec não garante que a Unit seja resolvível quando o token é totalmente inválido; se não for possível, omitir).

---

## 2. Home (lista de cobranças)

Tela principal pós-autenticação. Layout de referência: `prototipo/design-handoff/project/app/screens-e.jsx` (tela `home`) — spec autoriza usar como referência de UX, mas **campos vêm da spec, não do protótipo**.

### Campos

| Campo | Fonte | Formato de exibição |
|---|---|---|
| Nome do responsável | `Guardian.name` (via sessão) | "Olá, Maria" |
| Nome do aluno | `Student.name`, fallback `Guardian.name` (D-08) | "João Silva" |
| Nome da unidade | `Unit.name` | "Kumon Camargos" |
| Contagem de notificações não lidas | Derivado em runtime (D-13) | Badge numérico no ícone de sino |
| Lista de cobranças | `Invoice[]` do Guardian via Enrollment, `status IN (PENDING, OVERDUE, PAID)` da Unit atual (RN-02) | Cards, ordenados por vencimento |
| Descrição de cada cobrança | `Subject.name + " — " + referenceMonth` (D-05 — nunca editável pelo responsável) | "Matemática — Julho/2026" |
| Valor de cada cobrança | `Invoice.netAmountCents / 100` | R$ 464,55 |
| Vencimento | `Invoice.dueDate` | DD/MM |
| Status/badge | `Invoice.status` (ver cores abaixo) | Badge colorido |
| Estado do cartão | `CardToken.isActive`, `CardToken.last4` | "•••• 4242 · Pagamento automático ativo" ou "Cadastrar cartão" |
| Banner de negativação | Existe `Invoice.status = NEGATIVATED` para qualquer invoice do Guardian (RN-12) | Card vermelho no topo |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Vazio** | Guardian sem nenhuma Invoice | "Nenhuma cobrança no momento." (sem próxima cobrança nem histórico) |
| **Com próxima cobrança** | Existe Invoice `PENDING` | Card destacado "Próxima cobrança" com botão "Pagar agora" |
| **Com cobrança vencida** | Existe Invoice `OVERDUE` | Card com badge vermelho, CTA leva pra tela "Quitar vencido" |
| **Negativado** | Existe Invoice `NEGATIVATED` | Banner vermelho fixo no topo, **além** do card normal da cobrança (badge preto) |
| **Cadastro incompleto** | `Guardian.asaasCustomerId IS NULL` | Opção de cartão oculta; aviso "Cadastro incompleto — contate a escola" no lugar do card de cartão (RN-15) |

### Regras de negócio visíveis

- **RN-12a (cores de badge — obrigatório, PRD):**
  - `PAID` → **verde**
  - `PENDING` (a vencer) → **azul**
  - `OVERDUE` → **vermelho**
  - `NEGATIVATED` → **preto**
  - Vale em **todos** os pontos do portal que exibem badge (home, histórico, detail) — consistência entre telas é obrigatória.
- **RN-02:** só aparecem invoices da Unit correspondente à sessão atual — se o mesmo responsável tem filhos em unidades diferentes, cada acesso ao portal (cada magic link) é escopado a **uma** Unit só. Não há seletor de unidade nesta versão.
- **RN-12:** banner de negativação aparece se **qualquer** invoice do Guardian está `NEGATIVATED`, mesmo que a home esteja mostrando outras invoices normais.
- **RN-05:** se `Invoice.asaasPaymentId IS NULL` (cobrança ainda não processada no Asaas), o botão "Pagar agora" fica desabilitado com tooltip/texto explicativo — não deixar o botão simplesmente sumir, o responsável precisa entender que é temporário.
- Ordenação: por vencimento (mais próximo primeiro) para PENDING/OVERDUE.

### Copy sugerido

- Saudação: **"Olá, {Guardian.name}"**
- Subtítulo: **"{Student.name} · {Unit.name}"**
- Banner negativação: **"Risco de negativação — Mensalidade de {mês} vencida há {N} dias. Regularize até {data} para evitar SPC/Serasa."** CTA: **"Quitar e regularizar"**
- Card próxima cobrança: título da matéria + valor + **"Vence em {DD/MM}"** + botão **"Pagar agora"**
- Card cartão ativo: **"•••• {last4} · Pagamento automático ativo"** + link **"Remover"**
- Card sem cartão: **"Cadastrar cartão"**
- Cobrança sem `asaasPaymentId`: **"Cobrança ainda sendo processada — tente em alguns minutos"** (botão desabilitado)
- Cadastro incompleto (sem `asaasCustomerId`): **"Cadastro incompleto — contate a escola"**
- Link para histórico: **"Ver histórico"**

---

## 3. Pagar (Invoice PENDING) — PIX

QR PIX + copia-e-cola. Chamado on-demand — **não** é dado pré-carregado na home.

### Campos

| Campo | Fonte | Exibição |
|---|---|---|
| Valor a pagar | `Invoice.netAmountCents / 100` | Destaque grande, topo |
| QR Code | `GET /payments/{asaasPaymentId}/pixQrCode` → `encodedImage` (base64 PNG) | `<img src="data:image/png;base64,...">` |
| Código copia-e-cola | Mesmo endpoint → `payload` (string EMV) | Bloco de texto + botão copiar |
| Expiração do QR | Mesmo endpoint → `expirationDate` (ISO 8601) | Não necessariamente exibida como contador — ver nota abaixo |
| Botão de confirmação manual | — | "Já paguei" |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Carregando QR** | Chamada à API em andamento | Skeleton no lugar do QR |
| **QR disponível** | Resposta OK do Asaas | QR + payload exibidos normalmente |
| **QR/cobrança expirada** | Endpoint Asaas retorna erro (D-12) | Substituir QR por mensagem de erro — ver copy abaixo. **Reemissão automática está fora de escopo desta fatia** (fica pro fluxo 03) |
| **Aguardando confirmação** | Responsável clicou "Já paguei" | Texto "Confirmando..." — **não muda o status da Invoice localmente nem otimisticamente** |
| **Copiado** | Clicou em copiar código | Ícone muda para check, feedback visual momentâneo (toast ou inline) |

### Regras de negócio visíveis (críticas — envolvem dinheiro)

- **RN-04 + D-03:** o QR é buscado **sempre que a tela abre** — não é cacheado no cliente entre sessões. Se o responsável sair e voltar, busca de novo. (Servidor pode cachear até 5 min — invisível pro design.)
- **RN-06 + D-04 (importante para o fluxo visual):** clicar **"Já paguei" NUNCA marca a Invoice como paga imediatamente.** O botão só troca pro estado "Confirmando pagamento...". O status real só muda quando o webhook do Asaas confirma (processo assíncrono, pode levar de segundos a minutos). **Não desenhar uma tela de "Pago!" disparada pelo clique do botão** — isso seria uma mentira visual. Se quiser dar sensação de progresso, usar linguagem de expectativa ("a confirmação é automática"), nunca afirmar que já foi pago.
- **D-12 (QR expirado — tratamento gracioso obrigatório):** se a chamada à Asaas falhar (cobrança expirada no lado deles), a tela **não pode quebrar ou mostrar erro técnico**. Precisa cair numa mensagem amigável e acionável.
- Não há prazo de expiração de sessão a countdown nesta tela especificamente — ver seção "Sessão" no fim deste documento para a lógica de 24h.

### Copy sugerido

- Botão copiar: **"Copiar código PIX"**
- Após copiar: ícone check (sem necessidade de texto extra, ou "Copiado!" como toast)
- Botão confirmação: **"Já paguei"**
- Estado aguardando: **"Confirmando..."**
- Texto de apoio abaixo do botão: **"A confirmação é automática em segundos."**
- **QR/cobrança expirada (texto verbatim — D-12):** **"Cobrança expirada — contate a escola."**

---

## 4. Quitar vencido (Invoice OVERDUE)

Só PIX nesta versão (D-11 — cartão para boleto vencido é melhoria futura, fora de escopo).

### Campos — breakdown obrigatório

| Campo | Fórmula | Formato |
|---|---|---|
| Valor original | `Invoice.netAmountCents / 100` | R$ 450,00 |
| Multa | `round(netAmountCents * (lateFeePercent / 10000)) / 100` — `lateFeePercent` em basis points, **2% no exemplo padrão** | R$ 9,00 |
| Juros | `round(netAmountCents * (monthlyInterestBp / 10000) * diasAtraso / 30) / 100` — pro rata por dia, **1% a.m. no exemplo padrão** | R$ 4,50 |
| **Total a pagar** | Original + Multa + Juros | **R$ 463,50** (destaque, maior que os demais) |
| Dias em atraso | `hoje - Invoice.dueDate` | Usado no cálculo de juros; pode ser exibido como contexto ("vencida há N dias") |

**Nota de implementação pro designer:** os percentuais de multa/juros **não são fixos** — vêm de `BillingConfig` por unidade (`lateFeePercent`, `monthlyInterestBp`). "2%" e "1% a.m." são os valores de exemplo/padrão da spec, mas a tela precisa renderizar o percentual real configurado pela escola, não hardcodar "2%" e "1%" no texto — usar o valor calculado dinamicamente no label também (ex: "Multa ({X}%)").

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Breakdown calculado** | Padrão | 4 linhas: original / multa / juros / total |
| **Indo pagar** | Clica CTA primário | Vai para a tela "Pagar" (seção 3), reaproveitando o mesmo componente de QR PIX — o valor levado é o **total atualizado**, não o original |
| **Já paguei** | Clica CTA secundário | Mesmíssima lógica de D-04 — aguarda webhook, não confirma na hora |

### Regras de negócio visíveis

- **RN-03:** cálculo do total é sempre original + multa + juros — nunca omitir uma das três linhas, mesmo que multa ou juros deem R$ 0,00 (transparência).
- **D-11:** **não oferecer opção de cartão nesta tela.** Só PIX. Se o designer olhar o protótipo de referência e ele mostrar cartão aqui, é divergência — a spec vence.
- Regularização é automática: ao confirmar o pagamento (via webhook), a negativação (se houver) é cancelada automaticamente — vale comunicar isso como tranquilizador na tela, não como algo que o responsável precisa fazer manualmente depois.

### Copy sugerido

- Título: **"Valor atualizado"** (em vermelho/destaque de atenção, não pânico)
- Linhas do breakdown: **"Valor original"**, **"Multa ({X}%)"**, **"Juros ({Y}% a.m.)"**, **"Total a pagar"**
- Card informativo: **"Ao quitar, sua situação é regularizada na hora e a negativação é cancelada automaticamente."**
- CTA primário: **"Pagar com PIX"**
- CTA secundário: **"Já paguei o boleto"**

---

## 5. Cadastrar cartão (PCI)

Formulário de cartão. **Ponto mais sensível de todo o portal em termos de compliance** — ler a nota PCI abaixo antes de desenhar qualquer interação.

### ⚠️ Nota PCI para o designer (por que a UI não pode "salvar rascunho")

Número do cartão, CVV e validade completa **nunca tocam nosso banco de dados**. Eles trafegam do formulário para o nosso servidor e do servidor direto para o Asaas (tokenização), e são **descartados da memória imediatamente depois da chamada**. O único dado persistido é um token opaco (`CardToken.asaasCardToken`) + `last4` + `brand`.

**Implicações diretas pro design:**
- **Não pode haver "salvar como rascunho" ou autosave desse formulário** — não existe onde guardar um número de cartão parcialmente digitado.
- **Não pode haver preenchimento automático a partir de sessão anterior** (nenhum campo de cartão é reidratado — o form sempre nasce vazio).
- **Se o usuário sair da tela no meio do preenchimento, os dados simplesmente somem** — não é bug, é a garantia de compliance funcionando. Pode ser útil um aviso leve tipo "não feche esta tela durante o pagamento", mas não é obrigatório pela spec.
- Nenhum campo de cartão deve ter `autocomplete` que persista no navegador de forma a sugerir preenchimento indevido em contexto errado (validar com engenharia os atributos HTML corretos — fora do escopo deste handoff, mas o design não deve *impedir* que engenharia aplique `autocomplete="cc-number"` etc. de forma segura).

### Campos

| Campo | Obrigatório | Validação de UI | Observação |
|---|---|---|---|
| Número do cartão | Sim | Formato cartão (agrupado de 4 em 4), Luhn se possível no client | Nunca persiste |
| Nome no cartão | Sim | Texto livre, maiúsculas sugeridas | Vai para `creditCard.holderName` |
| Validade (MM/AA) | Sim | MM 01-12, AA não pode ser passado | Nunca persiste completo |
| CVV | Sim | 3-4 dígitos | Nunca persiste |
| Checkbox de aceite | Sim | Bloqueia botão "Salvar cartão" até marcado | Ver copy exato abaixo |

**Nota:** CPF e e-mail do titular (`creditCardHolderInfo.cpfCnpj`, `.email`) **não são coletados nesta tela** — já existem em `Guardian.cpfEnc`/e-mail do cadastro (fluxo 02) e são descriptografados no servidor na hora da chamada ao Asaas. **Não desenhar campos de CPF/e-mail aqui** — seria coleta duplicada e desnecessária.

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Vazio (padrão)** | Sem cartão cadastrado | Formulário + mock visual decorativo do cartão (o mock **não reflete dado real** — é só ilustrativo) |
| **Preenchendo** | Campos sendo digitados | Mock visual pode espelhar nome/últimos dígitos digitados (decorativo, client-side apenas, nunca enviado) |
| **Checkbox não marcado** | Aceite pendente | Botão "Salvar cartão" desabilitado |
| **Salvando** | Após clicar "Salvar cartão" | Loading — chamada ao servidor → Asaas |
| **Sucesso** | Token retornado (RN-07) | Vai para tela "Cartão cadastrado" (seção 5b abaixo) |
| **Erro Asaas** | Tokenização falhou (cartão inválido, recusado, etc.) | Mensagem de erro, mantém no formulário para nova tentativa (mas campos sensíveis não são reaproveitados — usuário digita de novo) |
| **Cartão já ativo** | `CardToken.isActive = true` existe | Não mostra formulário — mostra estado "cartão ativo" (ver abaixo) |

### Estado alternativo: "cartão ativo" (quando já existe CardToken)

| Campo | Fonte |
|---|---|
| Últimos 4 dígitos | `CardToken.last4` |
| Bandeira (se disponível) | `CardToken.brand` |
| Botão remover | Aciona RN-11 |

**RN-11 (remover):** ação é só local (`CardToken.isActive = false`) — não há chamada ao Asaas. Do ponto de vista de UX, a remoção deve ser **instantânea** (sem loading longo) porque não depende de rede externa. Depois de remover, a tela volta ao estado "Cadastrar cartão" (formulário vazio).

### Regras de negócio visíveis

- **RN-08:** se `BillingConfig.acceptsCard = false` para a unidade, **a opção de cadastrar cartão inteira fica oculta** no portal — nem aparece o card "Cadastrar cartão" na home, nem essa tela é acessível. Não é "desabilitada com aviso" — é ausente.
- **RN-09 / aviso de taxa (texto completo, verbatim — usar a versão completa desta tela, não a versão curta de RN-09):**
  - Só exibir se `BillingConfig.cardFeePayer = RESPONSAVEL`.
  - Se `cardFeePayer` for da escola (ela absorve a taxa), **não exibir aviso nenhum**.
- **RN-15:** se `Guardian.asaasCustomerId IS NULL`, esta tela inteira não deve ser alcançável — a home já bloqueia a entrada com "Cadastro incompleto — contate a escola".
- Checkbox de consentimento é **obrigatório e bloqueante** — não é um "aceito termos" de rodapé ignorável, é parte do fluxo de autorização de cobrança recorrente.

### Copy sugerido

- Título: **"Cadastrar cartão"**
- Aviso de taxa (texto completo — usar este, não o resumido):
  > **"Ao pagar no cartão, a escola cobra 2,99% de taxa adicional. No PIX e boleto, nenhuma taxa extra."**
- Checkbox (texto verbatim):
  > **"Autorizo a cobrança recorrente automática neste cartão e concordo com os termos da assinatura."**
- Botão: **"Salvar cartão"**
- Cartão já ativo: **"•••• {last4} · Remover"**

---

## 5b. Cartão cadastrado (confirmação — tela `cardOk`)

Tela de sucesso após tokenização — existe como passo separado no fluxo de referência (`screens-e.jsx`), vale manter como tela própria (não é só um toast) porque confirma que a cobrança recorrente automática foi ativada, o que é uma mudança de comportamento futuro relevante pro responsável entender.

### Copy sugerido (verbatim da spec)

> **"Cartão cadastrado! Pagamento automático ativado no cartão •••• {last4}. As próximas mensalidades serão pagas sozinhas."**

CTA: **"Voltar ao início"**

---

## 6. Histórico (12 meses)

### Campos

| Campo | Fonte | Formato |
|---|---|---|
| Lista de Invoices | `status = PAID` E `paidAt >= hoje - 12 meses` (RN-12b) | Ordenada por `paidAt` decrescente |
| Descrição | `Subject.name + " — " + referenceMonth` | "Matemática — Junho/2026" |
| Valor | `netAmountCents / 100` | R$ 464,55 |
| Data de pagamento | `Invoice.paidAt` | DD/MM/AAAA |
| Badge | Sempre `PAID` → **verde** (RN-12a) | — |
| Botão "NF disponível" | Condicional — ver regra abaixo | Ícone/link de download |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| **Com histórico** | Existem Invoices PAID nos últimos 12 meses | Lista normal |
| **Vazio** | Nenhuma Invoice PAID no período | Mensagem de estado vazio |
| **NF disponível** | Feature NFS-e (fluxo 04) ativa na Unit **e** `AsaasInvoice.pdfUrl` existe | Botão "PDF"/"Baixar NF" visível |
| **NF em processamento** | Feature ativa mas `pdfUrl` ainda nulo | Texto "Nota fiscal em processamento" no lugar do botão |
| **NF não aplicável** | Feature NFS-e **não** está ativa pra unidade (RN-13) | **Botão totalmente ausente** — não mostrar nem desabilitado nem "em processamento". Silêncio total sobre NF quando a feature está off. |

### Regras de negócio visíveis

- **RN-12b:** janela fixa de 12 meses corridos a partir de hoje — uma Invoice paga há 13 meses **não aparece**, mesmo que exista no banco. Não há paginação "ver mais antigo" nesta versão.
- **RN-13 (download):** o link de NF nunca aponta direto pra URL do Asaas — é servido via proxy interno (`/api/portal/invoices/{id}/nfse`) que valida a sessão antes. **Do ponto de vista de design isso é invisível** (parece um link normal), mas importa saber que o clique dispara uma verificação de sessão antes do download — se a sessão tiver expirado nesse meio-tempo, o clique pode cair na tela de sessão expirada em vez de baixar o PDF direto.
- O portal **nunca emite** NF — só exibe/baixa o que já foi emitido em outro fluxo. Não desenhar nenhum estado de "gerar nota fiscal" aqui.

### Copy sugerido

- Estado vazio: **"Nenhum pagamento nos últimos 12 meses."**
- NF em processamento: **"Nota fiscal em processamento"**
- Botão download: **"PDF"** ou **"Baixar NF"**

---

## 7. Centro de notificações (in-app)

Sem push nativo nesta versão (D-13) — populado em runtime a partir do estado atual de Invoices e Dunnings, **não é uma tabela persistida**. Isso significa: não existe "notificação lida permanentemente marcada no banco" — o estado é derivado sempre que a tela abre.

### Campos

| Campo | Fonte | Tipo |
|---|---|---|
| Tipo | Derivado (negativação / a vencer / mensagem da unidade) | `danger` / `warning` / `info` |
| Ícone | Por tipo | — |
| Título | Derivado do contexto (ex: "Cobrança vencendo em breve") | — |
| Timestamp | Derivado (ex: data de vencimento, data da mensagem) | — |
| Corpo | Texto descritivo | — |
| CTA | Quando aplicável (ex: notificação de negativação → leva pra tela "Quitar vencido") | Opcional por card |

### Estados

| Tipo | Gatilho | CTA |
|---|---|---|
| **danger** | Invoice `NEGATIVATED` existente | "Quitar e regularizar" → tela overdue |
| **warning** | Invoice `PENDING` próxima do vencimento | "Pagar agora" → tela pay |
| **info** | Mensagem da unidade (sem ação financeira) | Sem CTA financeiro — pode ter "Ok"/dispensar |

### Regras de negócio visíveis

- Como não há persistência de "lida/não lida" no banco (D-13), o contador de não lidas na home é **também derivado** — cuidado no design pra não implicar um estado que o backend não garante (ex: "marcar todas como lidas" pode não fazer sentido se não há armazenamento desse estado — validar com engenharia antes de desenhar essa interação, spec não define isso).

### Copy sugerido

- Sem strings verbatim definidas na spec para esta tela — títulos e corpos são dinâmicos por contexto, seguir o tom institucional-acolhedor do restante do portal.

---

## Sessão — regra transversal (aparece implicitamente em toda tela autenticada)

Duas durações diferentes, não confundir:

1. **Magic link (`PortalSession.expiresAt`): 7 dias.** É o prazo entre a escola gerar/enviar o link e o responsável clicar nele pela primeira vez. Se passar de 7 dias sem clicar, cai na tela de erro genérico (seção 1 deste handoff).
2. **Sessão autenticada (cookie HTTP-only): 24 horas.** Depois que o responsável clica no link válido, o servidor emite um cookie de sessão que dura 24h. Depois disso, **qualquer navegação dentro do portal** (não só a entrada) cai de volta na tela de link inválido/expirado — porque não há re-autenticação automática, o responsável precisaria de um novo link.

**Aviso de expiração próxima — decisão em aberto, não especificada:** a spec **não define** se o portal deve avisar visualmente quando a sessão de 24h está perto de expirar (ex: banner "sua sessão expira em breve"). Isso não é um requisito confirmado — é uma pergunta de produto em aberto. Recomendação (não é regra da spec): se o time quiser resolver isso, um padrão comum é um toast silencioso nos últimos 5 minutos, mas **confirmar com o PM antes de desenhar** — não implementar como se fosse requisito fechado.

---

## Regras de performance visíveis ao design (RN-16)

O first-load JS da rota `/portal` precisa ficar **abaixo de 200KB**, e o portal roda dentro do navegador in-app do WhatsApp (engine mais limitada, conexões possivelmente 3G). Isso não é responsabilidade só de engenharia — decisões de design têm custo de bundle direto:

- **Evitar imagens pesadas.** Nenhum asset decorativo grande (hero images, ilustrações SVG complexas com muitos paths). O mock de cartão na tela 5, por exemplo, deve ser simples (CSS/gradiente, não imagem).
- **Evitar bibliotecas de ícones custosas.** Preferir os ícones já usados no DS Alfabeto (provavelmente um set já tree-shaken) em vez de importar uma lib nova de ícones só pra esse fluxo.
- **QR Code é uma imagem base64 vinda da API** (não gerado client-side com lib pesada de geração de QR) — isso já está resolvido pela spec (seção 2c/5c), mas reforça: não trocar por uma lib de geração de QR no client "pra ficar mais bonito".
- Animações devem ser leves (CSS transitions, não libs de animação pesadas) dado o contexto de 3G/WhatsApp browser.

---

## Componentes do Design System a reusar

Base: `/Users/rafae/projetos/education-x-mvp/src/components/ui/`

| Componente | Uso no portal |
|---|---|
| `badge.tsx` | Status de cobrança (PAID/PENDING/OVERDUE/NEGATIVATED) — **ver gap crítico abaixo antes de usar** |
| `Card.tsx` | Cards de cobrança na home/histórico, card de banner de negativação, card de cartão ativo |
| `dialog.tsx` | Formulário de cadastro de cartão (tela 5) — se for modal/dialog em vez de página inteira, avaliar com o time; a spec trata como rota própria (`/portal/card`), mas o componente serve também se a decisão de UX for modal |
| `toast.tsx` | Feedback de "copiado" (tela pay), erros de rede, confirmações rápidas |
| `button.tsx` | Todos os CTAs — "Pagar agora", "Já paguei", "Salvar cartão", "Quitar e regularizar" etc. |

### ⚠️ Gap encontrado no Design System — ação necessária antes de implementar badges

`badge.tsx` tem as variantes: `success` (verde), `warning` (âmbar), `danger` (vermelho), `info` (azul), `primary`, `neutral`. O helper `StatusBadge` (que mapeia strings tipo `"pendente"` → variante automaticamente) mapeia `pendente/aguardando → warning` (âmbar).

**Isso conflita com RN-12a**, que exige `PENDING` (a vencer) = **azul**, não âmbar. Se o time usar o `StatusBadge` genérico com a chave `"pendente"`, a cor sai errada.

**Ação:**
1. Para `PENDING`, usar `<Badge variant="info">` diretamente (azul) — **não** usar `StatusBadge status="pendente"`.
2. Para `PAID`, `<Badge variant="success">` funciona direto.
3. Para `OVERDUE`, `<Badge variant="danger">` funciona direto.
4. Para `NEGATIVATED` (**preto**), **não existe variante hoje**. Precisa de uma decisão antes da implementação: (a) adicionar variante nova `black`/`negativated` ao `badge.tsx`, ou (b) usar `className` override em cima de `danger`. Opção (a) é mais alinhada ao padrão do componente — recomendar ao Caio/engenharia adicionar a variante ao token set em vez de override pontual.

Sinalizar esse gap ao Caio (engenharia) antes de começar a fatia 5 — é uma mudança de 5 minutos no componente, mas precisa acontecer antes, não durante a implementação das telas.

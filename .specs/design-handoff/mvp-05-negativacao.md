# Design Handoff — Negativação SPC/Serasa (a cunha)

> **Fase:** MVP · **Ordem:** 05 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-05-negativacao.md`](../mvp-05-negativacao.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.
> **Nota:** é o diferencial único do produto — a Spontee (concorrente homologado Kumon) não faz negativação automática. Tela deve transmitir controle e transparência.

---

## 1. Objetivo

A dona visualiza e gerencia inadimplentes elegíveis para negativação no SPC/Serasa, aciona negativação com aviso legal prévio obrigatório, acompanha o status até regularização (pagamento recebido, baixa manual, ou opt-out permanente). Controle centralizado e transparência total — o que a Spontee não oferece.

---

## 2. Telas e fluxo do operador

### 2.1 Painel principal — `/cobrancas/negativacao`

**Layout:** tabs + list view com 4 abas por status Dunning.

**Estrutura:**
- Header: "Negativação SPC/Serasa" + 4 tabs (Elegível / Em Aviso Prévio / Negativado / Regularizado)
- Cada aba exibe cards em lista, com filtro opcional por período de vencimento
- Se unidade tem `enablesSpc=false`, painel inteiro desabilitado (mensagem: "Negativação desabilitada nesta unidade")

**Card de inadimplente (todos os estados):**
- **Topo:** aluno (nome completo) + responsável (nome completo)
- **Corpo:** 
  - CPF (mascarado: `***.***.XXX-XX`, NUNCA completo)
  - Valor devido (R$)
  - Dias de atraso (`"+X dias"`)
  - Data de vencimento (DD/MM/AAAA)
- **Status:** badge colorida (laranja/azul/vermelho/verde conforme estado)
- **Ações:** botões contextuais por estado (ver §2.2)
- **Rodapé (se `NEGATIVADO`):** data do registro no bureau + taxa R$29,90

---

### 2.2 Estados visuais e ações

#### **Estado 1: Elegível** (badge laranja)
- Subtítulo: "Elegível para Negativação"
- Botão primário: "Negativar" (abre modal de confirmação)
- Contador (se aplicável): mostrar se há aviso prévio ativo em processo

#### **Estado 2: Em Aviso Prévio** (badge azul)
- Subtítulo: "Aviso enviado — elegível em X dias"
- NÃO acionável — botão "Negativar" desabilitado
- Timeline CDC: "Aviso legal enviado em DD/MM · Elegível para registro em DD/MM"

#### **Estado 3: Negativado** (badge vermelho)
- Subtítulo: "Registrado no Bureau" + data (DD/MM/AAAA)
- Botões: 
  - "Solicitar Baixa" (abre modal de confirmação)
  - "Opt-out" (abre modal de opt-out)
- Timeline CDC: "Registrado no SPC/Serasa em DD/MM"
- Destaque: taxa R$29,90 com mensagem "Será cobrada em sua fatura mensal" (se `negativacaoFeePayer=ESCOLA`) OU "Incluída no boleto do responsável" (se `negativacaoFeePayer=RESPONSAVEL`)

#### **Estado 4: Regularizado** (badge verde)
- Subtítulo: "Regularizado — [motivo]"
- Motivos possíveis: "Baixa Manual" / "Pagamento Recebido" / "Opt-out"
- Data da regularização (DD/MM/AAAA)
- Somente leitura — sem botões de ação

---

### 2.3 Modal de confirmação — Negativar

**Acionador:** botão "Negativar" em card `ELEGIVEL`

**Conteúdo do modal:**
- Título: "Confirmar Negativação"
- Resumo (caixa cinza):
  - Aluno: [nome]
  - Responsável: [nome]
  - CPF: [mascarado]
  - Valor da dívida: R$ [valor]
  - Taxa de inclusão: R$ 29,90
  - Total a negativar: R$ [valor] + R$ 29,90
- Quem paga a taxa: 
  - Se `negativacaoFeePayer=ESCOLA`: "Será cobrada em sua fatura mensal"
  - Se `negativacaoFeePayer=RESPONSAVEL`: "Será incluída no boleto do responsável"
- Aviso legal CDC (timeline):
  - Caixa destacada (borda azul, fundo leve):
    - "Aviso legal (CDC art. 43): o responsável receberá notificação antes da inclusão no SPC/Serasa. A negativação será confirmada em até 10 dias úteis."
- Botões: "Cancelar" (fecha) | "Confirmar Negativação" (POST /api/dunnings → status muda para NEGATIVADO)

**Estados do modal:**
- Loading: spinner no botão "Confirmar", inputs desabilitados
- Erro: mensagem vermelha com retry, motivo técnico (ex: "Falha ao comunicar com Asaas. Tente novamente em 5 minutos")
- Sucesso: modal fecha, card atualiza para `NEGATIVADO`, toast verde ("Negativação acionada — aviso legal enviado")

---

### 2.4 Modal de confirmação — Solicitar Baixa

**Acionador:** botão "Solicitar Baixa" em card `NEGATIVADO`

**Conteúdo do modal:**
- Título: "Solicitar Baixa de Negativação"
- Aviso (caixa vermelha, borda forte):
  - "Esta ação é PERMANENTE e não pode ser desfeita. O registro será cancelado no SPC/Serasa, mas a dívida permanece aberta. Continuar?"
- Resumo (caixa cinza): aluno + responsável (CPF mascarado) + valor da dívida
- Botões: "Cancelar" | "Confirmar Baixa" (DELETE /api/dunnings/{id})

**Estados:**
- Loading: spinner, inputs desabilitados
- Erro: mensagem vermelha com retry
- Sucesso: modal fecha, card atualiza para `REGULARIZADO`, motivo "Baixa Manual", toast verde ("Negativação cancelada no SPC/Serasa")

---

### 2.5 Modal de confirmação — Opt-out Permanente

**Acionador:** botão "Opt-out" em card `NEGATIVADO`

**Conteúdo do modal:**
- Título: "Desativar Cobrança via Bureau"
- Aviso (caixa vermelha):
  - "O responsável sairá PERMANENTEMENTE da régua de negativação. A dívida não será registrada no SPC/Serasa em cobranças futuras, mas continuará aberta. Continuar?"
- Nota adicional (cinza): "Esta ação não pode ser revertida. Será aplicada a todas as futuras cobranças deste responsável."
- Resumo: aluno + responsável (CPF mascarado)
- Botões: "Cancelar" | "Confirmar Opt-out" (PATCH /api/dunnings/{id}?action=optOut)

**Estados:**
- Loading: spinner
- Erro: mensagem vermelha com retry
- Sucesso: modal fecha, card atualiza para `REGULARIZADO`, motivo "Opt-out", toast verde ("Responsável marcado como opt-out permanente")

---

## 3. Estados de carregamento e erro

### **Loading (todo card elegível → negativado)**
- Skeleton loader no card (shimmer animation)
- Botões primários desabilitados
- Spinner circular no centro
- Subtítulo: "Processando..." (cinza claro)

### **Erro de API (Asaas falha)**
- Card volta ao estado anterior (ex: `ELEGIVEL` → POST falha → volta `ELEGIVEL`)
- Toast vermelho com mensagem: "Falha ao comunicar com Asaas. Motivo: [erro técnico]. Tente novamente em 5 minutos."
- Botão "Tentar Novamente" destacado no card
- Log interno: asaasDunningId = null, status Dunning rollback

### **Estado vazio (nenhuma cobrança nesta aba)**
- Ilustração (ícone de check verde ou similitude)
- Mensagem: "Nenhum inadimplente nesta categoria. Ótimo trabalho!"
- Fundo cinza muito claro (#F5F5F5)

---

## 4. Campos por inadimplente (validação + exibição)

| Campo | Tipo | Obrigatório | Exibição | Validação |
|---|---|---|---|---|
| Aluno (nome completo) | string | SIM | Card — topo | Nunca vazio; ler de `Invoice.student.name` |
| Responsável (nome completo) | string | SIM | Card — topo | Nunca vazio; ler de `Invoice.guardian.name` |
| CPF responsável | string (criptografado em BD) | SIM | Mascarado `***.***.XXX-XX` | Nunca exibir completo; usar `maskCpf()` helper |
| Valor devido | number (centavos em BD) | SIM | Exibir em reais (dividir por 100) com 2 casas: `R$ 450,00` | Sempre >= R$ 0,01 |
| Dias de atraso | number | SIM | `"+X dias"` ou "em dia" | Calcular como `today - dueDate` |
| Vencimento | date | SIM | `DD/MM/AAAA` | Sempre preenchido; ler de `Invoice.dueDate` |
| Data do aviso CDC | date | NÃO | Timeline "Aviso enviado em DD/MM" | Setado quando Asaas confirma; ler de `Dunning.warningSentAt` |
| Taxa R$29,90 | const | SIM | Exibir em modal + card `NEGATIVADO` | Sempre 2990 centavos; hardcoded |
| Quem paga a taxa | enum | SIM | Modal + card | Ler de `BillingConfig.negativacaoFeePayer` (`ESCOLA` ou `RESPONSAVEL`) |
| Status Dunning | enum | SIM | Badge colorida | 4 valores: `ELEGIVEL` / `EMAVISO` / `NEGATIVADO` / `REGULARIZADO` |
| Motivo regularização | string | NÃO | Card estado 4 | Valores fixos: "Baixa Manual" / "Pagamento Recebido" / "Opt-out" |
| Data regularização | date | NÃO | Card estado 4 | Ler de `Dunning.resolvedAt` |

---

## 5. Regras que afetam a UI

1. **Elegibilidade:** card aparece em aba "Elegível" quando:
   - `Invoice.dueDate <= today - 15 days`
   - `Invoice.status = OVERDUE` (Asaas)
   - `BillingConfig.enablesSpc = true`
   - `Dunning` não existe ainda OU `Dunning.status < ELEGIVEL`
   - `Dunning.optOut = false` (responsável não marcado como opt-out)

2. **Aviso CDC (10 dias prévios):** Asaas dispara automaticamente; IX registra `warningSentAt` via webhook/polling. Card muda para aba "Em Aviso Prévio" enquanto aviso está ativo. Botão "Negativar" fica desabilitado até elegibilidade completa.

3. **Opt-out é permanente por responsável:** após marcado `Dunning.optOut=true`, futuras invoices deste responsável NÃO geram novo Dunning (guard na criação automática). Badge visual "Opt-out ativo" aparece em cards deste responsável em todas as abas.

4. **Baixa automática no pagamento:** webhook do fluxo 03 (`Invoice.status=RECEIVED` ou `CONFIRMED`) trigga `DELETE /paymentDunnings/{asaasDunningId}` se `Dunning.status=NEGATIVADO`. Card muda automaticamente para `REGULARIZADO`, motivo "Pagamento Recebido", sem ação da dona. Toast: "Cobrança paga — negativação cancelada automaticamente".

5. **CPF SEMPRE mascarado:** em todos os cards, modais, timeline, resumos. Helper `maskCpf()` implementado em `src/lib/utils/mask-cpf.ts`.

6. **Se `enablesSpc=false`:** painel inteiro desabilitado. Mensagem em grande: "Negativação desabilitada nesta unidade — configure em Configurações > Cobrança > Negativação SPC/Serasa". Botão "Configurar" navega para settings (fora do escopo deste design).

7. **Erro Asaas reverte status:** `POST /paymentDunnings` falha → `Dunning.status` volta a `ELEGIVEL`, `asaasDunningId=null`. Modal exibe erro técnico + botão retry.

8. **Auditoria:** toda ação (negativar, baixa, opt-out) grava `Dunning.actorId = clerkUserId` do operador (automático na API).

---

## 6. Referência visual

### Componentes a usar (shadcn/ui):
- **Badge:** status colorido (laranja `#FFA500`, azul `#0467DB`, vermelho `#DC2626`, verde `#16A34A`)
- **Button:** primário (azul IX) + secundário (cinza) + danger (vermelho)
- **Modal / Dialog:** para confirmações, avisos, opt-out
- **Card:** container inadimplente com padding e borda sutil
- **Timeline:** exibição de eventos CDC (aviso enviado → elegível → negativado → regularizado)
- **Spinner:** loading em estado transição
- **Toast / Alert:** feedback de sucesso/erro (topo direito, auto-dismiss 5s)
- **Tabs:** 4 abas por status Dunning
- **Icon:** chevron (expandir card para detalhes), check (sucesso), x (erro), clock (pending)

### Breakpoints:
- **Mobile (375px):** cards em full width, modals em full height, abas em scroll horizontal
- **Tablet (768px):** cards 1-2 por linha, modals em max-width 500px
- **Desktop (1440px):** cards 1-2 por linha, modals em max-width 600px, timeline horizontal

### Tipografia & cor:
- **Marca:** azul Alfabeto `#0467DB` para primary actions
- **Textos:** preto `#000` em fundo branco, cinza `#666` em metadados
- **Avisos legais:** caixa de fundo `#FEF3C7` (amarelo claro), borda `#F59E0B` (amber)
- **Erros:** fundo `#FEE2E2`, texto `#991B1B`
- **Sucesso:** fundo `#ECFDF5`, texto `#065F46`

### Referência de protótipo:
- Arquivo: `prototipo/design-handoff/project/app/screens-d.jsx` (UX reference — não define campos, apenas layout)
- Screenshots: `neg.png` (painel de status), `neg-modal.png` (modal de confirmação)

---

## 7. Checklist de implementação

- [ ] Painel `/cobrancas/negativacao` com 4 abas por status
- [ ] Card de inadimplente com todos os campos (aluno, responsável, CPF mascarado, valor, atraso, vencimento)
- [ ] Badge colorida por status + contador de dias (se em aviso)
- [ ] Modal de confirmação negativação (com aviso CDC, taxa, quem paga)
- [ ] Modal de confirmação baixa (aviso permanente)
- [ ] Modal de opt-out permanente
- [ ] Loading states (skeleton + spinner)
- [ ] Error states (retry, mensagem técnica)
- [ ] Empty state (nenhum inadimplente)
- [ ] Desabilitação total se `enablesSpc=false`
- [ ] Toast de sucesso/erro
- [ ] Responsivo 375/768/1440
- [ ] CPF sempre via `maskCpf()` helper
- [ ] E2E Playwright cobrindo 4 estados + opt-out + baixa manual + erro Asaas

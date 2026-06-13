# Discrepâncias — Roadmap de Dev vs. Protótipo aprovado

> **Regra:** o **protótipo é a fonte de verdade aprovada**. Onde o roadmap diverge, o **roadmap se corrige** para refletir o protótipo. Este documento lista cada divergência e o ajuste necessário antes de escrever as specs detalhadas.
>
> Fontes cruzadas: `design-handoff/project/app/*.jsx` (source pixel-perfect) · `design-handoff/chats/*.md` (intenção) · Roadmap de Produto Education X (MVP, B1→B5).
>
> Data: 2026-06-13 · Versão 1.0

---

## Resumo executivo

O roadmap cobre bem o **núcleo financeiro** (onboarding, matrícula, cobrança, webhook, NFS-e, negativação, dashboard). Mas o protótipo aprovado contém **5 blocos de funcionalidade que o roadmap não prevê** e **várias regras de negócio mais detalhadas** do que o roadmap assume. Como tudo no protótipo foi aprovado, esses itens **entram no escopo** — não são "nice-to-have".

**Classificação das discrepâncias:**
- 🔴 **Falta no roadmap** — está no protótipo aprovado, não tem tarefa no roadmap. Precisa virar tarefa.
- 🟡 **Sub-especificado** — roadmap tem a tarefa mas o protótipo exige mais do que ele descreve.
- 🟢 **Alinhado** — roadmap e protótipo batem.
- ⚪ **No roadmap, ausente do protótipo** — roadmap prevê, protótipo não mostra (provável pós-MVP ou backend invisível).

---

## 🔴 1. Funcionalidades no protótipo SEM tarefa no roadmap

### 1.1 — Retirada / Saque do saldo + Antecipação de recebíveis (`screens-fin.jsx`, `fin`)
O protótipo tem o fluxo **"Retirada do pagamento"** completo, embutido no Dashboard (`FinanceiroBody`):
- Card de saldo disponível (separado: PIX/boleto liberado na hora vs. cartão D+X)
- Modal **saque** → transferência PIX para conta bancária cadastrada (Banco Inter mock)
- Modal **antecipação de recebíveis de cartão** → taxa **1,99% a.m. proporcional aos dias**, cálculo bruto→taxa→líquido, seleção por lote

**Roadmap:** não menciona saque nem antecipação em nenhuma tarefa.
**Ajuste:** criar épico/tarefas para Financeiro (saldo + saque + antecipação). Depende do webhook (saldo vem dos pagamentos) e da integração Asaas (transfer + anticipation API). **Validar com Asaas** se antecipação está disponível na conta.

### 1.2 — Portal do Responsável completo (`screens-e.jsx`, `e`)
O roadmap lista "Portal do Responsável" como **pós-MVP** (Épico 07). Mas o protótipo aprovado o tem **completo e detalhado**, mobile-first:
- Home com próxima cobrança + "Pagar agora" + histórico + banner de risco de negativação
- Pagamento PIX (QR + copia-e-cola + "Já paguei")
- Quitar boleto vencido (valor atualizado: original + multa 2% + juros 1% a.m., breakdown)
- Cadastrar cartão para assinatura (tokenização) + aviso de taxa 2,99%
- Centro de notificações (risco negativação / a vencer / mensagens da escola)
- Download de NFS-e (PDF) por cobrança paga

**Conflito direto:** roadmap diz pós-MVP, protótipo aprovado diz dentro. **O protótipo prevalece** → Portal entra no MVP. Criar épico de Portal do Responsável.

### 1.3 — Importação de matrículas via CSV (`screens-import.jsx`, `imp`)
O roadmap lista importação como **pós-MVP** (e a tarefa 1.3 manda o botão de sucesso levar ao painel, não à importação). O protótipo tem o fluxo **completo e aprovado**:
- Upload CSV (até 5.000 linhas) + download de modelo
- Colunas: `aluno, nascimento, pagante, cpf, email, telefone, plano, materias`
- Validação linha-a-linha com erros corrigíveis inline (CPF inválido, plano inexistente, pagante ausente)
- Modal "Corrigir cadastro" + revalidação
- Import bloqueado enquanto houver erro; relatório de erros CSV

**Conflito:** roadmap pós-MVP vs. protótipo aprovado. **Protótipo prevalece** → importação entra (exclusiva do Admin, conforme chats). Criar tarefa.

### 1.4 — Cobrança extra avulsa (`screens-c5.jsx`, `c5`)
Protótipo: tela "Nova cobrança extra" — cria cobrança avulsa (multa de cancelamento, taxa, material) com busca de responsável, descrição, valor, desconto (% ou R$), cálculo de total.

**Roadmap:** a tarefa 6.2 menciona "gerar cobrança extra manual" de passagem, mas como sub-ação da lista de cobranças, sem tela própria nem regra de desconto.
**Ajuste:** elevar a tarefa própria com a tela C5 e a lógica de desconto.

### 1.5 — Settings: aba "Meu plano" (billing da escola com a Education X) (`screens-d.jsx`, `settings`)
Protótipo: aba **"Meu plano"** nas Configurações — a escola gerencia a **própria assinatura Education X**:
- Card do plano atual (Básico R$450 até 200 cob / Crescimento R$599 / Pro R$799 / Sob medida)
- Mudar de plano (modal)
- Alterar forma de pagamento (cartão tokenizado, campos completos)
- Faturas Education X (lista + filtros + modal de detalhe com itens: mensalidade + taxa de negativação R$29,90/inclusão + pagamento via PIX/cartão)

**Roadmap:** não tem nenhuma tarefa sobre cobrar a própria escola (billing do SaaS). Trata só de cobrar o responsável final.
**Ajuste:** criar épico de **Billing da plataforma** (a Education X cobrando a escola). Isso é o motor de receita do produto — não pode ficar de fora. ⚠️ É também onde está o **pricing que o Rafa vai definir semana que vem**.

---

## 🟡 2. Tarefas do roadmap sub-especificadas vs. protótipo

### 2.1 — Onboarding (roadmap 1.1→1.3) vs. wizard de 4 passos do protótipo (`screens-a.jsx`)
Roadmap descreve onboarding genérico (dados + aceite). Protótipo tem **wizard de 4 passos** muito mais rico:
- **Passo 1 Dados:** nome, CNPJ, tel, email, CEP, endereço, complemento, cidade, UF, **toggle franquia + campo franquia-mãe**
- **Passo 2 Regras:** dia vencimento, dia fechamento, multa, juros, **toggle SPC, toggle cobrança automática, toggle aceita cartão**, + **FeeRouter** (quem paga taxa de cartão / taxa de negativação: responsável ou escola)
- **Passo 3 Documentos:** **inscrição municipal + códigos de serviço NFS-e por matéria (array addable) + upload de contrato PDF**
- **Passo 4 Revisão** + loading (validando CNPJ → criando subconta → aplicando regras) + sucesso

**Ajuste:** a tarefa 1.3 (wizard) precisa expandir para 4 passos com TODOS esses campos. A config de NFS-e por matéria (passo 3) e o FeeRouter (passo 2) são regras que o roadmap não modela.

### 2.2 — Matrícula (roadmap 2.2) vs. dois fluxos distintos no protótipo
O roadmap trata "matrícula via link + duplo aceite" como uma tarefa. O protótipo tem **dois fluxos separados**:
- **Matrícula via link** (`b`, mobile, responsável preenche tudo) — 4 steps + contrato personalizado da escola + aceite
- **Matrícula manual** (`c6`, orientador preenche, responsável só confirma via `FlowConfirm`) — 2 abas, até 5 alunos, endereço opcional, calculadora de desconto

**Ajuste:** separar em duas tarefas. O `c6` (manual) é para escolas com processo interno próprio — não está no roadmap.

### 2.3 — Planos/descontos (roadmap 2.1) vs. regras do protótipo
Protótipo detalha:
- Plano por **conta/responsável, não por aluno** (N alunos não multiplicam)
- Até **5 alunos por matrícula**
- 4 matérias: Matemática, Português, Inglês, **Japonês**
- Desconto de **plano** (Trimestral -5%, Semestral -10%, Anual -20% sobre base) **E** desconto de **negociação por aluno** (% ou R$) — são dois descontos distintos e cumulativos
- Caso **aluno = próprio pagante** (`selfPayer`)
- Cobrança = **assinatura recorrente, sem parcelamento**

**Ajuste:** a tarefa 2.1 (schema planos) precisa modelar os dois tipos de desconto, o limite de 5 alunos, o flag selfPayer e a recorrência como assinatura.

### 2.4 — Dashboard (roadmap 6.1) vs. 3 abas + 4 relatórios do protótipo
Roadmap: dashboard com KPIs recebido/a vencer/vencido. Protótipo tem **3 abas** (Dashboard, Relatórios, Extrato) e a aba Relatórios tem **4 sub-relatórios** (Cobrança, Inadimplência, Crescimento, Cancelamentos) cada um com gráfico intercambiável (barras/linha/pizza) + **bloco RecoveryHero** (funil de recuperação de inadimplência — descrito nos chats como a métrica nº1 de venda).

**Ajuste:** a tarefa 6.1 precisa expandir para os 4 relatórios + extrato + funil de recuperação.

### 2.5 — Negativação (roadmap 5.1/5.2) vs. detalhe do protótipo (`screens-d.jsx`)
Roadmap está alinhado na lógica (manual, Asaas cuida do aviso legal). Protótipo adiciona detalhes a especificar:
- 4 status: `emaviso` / `elegivel` / `negativado` / `regularizado`
- KPIs por status + valores totais
- Tela D1 com timeline por status (CDC art. 43, 10 dias)
- Ação **opt-out** (responsável sai da régua permanentemente, dívida segue sem registro SPC)
- Ação **solicitar baixa** manual
- CPF mascarado (`maskCpf`)

**Ajuste:** specs de negativação precisam contemplar os 4 status, opt-out, solicitar baixa e CPF mascarado.

### 2.6 — Settings completo (roadmap não tem) vs. 3 abas do protótipo
Além da aba "Meu plano" (item 1.5), o Settings tem:
- **Dados da escola** (razão social, CNPJ, conta repasse, regras de cobrança) + toggle "exigir contrato assinado na matrícula" + modo escuro
- **Taxas** (FeeChoice: quem paga taxa de cartão / negativação)

**Ajuste:** criar tarefa de Settings.

---

## 🟢 3. Pontos alinhados (roadmap ✓ protótipo)

- Multi-tenancy / isolamento por escola (roadmap 1.4) ✓
- Webhook idempotente Asaas (roadmap 3.3) ✓ — protótipo não mostra (é backend) mas a lógica de PAID alimenta tudo
- NFS-e automática ao pagar (roadmap 4.1) ✓ — protótipo mostra "NFS-e nº X, PDF/XML" na cobrança paga
- Emissão de cobrança boleto/PIX (roadmap 3.2) ✓ — protótipo mostra linha digitável + PIX copia-e-cola + QR
- Cron de emissão em lote no fechamento (roadmap 4.3) ✓ — protótipo cita "cobrança gerada em lote no 1º dia 08:00"
- Régua de avisos nativa Asaas (roadmap 4.2) ✓ — chats confirmam "régua é padrão, não editável por escola"
- Negativação manual + Asaas cuida do aviso legal (roadmap 5.x) ✓

---

## ⚪ 4. No roadmap, ausente/invisível no protótipo

- **Termos da plataforma + cláusula de isenção IX** (roadmap 1.5) — protótipo mostra aceite mas não o texto legal. Mantém no roadmap (é backend/conteúdo).
- **Contract tests mock→sandbox Asaas** (roadmap 4.4, gate de ship) — invisível no protótipo, mantém.
- **Cartão de crédito recorrente / tokenização** (roadmap pós-MVP, Épico 04) — mas o protótipo TEM cadastro de cartão no portal (`e-card`) e em Settings billing. **Conflito:** protótipo aprovado inclui cartão. Reavaliar se cartão sai do pós-MVP.

---

## Regras de negócio do protótipo a fixar nas specs (consolidado)

| Regra | Valor | Origem |
|---|---|---|
| Multa por atraso | 2% | C4, Settings, contrato |
| Juros | 1% a.m. | Settings, contrato |
| Taxa de cartão (ao responsável) | 2,99% | Portal e-card |
| Taxa de antecipação de recebíveis | 1,99% a.m. proporcional aos dias | FinanceiroBody |
| Taxa de negativação (fatura da escola) | R$ 29,90 por inclusão | Faturas Settings |
| Aviso prévio negativação | CDC art. 43, 10 dias, automático | D0/D1 |
| Elegível p/ negativação | venc + 15 dias | C4 timeline |
| Lembrete antes do vencimento | 3 dias antes | C4 timeline |
| Desconto de plano | Trim -5% / Sem -10% / Anual -20% (sobre base R$450) | C2/C6 |
| Limite de alunos por matrícula | 5 | C2/C6 |
| Matérias | Matemática, Português, Inglês, Japonês | C2/C6/B |
| Cobrança | assinatura recorrente, sem parcelamento | C6/chats |
| NFS-e | obrigatória p/ todos, emitida no fechamento | chats/A3 |
| Importação CSV | até 5.000 linhas, exclusiva Admin | imp/chats |
| Planos Education X (billing escola) | Básico 450 / Crescimento 599 / Pro 799 / Sob medida | Settings |

> ⚠️ **Os preços dos planos Education X (Básico/Crescimento/Pro) estão no protótipo como mock — o Rafa vai DEFINIR o pricing real semana que vem.** Não fixar esses valores na spec até a decisão.

---

## Próximos passos

1. **Corrigir o roadmap** absorvendo os itens 🔴 e 🟡 (novos épicos: Financeiro/Saque, Portal do Responsável, Importação, Billing da plataforma, Settings; expansão de Onboarding, Matrícula, Dashboard, Negativação).
2. **Definir pricing** dos planos Education X (Rafa, semana de 15/jun) — destrava o épico de Billing.
3. **Validar com Asaas:** antecipação de recebíveis disponível? transfer/PIX out? dunning write?
4. **Escrever specs detalhadas** por épico, usando o source JSX como referência pixel-perfect.

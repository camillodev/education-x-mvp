# Épico 02 — Cobrança Automática (agendamento + régua)

> **Prioridade:** P1 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Depende de:** Épico 01
> **Status:** 🟡 Aguardando aprovação
> **Entrega:** a escola cobra no automático — boletos gerados sozinhos no fechamento e
> régua de avisos (multicanal) com multa/juros aplicados sem trabalho manual.

---

## ⚠️ O que mudou de escopo (integração com Épico 01)

Conforme decidido com o Rafa, **parte deste épico foi absorvida pelo Épico 01**:

| Antes neste épico | Onde está agora |
|---|---|
| Envio multicanal (email + WhatsApp + SMS) ao emitir | ✅ **Épico 01, Feature 1.5** |
| Emissão em lote sob demanda | ❌ **Removido** — recorrência é coberta pelo modo automático; manual só para extras |
| Multa e juros configuráveis | ✅ **Épico 01, onboarding (Feature 1.1)** — toda config específica da escola é no onboarding |

**O que permanece exclusivo deste épico 02:**
1. **Emissão automática no fechamento** (cron mensal — o "modo 3" do Épico 01).
2. **Régua de avisos agendada** (vencimento próximo, atraso) — o *quando* enviar, além do
   envio inicial já coberto no Épico 01.

> Como o modo automático é o **padrão** decidido para as escolas (ver Épico 01, Q7), este
> épico é, na prática, a feature que faz a escola "não precisar fazer nada todo mês".

---

## Por que este épico

A emissão automática no fechamento é o que torna a operação da escola "mão na roda":
todo mês os boletos saem sozinhos, os avisos são agendados, e a inadimplência é tratada
pela régua — sem a Orientadora tocar em nada.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 2.1 — Emissão em lote no fechamento do mês

> **User story**
> Como **Orientadora**, quero que todos os boletos do mês sejam gerados automaticamente
> no dia de fechamento, para não emitir um por um.

**Critérios de aceite**
- [ ] No dia de fechamento (configurável, ex: dia 25), o sistema gera boletos para todos os responsáveis com matrícula ativa.
- [ ] Cada boleto usa o valor correto (mensalidade × disciplinas, descontos, pró-rata se aplicável).
- [ ] Posso ver um resumo da execução: quantos boletos gerados, quantos com erro.
- [ ] Posso disparar a emissão manualmente ("Forçar agora") para testar ou adiantar.
- [ ] Responsável sem email/telefone não bloqueia o lote — gera o boleto e sinaliza o aviso.

---

### Feature 2.2 — Régua de avisos automáticos

> **User story**
> Como **Orientadora**, quero que o responsável receba avisos automáticos (boleto emitido,
> vencimento próximo, em atraso), para reduzir inadimplência sem eu mandar mensagem.

**Critérios de aceite**
- [ ] Configuro, por escola, quais avisos são enviados e por quais canais (email, WhatsApp, SMS).
- [ ] "Boleto emitido": enviado ao gerar a cobrança.
- [ ] "Vencimento próximo": enviado N dias antes (configurável).
- [ ] "Em atraso": enviado após o vencimento.
- [ ] "Pagamento confirmado": enviado quando paga.
- [ ] Os avisos são enviados pela Asaas (sem custo de infraestrutura nossa de envio).

---

### Feature 2.3 — Multa e juros configuráveis

> **User story**
> Como **Orientadora**, quero definir a multa e os juros de atraso da minha escola,
> para que sejam aplicados automaticamente nos boletos vencidos.

**Critérios de aceite**
- [ ] Configuro multa (%) e juros mensais (%) na tela de configurações da escola.
- [ ] Os valores são aplicados automaticamente em todo boleto emitido.
- [ ] Boletos já emitidos não mudam se eu alterar a configuração depois.
- [ ] Limites de sanidade: multa ≤ 10%, juros ≤ 5% (validação).

---

## Parte 2 — Subsection técnica

### 2.1 — Cron de emissão em lote

`GET /api/cron/emit-batch` (Vercel Cron, dia de fechamento). Para cada unidade com
`asaasEnabled` e `autoEmitOnClosingDay`: lista matrículas ACTIVE → calcula valor →
`createPayment` (épico 01) → grava resumo. Idempotência por `externalReference`.

### 2.2 — Régua de avisos

`PUT /v3/notifications/{event}` por evento, com a API key da subconta:
```json
{ "enabled": true, "emailEnabledForCustomer": true, "whatsappEnabledForCustomer": true, "scheduleOffset": 3 }
```
Eventos: `PAYMENT_CREATED`, `PAYMENT_DUEDATE_WARNING`, `PAYMENT_OVERDUE`, `PAYMENT_RECEIVED`.
`scheduleOffset`: dias antes (warning) ou depois (overdue). UI em `/configuracoes/notificacoes`.

### 2.3 — Multa e juros

Já incluídos no payload de `createPayment` (`fine.value`, `interest.value`) lidos de
`BillingConfig.lateFeePercent` / `interestPercent`. UI em `/configuracoes/cobranca`.

### 2.4 — Schema

Reusa campos do épico 01. Adicionar `BillingConfig.closingDay`, `autoEmitOnClosingDay`
(já existem no projeto — confirmar). Tabela de resumo de execução opcional (`BatchRun`).

### 2.5 — Testes (≥80%)

- Cron: gera para ACTIVE, pula INACTIVE, idempotente, resumo correto.
- Régua: salva config por evento/canal, scheduleOffset correto.
- Multa/juros: aplica da config, valida limites, não afeta boletos antigos.

---

## ✏️ Decisões para você editar

### Q1 — Quem dispara os avisos: Asaas ou nós?
A Asaas envia email/WhatsApp/SMS **nativo** (configurável por `scheduleOffset`). Alternativa:
nós enviamos via Resend/WhatsApp próprio (mais controle de template, mas custo e infra nossa).
- [ ] Asaas envia (recomendado — zero infra, incluso na taxa)
- [ ] Nós enviamos (controle total de template e marca)
- **Sua resposta:** _______________

### Q2 — Dia de fechamento: por escola ou global?
A emissão em lote roda no "dia de fechamento". Cada escola pode ter um dia diferente?
- [ ] Por escola (cada escola configura seu dia — ex: Kumon dia 25, Wizard dia 1)
- [ ] Global (todas no mesmo dia)
- **Sua resposta:** _______________

### Q3 — Régua de atraso: quantos avisos e quando?
A Asaas aceita avisos de atraso em `1, 7, 15, 30` dias após vencimento, e de vencimento
próximo em `0, 5, 10, 15, 30` dias antes. Qual régua padrão?
- **Vencimento próximo (dias antes):** _______________ (ex: 5 e 1)
- **Atraso (dias depois):** _______________ (ex: 1, 7, 15)

### Q4 — Multa/juros: padrão da plataforma ou cada escola define?
- [ ] Padrão Education X (2% multa, 1% juros) — escola pode sobrescrever
- [ ] Cada escola define do zero no onboarding
- **Sua resposta:** _______________

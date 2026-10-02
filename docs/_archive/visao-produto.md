# Education X × Asaas — Visão do Produto

> **Doc-mãe.** Todos os épicos (`01` a `04`) referenciam este documento.
> Aqui ficam: visão, glossário, hierarquia, jornadas macro e decisões duras.
> **Status:** 🟡 Aguardando aprovação do Rafa

---

## 1. O que estamos construindo

Education X é uma plataforma de **gestão de matrículas e cobrança para escolas**.
Qualquer escola — franquia Kumon, Wizard, Cultura Inglesa — usa o Education X para
controlar suas matrículas e cobrar as mensalidades dos responsáveis.

Toda a parte financeira (boleto, PIX, nota fiscal, cartão, negativação) é processada
pela **Asaas**, nosso único provedor de pagamentos. A escola nunca fala com a Asaas
diretamente — ela usa a interface do Education X, e nós cuidamos da integração.

---

## 2. Glossário — fala-se "produto", não "API"

A Asaas usa nomes técnicos que confundem. Dentro do Education X, sempre usamos o termo
de produto. O termo Asaas só aparece nas subsections técnicas.

| Termo no produto | O que é | (termo técnico Asaas) |
|------------------|---------|----------------------|
| **Escola** | A franquia/unidade que é nossa cliente (Kumon Camargos, Wizard) | Subconta |
| **Responsável** | Quem paga a mensalidade — o pai/mãe/responsável do aluno | Customer |
| **Aluno** | A criança/estudante matriculado | — (entidade nossa) |
| **Cobrança** | Um boleto, PIX ou cartão gerado para um Responsável | Payment |
| **Nota Fiscal** | A NFS-e emitida depois que a cobrança é paga | Invoice |
| **Régua de cobrança** | Os avisos automáticos (lembrete, atraso) enviados ao Responsável | Notification settings |
| **Negativação** | Inscrição do CPF do Responsável no SPC/Serasa | Payment Dunning |

---

## 3. Hierarquia — quem é quem

```
Education X  (nossa conta-mãe na Asaas)
│
├── Escola: Kumon Camargos        ← uma subconta Asaas (criada por nós no setup)
│     ├── Responsável: Maria Silva      ← paga a mensalidade do João
│     ├── Responsável: Pedro Souza      ← paga a mensalidade da Ana
│     └── Responsável: ...
│
├── Escola: Wizard Centro          ← outra subconta Asaas
│     └── Responsáveis daquela escola...
│
└── Escola: N                      ← qualquer cliente futuro
```

**Em uma frase:** cada **Escola** é uma **subconta** na Asaas; dentro dela, cada
**Responsável** é um **cliente** cujas cobranças a escola gerencia pelo Education X.

**Por que subconta por escola:**
- O dinheiro das mensalidades cai direto na conta da escola (não passa por nós).
- Cada escola tem suas próprias credenciais, nota fiscal e configurações.
- Nós cobramos um **setup fee** para integrar a escola (criar a subconta + importar alunos).
- Escala para qualquer número de escolas sem misturar dados financeiros.

---

## 4. Jornadas macro

### Jornada A — Onboarding de uma escola (setup fee)
```
Rafa (admin IX) cadastra a escola no Education X
   → Education X cria a subconta Asaas da escola (com nota fiscal e avisos já configurados)
   → Importa os alunos e responsáveis da escola
   → Escola pronta para emitir cobranças
```

### Jornada B — Cobrança mensal (o coração do produto)
```
Todo mês, no dia de fechamento:
   → Education X gera os boletos (com PIX) de todos os responsáveis com matrícula ativa
   → Asaas envia o boleto por email/WhatsApp ao responsável (régua de cobrança)
   → Responsável paga → Asaas avisa o Education X → marcamos como pago
   → Emitimos a nota fiscal automaticamente
```

### Jornada C — Inadimplência
```
Responsável não paga no vencimento
   → Aplica multa + juros automaticamente
   → Régua de atraso: lembretes por email/WhatsApp
   → Persistindo a inadimplência: aviso prévio (obrigatório por lei) + negativação SPC/Serasa
   → Responsável paga → removemos a negativação automaticamente
```

---

## 5. Épicos — ordem de entrega

| # | Épico | Entrega | MVP? |
|---|-------|---------|------|
| [01](./01-epico-boleto-nota-fiscal.md) | **Boleto + Nota Fiscal** | Onboarding + boleto/PIX automático + extras manuais + NFS-e | ⭐ |
| [02](./02-epico-cobranca-automatica.md) | **Cobrança Automática** | Emissão no fechamento + régua de avisos | ⭐ |
| [03](./03-epico-negativacao.md) | **Negativação do Responsável** | SPC/Serasa com aviso legal | ⭐ |
| [05](./05-epico-contratos.md) | **Aceite de Termos** | Clickwrap Escola↔Responsável | ⭐ |
| [06](./06-epico-planos-cancelamento.md) | **Planos e Cancelamento** | Planos, matéria+valor, cancelamento, pro-rata | parcial |
| [04](./04-epico-cartao-credito.md) | **Cartão de Crédito** | Avulso, recorrente, cartões salvos, reembolso, chargeback | pós-MVP |
| [07](./07-epico-portal-responsavel.md) | **Portal do Responsável** | Boletos, histórico, NFS-e, gestão de cartão | pós-MVP |

**Fundação transversal** (pré-requisito do E1): onboarding da escola = criar a subconta +
toda configuração específica da escola (multa, juros, régua, NFS-e, cartão, planos, contratos).

---

## 5.1 Como a IX cobra as escolas (operacional, não é software)

A Education X cobra as escolas (mensalidade SaaS) **direto pelo painel admin da Asaas** —
cadastra a escola como cliente, gera a cobrança/assinatura lá. **Não é software nosso.**
O Education X (este sistema) é o que entregamos **às escolas** para elas cobrarem seus
responsáveis.

## 5.2 Escopo do MVP (Escola → Responsáveis)

| No MVP | Épico |
|--------|-------|
| ✅ Onboarding de escolas (subconta + config + aceite clickwrap) | 01 + 05 |
| ✅ Gestão de invoice (boleto/PIX automático + extras manuais + edição) | 01 |
| ✅ Notas fiscais automáticas | 01 (Feature 1.7) |
| ✅ Autocobrança nativa do Asaas (régua de avisos) | 02 |
| ✅ **Negativação SPC/Serasa** | 03 |
| ✅ Planos + matéria/valor + pro-rata (base da cobrança) | 06 (parcial) |

**Fora do MVP (repriorizar conforme vendas):**
- Portal do Responsável (Épico 07)
- Cartão de crédito + cartões salvos (Épico 04)
- Multa de cancelamento automática (Épico 06 — fase 2)
- Contratos formais / Autentique (Épico 05 — fase 2; MVP usa só clickwrap)

## 5.3 Modelo de entrega — releases semanais

Após o MVP, o produto evolui em **releases semanais** de features novas. Cada release:
- Entrega 1 feature/épico priorizado conforme as vendas pedirem.
- Acompanha **documentação de FAQ** da nova funcionalidade (para o time e para as escolas).
- Segue o gate de qualidade do projeto (testes 80% no código novo, Playwright, PR).

A ordem pós-MVP **não é fixa** — repriorizamos a cada ciclo conforme o feedback dos clientes.

---

## 6. Decisões duras

| # | Decisão | Razão |
|---|---------|-------|
| D1 | Asaas é o único provedor de pagamentos | Sem abstração multi-provider; simplicidade |
| D2 | Uma subconta Asaas por Escola | Dinheiro direto na escola; isolamento; escala |
| D3 | Responsável = cliente Asaas dentro da subconta | Modelo nativo da Asaas |
| D4 | Boleto já inclui PIX (mesmo QR na fatura) | `billingType: BOLETO` traz PIX embutido |
| D5 | Kumon Camargos = primeira Escola, dados do zero | Sem migração de dados da Cora |
| D6 | 80% de cobertura de testes no código novo Asaas | Qualidade desde o início |
| D7 | Credenciais da escola (API key) criptografadas no banco | Segurança LGPD |
| D8 | CPF, email e telefone **obrigatórios** para todo Responsável | Destrava cobrança multicanal + negativação SPC |
| D9 | Nota fiscal emitida **sempre** que a cobrança é paga (automática) | Padrão do produto, não opcional por escola |
| D10 | Cobrança ao cliente por **planos de quantidade** (boletos/alunos), não por taxa Asaas | Medir margem; faixas a definir depois |
| D11 | Taxa de cartão **repassável ao responsável**, configurável por escola | Escola não absorve custo extra do cartão se não quiser |
| D12 | Envio multicanal: email + WhatsApp + **SMS** | Maximizar entrega e reduzir inadimplência |
| D13 | **Toda config específica da escola é no onboarding** (multa, juros, régua, NFS-e, cartão, planos) | Centraliza gestão de clientes da plataforma |
| D14 | Chargeback é **automático**: avisa Orientadora + trata como inadimplência | Sem gestão manual de disputa |
| D15 | Cadeia de **contratos** isenta a IX de disputas (IX↔Escola, Escola↔Responsável) | Blindagem jurídica |
| D16 | IX cobra as escolas **direto pelo painel Asaas** (operacional, não é software nosso) | Asaas já tem admin pronto; foco do código é Escola→Responsável |
| D17 | Planos por escola: mensal/trimestral/semestral/anual, com regras próprias de cancelamento/multa | Flexibilidade por escola |
| D18 | Cancelamento iniciado por **Orientadora** ou **Admin IX** | Operação controlada |
| D19 | Aceite **clickwrap** (eletrônico simples) — válido por MP 2.200-2 + Lei 14.063 + STJ; sem assinatura formal | Legal e sem fricção |
| D20 | Aceite duplo via **link de matrícula**: responsável preenche+aceita, escola aprova+aceita | Fluxo de maior valor |
| D21 | Planos MVP: mensal/tri/sem/anual; **matéria + valor fixo** por escola (Kumon: iguais) | Cobre Kumon e Wizard |
| D22 | Cancelamento MVP **sem multa automática**; escola gera cobrança extra manual (multa = fase 2) | Simplicidade no MVP |
| D23 | **Pro-rata entrada e saída** (proporcional aos dias) | Lei brasileira + prática de mercado |
| D24 | **MVP** = onboarding + invoice + NFS-e + autocobrança Asaas. Resto é pós-MVP | Lançar rápido, validar venda |
| D25 | Pós-MVP em **releases semanais**, cada uma com **FAQ** da feature; ordem repriorizada por vendas | Evolução incremental guiada por mercado |
| D26 | Cartão usa **tokenização Asaas**; guardamos só token + 4 dígitos + bandeira (gestão de cartões) | PCI-safe, sem dado sensível no nosso banco |
| D27 | Sistema entregue é **Escola→Responsável**; cobrança IX→Escola é operacional via Asaas | Foco do código no produto vendido |
| D28 | **Negativação entra no MVP** | Decisão do Rafa — pressão de cobrança desde o início |
| D32 | **Recomeço limpo aproveitando peças** (Clerk, multi-tenant SaaS, Tailwind+shadcn); Cora ignorada; Kumon Camargos = Unidade 01 nova | Código atual tem bugs, não está em produção; onboarding e features são fluxos novos |
| D33 | **Marca única Education X** para todas as escolas (não white-label) | Como Stripe/Asaas — o sistema é produto IX; escola é cliente. Remove tema por tenant |
| D34 | UI = **shadcn + tema IX** (CSS variables: verde #11C76F, amarelo #FBBF24, ink #1A1D21); portar cards/gráficos do DS como locais; **não** manter pacote npm `@impactxlab/design-system` | Baixa manutenção + identidade IX |
| D35 | Protótipo navegável via **Claude Design** (MD files de UI) para o Pimenta vender aos primeiros clientes | Demo de venda fiel às specs antes do código |
| D29 | Emissão de boleto: **automático + extras manuais** (sem lote sob demanda) | Recorrência cobre o volume; manual só p/ multa/avulso |
| D30 | Histórico de aceites: **só admin IX** | Ferramenta de gestão/jurídica da IX |
| D31 | MVP **sem contratos formais** — só aceite clickwrap registrado | Evitar complexidade; clickwrap é juridicamente suficiente |

---

## 7. Status da fundação técnica (já implementado, aguardando aprovação)

O cliente de integração com a Asaas (`src/lib/integration/asaas/`) **já foi escrito**
em modo mock — é a camada que conversa com a API. Não emite nada real ainda
(`ASAAS_MODE=mock`). 65 testes, 96% de cobertura.

⚠️ **Pendência de processo:** este código foi escrito antes da aprovação formal desta
spec. Fica em branch local (`feature/asaas-integration`), sem push, até o Rafa aprovar
esta visão e os épicos. Se algo mudar na modelagem, o código se ajusta.

---

## 8. Glossário técnico Asaas (referência rápida)

- **Sandbox:** `https://sandbox.asaas.com/api/v3` · **Produção:** `https://api.asaas.com/v3`
- **Auth:** header `access_token: {apiKey}` (não é Bearer)
- **Valores:** Asaas usa **reais** (não centavos) — converter na borda do serviço
- **Subconta:** `POST /v3/accounts` → retorna `{ apiKey, walletId }`
- **Webhook:** configurado no momento da criação da subconta

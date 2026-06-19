# Spec — Onboarding da Escola (redesign)

> **Status:** ✅ fechada (Rafa + Claude, 2026-06-19). Pronta pra virar Task Contracts (§8).
> **Fonte de verdade:** código atual (`src/components/onboarding/`, `src/hooks/use-onboarding.ts`, `prisma/schema.prisma`) + PR #9 + protótipo (`specs/prototipo/design-handoff/project/app/screens-a.jsx`).
> **DS:** Alfabeto (do PR #9 e do protótipo).

---

## 1. Objetivo

Repensar o onboarding da escola aproveitando o que já existe (PR #9, 4 passos, autofill CNPJ/CEP), corrigindo os **2 bugs de UX que travam a confiança**, e deixando o fluxo **claro e suave**. É fluxo financeiro core → robustez cirúrgica (qualidade real onde toca dinheiro).

**DoD (Rafa definiu):** poder **cadastrar uma escola com todos os dados necessários** — Unit + BillingConfig + ≥1 Subject criados, com validação que impede dado incompleto/errado e preços claros.

---

## 2. As 2 dores que motivam o redesign (a verdade)

### Dor 1 — Validação de formulário fraca
**Hoje:** o protótipo NÃO tem validação visual (botão "Próximo" sempre ativo, sem erro inline, sem resumo de campos faltando). O código tem validação parcial (`canProceedFromStep`) mas não mostra ao usuário **o que** falta nem **por quê**.
**Queremos:** validação de alta qualidade — campos obrigatórios marcados, erro inline claro (mensagem + cor + foco), resumo de "o que falta" antes de avançar, botão que comunica por que está bloqueado.

### Dor 2 — Preços de matéria confusos / "multiplicando" → MODELO CORRIGIDO (Rafa, 2026-06-19)

**A raiz da confusão (corrigida):** o código atual tratava trimestral/semestral como **valor total do período** (Trimestral 1140 = 3×380) — daí parecer "multiplicação". **O modelo correto é outro:**

> Cada matéria tem até **4 PLANOS**. O "plano" = **período de fidelidade do contrato** (Mensal / Trimestral / Semestral / Anual). Cada plano tem um **nome (o período)** + um **valor que é sempre MENSAL**. **A cobrança é sempre mensal** — o período é o compromisso de contrato, não a frequência de pagamento.
>
> Ex: Matemática — Plano Mensal R$450/mês · Plano Anual R$380/mês (mais barato por fidelizar 12 meses). O pai do plano Anual paga R$380 **todo mês**, comprometido por 1 ano.

**Regras dos planos por matéria:**
- **Mensal** — obrigatório
- **Anual** — obrigatório (Rafa decidiu)
- **Trimestral** — opcional
- **Semestral** — opcional

**Como a escola define o valor (recomendação Claude, filosofia "simplicidade é pré-requisito"):**
- A escola **digita o valor mensal de cada plano** livremente (cada escola tem seu preço).
- O sistema **mostra o desconto automático** ao lado pra ajudar a precificar: "Anual R$380/mês — 16% mais barato que o Mensal". Transparência sem rigidez. **Nunca multiplica** — todo número exibido é por mês.

**Separação plano-IX × matéria (a outra confusão):**
- **Plano IX** (Passo 2) = o que a ESCOLA paga à plataforma (mensalidade da Education X). Microcopy do protótipo já diz: "Nossa mensalidade cobre só a geração de cobrança."
- **Planos de matéria** (Passo 3) = o que o PAI paga à escola. Separação visual inequívoca: passos diferentes, rótulos diferentes ("Sua assinatura Education X" vs "Quanto você cobra das famílias").

---

## 3. Escopo

### In scope
- Os 4 passos do onboarding (Dados · Cobrança/Plano · Matérias · Revisão) com a UX corrigida.
- Validação de form de alta qualidade (Dor 1) — em todos os passos.
- Redesign do bloco de preços de matéria (Dor 2) — 4 valores claros + separação plano/matéria.
- Estados: loading (autofill CNPJ/CEP, submit), erro (validação + API), sucesso.
- Responsivo 3 breakpoints (375/768/1440), Alfabeto.

### 🚫 Not included
- Matrícula do aluno (é outro fluxo).
- Cobrança/boleto real (outro épico).
- Mudança no schema do banco (o schema já suporta os 4 planos — ver §5; não muda).
- Importação em massa de escolas.

---

## 4. Os 4 passos (estrutura — manter, refinar)

| Passo | Coleta | Mudança no redesign (decidido) |
|-------|--------|---------------------|
| 1. Dados | identidade (CNPJ-first), endereço, responsável | validação alta qualidade; manter autofill; **só os campos que o sistema usa** (ver §5 — core ~14; órfãos a investigar) |
| 2. Cobrança + Plano IX | dias, taxas, quem paga, plano IX, desconto | **separar visualmente "Sua assinatura Education X" das taxas**; **linguagem humana** (Rafa): "dia de fechamento" → "quando fechamos a conta do mês"; "2% a.m." em vez de basis points; tooltip do porquê |
| 3. Matérias | nome, código NFS-e, **4 planos** (Mensal/Tri/Sem/Anual) | **redesign dos planos (Dor 2)** — valor mensal por plano + desconto mostrado; mensal+anual obrigatórios |
| 4. Revisão | resumo + submit | mostrar planos de forma clara (por mês, sem multiplicar) antes de criar |

---

## 5. Impacto no dado (decidido)

O schema **já suporta** os 4 planos por matéria (`Subject`): `priceCents` (mensal), `quarterlyPriceCents`, `semiannualPriceCents`, `annualPriceCents`. **Não precisa migration.**
- **Mensal + Anual obrigatórios** (Rafa) = só validação no Zod/hook (`annualPriceCents` passa a required). Schema não muda.
- **Coletar os 4 agora** (Rafa) mesmo a cobrança recorrente ainda não consumir tri/semestral/anual — prepara o futuro. ⚠️ Marcar: são campos coletados-mas-ainda-não-consumidos pela cobrança; documentar pra não parecerem mortos.

### Campos órfãos — INVESTIGAR na implementação (não decidir agora)
A análise (`~/agent-workspace/docs/...`) achou divergências entre coletado e usado. A task que implementar deve **confirmar antes de mexer**:
- `city` + `state`: coletados mas **não enviados ao Asaas** → é bug (corrigir o payload) ou proposital (Asaas não exige)? Verificar `onboarding.service.ts` + integração Asaas.
- `responsibleCpf` + `responsiblePhone`: criptografados/guardados mas **nunca lidos** depois → é compliance LGPD futura (documentar e manter) ou excesso (remover)? Decisão na implementação, com base no uso real.
- `complement`: coletado, nunca passado adiante → opcional, sem impacto.

Campos obrigatórios completos pra Unit "cadastrada": ver `~/agent-workspace/docs/ONBOARDING-MAPPING.md` §9.

---

## 6. Definition of Done (binário)

```
pnpm typecheck && pnpm test:run && pnpm dlx playwright test onboarding --reporter=line
```
+ Como é financeiro (robustez cirúrgica), o teste E2E Playwright deve provar:
1. Preencher os 4 passos com dados válidos → escola criada (Unit+BillingConfig+≥1 Subject).
2. Tentar avançar com campo obrigatório vazio → **bloqueado com erro claro** (Dor 1).
3. Preço de matéria: mensal preenchido, tri/semestral vazios → **aceita** (opcionais); mensal vazio → **bloqueia**.
4. Os 4 valores aparecem sem "multiplicação" confusa (Dor 2).

---

## 7. Decisões fechadas (Rafa, 2026-06-19)

1. ✅ **Planos por matéria:** Mensal + Anual obrigatórios; Trimestral + Semestral opcionais. Plano = período de contrato; valor sempre mensal; cobrança sempre mensal.
2. ✅ **Valor:** escola digita o valor mensal de cada plano livremente; sistema mostra o desconto ("16% mais barato que o mensal"). Nunca multiplica.
3. ✅ **Coletar os 4 planos agora** (prepara futuro), mesmo cobrança recorrente ainda não usar tri/sem/anual.
4. ✅ **Linguagem humana** no Passo 2 (termos técnicos traduzidos + tooltip).
5. ✅ **Passo 1:** manter 1 passo com 3 cards (CNPJ-first revela progressivo, do PR #9); coletar **só o que o sistema usa** (city/state/CPF/phone órfãos → investigar na implementação, §5).
6. ✅ **Separação plano-IX × matéria:** rótulos distintos ("Sua assinatura Education X" vs "Quanto você cobra das famílias").

## 8. Próximo passo
Esta spec vira a fonte do **Task Contract** (arquitetura de agent-dev). A implementação fatia em PRs ≤400 linhas, cada um com DoD binário (§6). Provável fatiamento:
- Fatia 1: validação de form de alta qualidade (Dor 1) — todos os passos.
- Fatia 2: redesign dos planos de matéria (Dor 2) — 4 planos, valor mensal, desconto.
- Fatia 3: linguagem humana + separação plano-IX (Passo 2).
- (cada fatia = 1 Task Contract = 1 PR; WIP=1.)

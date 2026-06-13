<!--
Guia de revisão do Rafa. Preencha as seções; marque os checklists.
Um bom PR = revisão rápida e segura. Apague as linhas que não se aplicam.
-->

## 🎯 O que este PR faz
<!-- 1-2 frases: o resultado que o usuário/sistema ganha. Não "o que mudou no código" — o que passa a funcionar. -->


## 🧩 Tarefa / Épico
<!-- Ex: Tarefa 1 — Cadastro da escola · Deadline: ter 17/jun · Bloco: Núcleo -->
- Tarefa:
- Deadline:
- Depende de (PR/tarefa anterior):

## 🔍 Como revisar (guia pro Rafa)
<!-- O caminho mais rápido pra você validar. Diga ONDE olhar primeiro e O QUE testar no preview. -->
1. **Preview:** <link do deploy de preview>
2. **Fluxo pra testar:** <passo a passo do que clicar/preencher>
3. **Onde está a lógica crítica:** <arquivo:linha do que mais importa revisar>
4. **O que NÃO mudou (pra não revisar à toa):** <…>

## 📐 Decisões tomadas
<!-- Escolhas não óbvias + por quê. Se criou um ADR, linka. Se divergiu do protótipo/plano, explica. -->
- 


## ⚠️ Riscos e pontos de atenção
<!-- O que pode quebrar, o que ficou pra depois (TODO), o que precisa de olho. Seja honesto. -->
- 


---

## ✅ Checklist do autor (Claude preenche antes de pedir review)

**Qualidade e arquitetura**
- [ ] Camadas respeitadas (Component → Hook → Store → Service → API)
- [ ] Nenhum arquivo > 500 linhas
- [ ] Reuso: não dupliquei componente/função que já existe (atomic; tabela usa o DataTable)
- [ ] Nomenclatura inglesa nas entidades (`Unit`, `Guardian`, `Invoice`…)

**Dinheiro e dados (produto financeiro)**
- [ ] Valores em centavos no app; reais só na borda Asaas / frontend
- [ ] Operações Asaas idempotentes; erro → status ERROR + rollback (sem estado órfão)
- [ ] Toda query filtra por `unitId` da sessão (isolamento de tenant)
- [ ] **LGPD:** cartão só token · CPF mascarado na UI · PII fora de logs/URLs

**Testes e gate**
- [ ] TDD seguido; testes cobrem comportamento (não implementação) + casos de erro
- [ ] `pnpm test:run && pnpm typecheck && pnpm lint && pnpm build` passa
- [ ] Playwright nos 3 breakpoints (375 / 768 / 1440) se mexeu em UI
- [ ] Sem secret hardcoded (`${VAR}` / env)

**Asaas (se aplicável)**
- [ ] Testado em **sandbox**; contrato de payload confere com `docs/api-contracts/`
- [ ] Não move dinheiro real sem confirmação explícita

**Crítico → pediu review do `coda-reviewer`?**
- [ ] Schema / auth / tenant / webhook / cobrança / tokenização → sim, revisado pelo agent antes do Rafa

---

## ☑️ Checklist do Rafa (revisão)
- [ ] Abri o preview e testei o fluxo de ponta a ponta
- [ ] A lógica crítica está correta (não só "passa o teste")
- [ ] Concordo com as decisões / ADRs
- [ ] Os riscos listados são aceitáveis
- [ ] **Aprovado pra merge**

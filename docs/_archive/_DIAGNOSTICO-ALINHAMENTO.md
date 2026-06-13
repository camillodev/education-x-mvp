# Diagnóstico de Alinhamento à Missão — para aprovação
> Versão 1.0 · Junho 2026 · **PROPOSTA — nada foi alterado ainda**  
> Lê todos os arquivos da pasta vs. MISSAO-VISAO.md e propõe reestruturação.  
> Prefixo `_` indica documento temporário de trabalho (deletar após aprovação).

---

## Veredito geral

A pasta está **estruturalmente alinhada, com 1 risco crítico e 2 médios.** O perigo não é o que os arquivos dizem — é o que falta: **guardrails explícitos contra virar enterprise complexo.** Vários documentos têm roadmap apontando para fora do nicho (diário de aula, gestão de horários, app) sem nenhuma trava dizendo "isto NÃO entra".

A nova missão exige um princípio que hoje não está escrito em lugar nenhum: **o produto para em matrícula + cobrança. Ponto.**

---

## Status por arquivo

| Arquivo | Status | Risco |
|---------|--------|-------|
| MISSAO-VISAO.md | ✅ Raiz (novo) | — |
| PRICING-STRATEGY.md | ✅ Alinhado | Baixo |
| BRAND-FOUNDATION.md | ✅ Alinhado | Baixo |
| SITE-COPY.md | ✅ Alinhado | Baixo |
| ANALISE-CONCORRENTES.md | ✅ Alinhado | Baixo |
| ICP-FASEADO.md | ✅ Alinhado | Baixo |
| MARKET-SIZING.md | ✅ Alinhado | Baixo |
| BRANDING-INPUT.md | 🟡 Parcial | Médio — "ambição global" pode virar pretexto pra feature creep |
| GTM-PLAN.md | 🟡 Parcial | Médio — "Plano Enterprise" na expansão contradiz missão |
| visao-produto.md | 🟡 Parcial | Médio — arquitetura escalável sem guardrail de escopo |
| MATRIZ-COMPETITIVA.md | 🔴 Contradiz | **Alto** — "Diário/Horários" como "próximo módulo" = caminho pro Sponte |
| ROADMAP-IMPLEMENTACAO.md | 🔴 Contradiz | **Crítico** — sem congelamento de escopo pós-MVP |

---

## Os 3 problemas que importam

### 🔴 CRÍTICO — Falta trava de escopo (MATRIZ + ROADMAP)

A MATRIZ-COMPETITIVA lista "Diário de aula" e "Gestão de horários de professores" como **"próximo módulo, prioridade alta"**. Isso é literalmente o caminho para virar Sponte — sair de cobrança e entrar no pedagógico.

A missão diz o oposto: nicho, uma coisa bem feita, baixa manutenção. Quem precisa de diário já tem em outro lugar — ninguém troca de sistema "porque falta diário". Trocam por cobrança que não falha.

**Proposta:** congelar escopo em matrícula + cobrança + NFS-e + negativação. Mover diário/horários/app/CRM para "fora do escopo — por design". Resposta de venda padrão para pedido fora do escopo: *"Pra isso use [ferramenta X]. A gente faz uma coisa muito bem: não deixa ninguém sem pagar."*

### 🟡 MÉDIO — "Plano Enterprise" no GTM

O GTM-PLAN tem na expansão: *"Plano Enterprise — redes regionais com 10+ unidades, negociação direta com a rede franqueadora."* Isso colide com "venda grande é bônus, não estratégia".

**Proposta:** reescrever para refletir a tensão da missão — venda grande é bem-vinda SE a rede adota o produto simples como ele é; não viramos enterprise para servi-la. Multi-unidade (franqueado com 3–10 unidades) continua válido — é o mesmo pequeno empreendedor, escala horizontal.

### 🟡 MÉDIO — Arquitetura sem guardrail (visao-produto)

A visao-produto descreve arquitetura multi-tenant escalável (correto tecnicamente), mas sem uma seção "o que nunca entra". Arquitetura boa cria tentação de upsell.

**Proposta:** adicionar seção "Fora do escopo — permanente" listando os NÃOs (white-label, customização por cliente, módulo pedagógico, multi-produto).

---

## Reestruturação proposta da pasta

### Hierarquia de documentos (nova ordem lógica)

```
01-visao-estrategia/
│
├── MISSAO-VISAO.md          ⭐ RAIZ — tudo se alinha a este (novo)
│
├── [ESTRATÉGIA]
│   ├── ICP-FASEADO.md        ✅ quem servimos e quando
│   ├── MARKET-SIZING.md      ✅ tamanho do mercado
│   ├── GTM-PLAN.md           🟡 ajustar Plano Enterprise
│   └── PRICING-STRATEGY.md   ✅ ok
│
├── [PRODUTO]
│   ├── visao-produto.md      🟡 adicionar guardrails de escopo
│   └── ROADMAP-IMPLEMENTACAO.md  🔴 adicionar congelamento de escopo
│
├── [COMPETIÇÃO]
│   ├── ANALISE-CONCORRENTES.md   ✅ adicionar 1 linha de posicionamento
│   └── MATRIZ-COMPETITIVA.md     🔴 remover diário/horários do roadmap
│
└── [MARCA]
    ├── BRAND-FOUNDATION.md   ✅ adicionar "o que NÃO somos"
    ├── BRANDING-INPUT.md     🟡 reframe "ambição global"
    └── SITE-COPY.md          ✅ adicionar "foco em uma coisa"
```

### Arquivos que DEVERÍAMOS ter e não temos

| Arquivo proposto | Por quê |
|------------------|---------|
| **PRINCIPIOS-DE-ESCOPO.md** (ou ADR) | Documento curto e definitivo: "o que a Education X nunca será". A trava central que falta. Vira referência para toda decisão de produto e resposta de venda. |
| **MANIFESTO-PRODUTO-NICHO.md** (opcional) | Explica o modelo replicável da Impact X — Education X é o primeiro nicho, mas o método (achar pequeno mal servido → solução simples → baixa manutenção) é o ativo. Útil quando pensar no 2º produto. |

---

## Plano de mudanças (só executo após sua aprovação)

| # | Arquivo | Mudança | Esforço |
|---|---------|---------|---------|
| 1 | **PRINCIPIOS-DE-ESCOPO.md** | Criar — os NÃOs permanentes | Novo |
| 2 | MATRIZ-COMPETITIVA.md | Mover diário/horários de "próximo módulo" → "fora do escopo" | Edição |
| 3 | ROADMAP-IMPLEMENTACAO.md | Adicionar seção "congelamento de escopo pós-MVP" | Edição |
| 4 | GTM-PLAN.md | Reescrever "Plano Enterprise" como tensão consciente (alinhar à missão) | Edição |
| 5 | visao-produto.md | Adicionar "Fora do escopo — permanente" | Edição |
| 6 | BRAND-FOUNDATION.md | Adicionar "O que NÃO somos" | Edição |
| 7 | BRANDING-INPUT.md | Reframe "ambição global" → "especialista em um problema" | Edição |
| 8 | SITE-COPY.md | Adicionar parágrafo "foco em uma coisa e fazer bem" | Edição |
| 9 | ANALISE-CONCORRENTES.md | Adicionar linha de posicionamento vs. Sponte | Edição |

---

## Alinhamento com ICPs e personas

A missão **reforça** o que já definimos em ICP-FASEADO e PERSONAS — não conflita:

- "Pequeno que ninguém olha" = exatamente o franqueado autônomo (Persona 1) e a escola independente (Persona 3)
- "Simplicidade como feature" = responde direto ao gatilho de troca do microfranqueador (preço/complexidade/curva)
- "Não competir com grandes" = confirma Cultura Inglesa como Fase 3 (bônus), não foco
- "Venda grande sem reconstruir produto" = se Kumon migrar por LGPD, vendemos o produto como ele é

**Nada nos ICPs/personas precisa mudar por causa da missão** — eles já estão coerentes. A missão só torna explícito o "porquê" que estava implícito.

---

## Perguntas para você decidir

1. **Aprova criar o PRINCIPIOS-DE-ESCOPO.md** (a trava dos NÃOs)? É a mudança mais importante.
2. **Aprova as 9 edições** acima, ou quer revisar uma a uma antes?
3. **Quer o MANIFESTO-PRODUTO-NICHO.md** (modelo replicável da Impact X), ou deixamos pra quando pensar no 2º produto?
4. **A arquitetura escalável tecnicamente é ok** (multi-tenant), desde que operação/venda/onboarding fiquem focadas no pequeno? (recomendo sim)

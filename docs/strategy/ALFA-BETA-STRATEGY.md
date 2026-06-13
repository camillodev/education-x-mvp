# Estratégia Alfa e Beta — Education X
> Versão 1.0 · 13/jun/2026
> Founder-led. Dois usuários no alfa, ~5–10 no beta. Meta: validar hipóteses H1–H20 antes de vender para fora.

---

## Premissa central

A dor que o produto resolve é **margem comprimida**, não apenas inadimplência.
O franqueado paga 40–45% de royalty sobre faturamento bruto — cada ponto de inadimplência corrói o que sobra.
Automação de cobrança é o produto visível; recuperação de margem é o valor real.

⚠️ **Premissa não-validada:** ainda não sabemos se o ICP articula a dor como "margem" ou como "trabalho manual de cobrança". O alfa serve para descobrir qual narrativa ressoa e medir qual métrica dói mais.

---

## Fase Alfa

### Quem é

**Kumon Camargos** — unidade do Pimenta (sócio comercial do Rafa).

- Usuário primário: **Fran** (opera o financeiro — Persona 2, Ana)
- Usuário secundário: **Pimenta** (dono, decisor — Persona 1, Roberto)
- Escala estimada: ~100–150 alunos ativos ⚠️ (confirmar com Pimenta antes do onboarding)

### Por que este

Acesso total, sem fricção de venda, sem risco de perder o lead. Piloto controlado onde Rafa consegue sentar ao lado de Fran e cronometrar tudo.

**Não é para validar se o produto vende. É para validar se o produto funciona.**

### Número de usuários

1 unidade. Só. Não adicionar segundo alfa enquanto o onboarding do Camargos não estiver documentado e o produto estiver estável.

### Critérios de entrada (todos obrigatórios)

- [ ] MVP núcleo demonstrável (~20/jun) — tela de cobrança funcional no Asaas sandbox
- [ ] Inscrição municipal do Camargos confirmada (para NFS-e — H13)
- [ ] Base de alunos exportada do sistema atual (auditoria de qualidade — H20)
- [ ] Pimenta/Fran com calendário reservado para sessão de onboarding (~30 min)

### O que o alfa valida

| Hipótese | Como medir no alfa | Critério de saída |
|----------|--------------------|-------------------|
| ~~**H9** — Cobrança por aluno vs. matéria~~ ✅ **RESOLVIDA (13/jun): por MATÉRIA** | Não é mais hipótese. Alfa só confirma que o modelo por matéria opera bem no Kumon Camargos | Cobrança por matéria funciona no fluxo real |
| **H10** — Automação elimina trabalho de Fran | Self-report quinzenal de Fran: tempo semanal com cobrança antes/depois | Redução ≥70% após 30 dias |
| **H11** — Onboarding <30 min | Cronometrar: início até 1ª cobrança emitida | Sessão concluída em ≤30 min |
| **H13** — NFS-e desejada | Verificar inscrição municipal + perguntar se ativa | Emissão automática funcional |
| **H18** — Inadimplência ~5%, ticket ~R$550 | Dados reais da base Camargos | Inadimplência 3–8%, ticket R$400–700 |
| **H19** — COGS <R$3/aluno | Fatura Asaas após 30 dias de operação | COGS real abaixo de R$3 |
| **H20** — Dados de importação são tratáveis | Auditar Excel/planilha antes da importação | ≤20% de registros com erro |

**Hipóteses que o alfa NÃO valida** (porque Pimenta é sócio e há viés):
- H1 (urgência da dor), H2 (decisor age sozinho), H6 (WTP generaliza), H16 (demo converte)

### Métricas do alfa

- Tempo de onboarding (minutos, cronometrado)
- Tempo semanal de Fran em cobrança: semana -1 (antes), semana +2, semana +4 (self-report)
- Número de cobranças emitidas automaticamente vs. manuais no mês 1
- Número de erros na importação (registros inválidos / total)
- COGS real (fatura Asaas ao final do mês 1)
- NPS informal: "você indicaria para outro franqueado Kumon?" (pergunta única no dia 30)

### Critério de graduação do alfa → beta

Todos os itens abaixo devem ser verdadeiros:

- [ ] Onboarding documentado (passo a passo com tempos reais)
- [ ] Fran relata redução de trabalho de cobrança (H10 confirmada ou refutada com dado)
- [ ] Produto rodando sem intervenção manual do Rafa por 2 semanas consecutivas
- [ ] Pelo menos 1 ciclo completo de cobrança executado (emissão → vencimento → reconciliação)
- [ ] H13 respondida (impacta modelo de dados — decidir antes de escalar). **H9 já resolvida (por matéria).**

---

## Fase Beta

### Quem são

**Franqueados externos** — fora do círculo direto do Pimenta. Perfil prioritário:

1. Franqueados Kumon de outras unidades com autonomia de compra (mesma dor, mesmo contexto)
2. Donos de microfranquias de reforço (Kumon-like, 50–200 alunos, dono-operador)

⚠️ **Não incluir no beta:** escolas independentes (Persona 3 — ciclo de venda diferente, canal diferente, validar só após PMF com franquias)

### Número de usuários

**5–10 unidades.** Mínimo para ter variância. Máximo para Rafa conseguir fazer onboarding founder-led sem quebrar.

Meta: fechar primeiros betas em julho 2026, operando em agosto.

### Critérios de seleção (lead qualificado)

| Critério | Passa | Não passa |
|----------|-------|-----------|
| Autonomia de compra | Decide sozinho, sem aprovação da rede | Precisa de aprovação da franqueadora |
| Porte | 50–200 alunos | <50 (receita insuficiente) ou >200 (suporte complexo demais agora) |
| Situação atual | Planilha/manual OU sistema insatisfatório (caro, complexo) | Sistema atual satisfatório |
| Disponibilidade | Agenda demo em até 7 dias | Não responde em 7 dias |

### O que o beta valida (além do alfa)

| Hipótese | Como medir | Critério |
|----------|------------|----------|
| **H1** — Dor urgente, não latente | Entrevista de descoberta antes da demo: "quanto você deixou de receber por inadimplência nos últimos 3 meses?" | ≥7/10 relatam dor ativa, com processo manual de cobrança |
| **H2** — Decisor age sozinho | Medir tempo demo → assinatura; perguntar "quem mais precisa ser consultado?" | ≥70% assinam em até 7 dias sem aprovação de terceiros |
| **H4** — Referral entre franqueados | Contar indicações inbound que chegam por conta própria | ≥2 indicações qualificadas nos primeiros 60 dias do beta |
| **H6** — WTP R$400–600 generaliza | Registrar reação ao preço em cada demo; usar âncora Isaac (~R$900) | ≥3/5 aceitam R$349–449 sem objeção de preço como barreira principal |
| **H7** — ICP compara com Isaac/Sponte | Registrar verbatim nas demos: "você chegou a pesquisar outras soluções?" | ≥50% das demos menciona Isaac ou Sponte espontaneamente |
| **H16** — Demo converte ≥30% | Registrar todas as demos (data, empresa, porte, resultado) | ≥30% das demos resultam em contrato em até 14 dias |
| **H17** — Pimenta gera 1–5 leads/semana | Contar leads qualificados gerados por Pimenta em julho | ≥4 leads qualificados (50+ alunos) em 30 dias |
| **H3** — Solução atual é planilha/manual | Pedir para ver a tela no onboarding: "me mostra como você emite cobrança hoje" | ≥60% usam planilha ou processo 100% manual |

⚠️ H12 (clickwrap legalmente defensável) deve ser resolvida **antes** do beta começar — é risco jurídico que afeta todos os contratos beta. Custo estimado: R$500–1.500 (parecer).

### Critérios de entrada no beta

- [ ] Alfa concluído (todos os critérios de graduação atingidos)
- [ ] H13 decidida (impacto na arquitetura). **H9 já resolvida (por matéria); H12 = clickwrap basta pro MVP (parecer formal é pós-MVP).**
- [ ] MVP completo (~30/jun) com pelo menos: cobrança automática + dashboard básico + NFS-e funcional
- [ ] Pimenta com roteiro de prospecção ativo nos grupos de WhatsApp

### Métricas do beta

**Funil comercial:**
- Leads qualificados por semana (meta: 4+/semana via Pimenta — H17)
- Taxa demo → contrato em até 14 dias (meta: ≥30% — H16)
- Tempo médio demo → assinatura (meta: ≤7 dias — H2)

**Produto:**
- Tempo de onboarding por unidade (meta: ≤30 min — H11 generaliza?)
- Churn nos primeiros 60 dias (meta: 0)
- NPS no dia 30 (meta: ≥8 média)

**Validação de mercado:**
- % de usuários que reclamam do sistema atual ao entrar (H3)
- Objeção de preço como barreira principal em demos perdidas (calibra H6)
- Taxa de inadimplência média reportada pelos beta users (calibra H18)

### Critério de saída do beta (entrada em go-to-market aberto)

- [ ] ≥5 unidades pagando por ≥30 dias
- [ ] H1, H2, H6, H16 respondidas com dados reais (não chute)
- [ ] NPS médio ≥8
- [ ] Pelo menos 1 caso de sucesso documentado (com dado: redução de inadimplência ou tempo poupado)
- [ ] Churn = 0 nos primeiros 60 dias de qualquer beta user

---

## Recrutamento de beta sem queimar a franqueadora

A relação com a rede Kumon é ativo, não obstáculo. Regras:

**Fazer:**
- Recrutar via Pimenta (conta própria, contexto de "parceiro que usa e indica")
- Posicionar como "ferramenta do franqueado, não da franqueadora" — o dono contrata, o dono controla
- Só abordar franqueados em grupos informais (amizade/troca de experiência) — nunca grupos oficiais da rede
- Comunicar ao lead: "isso não substitui nem interfere com nenhuma obrigação com a rede"
- Se a franqueadora perguntar: produto resolve cobrança de mensalidade de alunos, não financeiro da rede

**Não fazer:**
- Nunca contactar a franqueadora (Kumon do Brasil) antes de ter 10+ clientes pagantes e caso de sucesso sólido
- Nunca vender como "homologado pela Kumon" — não é e não precisa ser
- Não recrutar em eventos ou comunicados oficiais da rede
- Não prometer feature que precise de integração com o sistema da franqueadora

⚠️ **Premissa não-validada:** assumimos que a Kumon do Brasil não proíbe contratualmente que franqueados usem software próprio de cobrança. Verificar no contrato de franquia do Camargos antes de recrutar betas.

---

## Mapeamento alfa/beta × todas as hipóteses

| # | Hipótese | Fase | Método |
|---|----------|------|--------|
| H1 | Dor urgente | Beta | Entrevista pré-demo |
| H2 | Decisor age sozinho | Beta | Tempo demo→assinatura |
| H3 | Solução atual é planilha | Beta | Ver tela no onboarding |
| H4 | Referral entre franqueados | Beta | Contar indicações inbound |
| H5 | Escola independente = mesmo perfil | Pós-PMF | 5 demos com Cláudia |
| H6 | WTP R$400–600 | Beta | Reação ao preço nas demos |
| H7 | ICP compara com Isaac/Sponte | Beta | Verbatim nas demos |
| H8 | Setup isento remove fricção | Pós-PMF | A/B em propostas |
| ~~H9~~ ✅ resolvida (por matéria, 13/jun) | — | Alfa só confirma operação no fluxo real |
| H10 | Automação elimina trabalho de Fran | **Alfa** | Self-report quinzenal |
| H11 | Onboarding <30 min | **Alfa** + Beta | Cronometrar |
| H12 | Clickwrap legalmente válido | ✅ decidido: clickwrap basta pro MVP | Parecer formal = pós-MVP |
| H13 | NFS-e desejada | **Alfa** | Verificar inscrição municipal |
| H14 | Negativação é diferencial positivo | Beta | Reação nas demos |
| H15 | 4 durações de plano são suficientes | Beta | Pedidos fora do padrão |
| H16 | Demo converte 15–25% (recalibrado de 30%) | Beta | Registrar todas as demos |
| H17 | Pimenta gera 4+ leads/semana | Beta | Contar leads julho |
| H18 | Inadimplência ~5%, ticket ~R$550 | **Alfa** + Beta | Dados reais |
| H19 | COGS <R$3/aluno | **Alfa** | Fatura Asaas mês 1 |
| H20 | Dados de importação tratáveis | **Alfa** | Auditar base antes |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Kumon Camargos tem contrato que proíbe sistemas terceiros de cobrança | Baixa | Alto | Verificar contrato antes de começar o alfa |
| H12 (clickwrap inválido juridicamente) | Média | Alto (jurídico) | Clickwrap basta pro MVP; parecer formal pós-MVP — risco aceito p/ validar |
| Fran não adota (baixa aderência ao produto) | Média | Médio | Onboarding presencial; Rafa acompanha 1ª semana |
| Beta users reclamam para a rede Kumon | Baixa | Alto (relação franqueadora) | Script de recrutamento sem menção à Kumon como canal; posicionamento neutro |
| WTP real < R$349 (H6 falsa) | Média | Alto (unit economics) | Descobrir no beta antes de contratar mais time |
| Pimenta não gera leads (H17 falsa) | Média | Médio | Rafa assume outreach direto via LinkedIn/WhatsApp se ≤2 leads em 2 semanas |

---

## Cronograma resumido

| Data | Marco |
|------|-------|
| ~20/jun | MVP núcleo demonstrável — iniciar alfa (onboarding Camargos) |
| ~30/jun | MVP completo — alfa estabilizado |
| **Jul/2026** | Beta: recrutar 5–10 unidades, demos, primeiras assinaturas |
| **Ago/2026** | Beta operando: medir métricas, coletar NPS, 1º caso de sucesso |
| **Set/2026** | Decisão: critérios de saída do beta atingidos? → go-to-market aberto |

---

*Fontes: HIPOTESES-VALIDACAO.md · 00-PERSONAS.md · ICP-FASEADO.md · GTM-PLAN.md · ROADMAP-IMPLEMENTACAO.md (archive)*

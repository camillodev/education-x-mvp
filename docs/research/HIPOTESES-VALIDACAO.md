# Hipóteses e Plano de Validação — Education X
> Versão 1.0 · Junho 2026  
> Consolidado a partir de GTM-PLAN, PRICING-STRATEGY, ANALISE-CONCORRENTES,  
> MATRIZ-COMPETITIVA, visao-produto, personas e jornadas.  
> Organizado por categoria e criticidade.

---

## Como usar este documento

- **🔴 Crítica:** valide antes de investir mais desenvolvimento ou vendas nessa direção
- **🟡 Importante:** valide nos primeiros 30–60 dias de uso real
- **🟢 Secundária:** valide após PMF, não bloqueia o MVP

Cada hipótese tem: o que assumimos, como testar, critério de sucesso e o que muda se for falsa.

---

## Bloco 1 — Mercado e ICP

### H1 — A dor de inadimplência é urgente o suficiente para gerar ação imediata
**O que assumimos:** franqueados e donos de escola estão ativamente incomodados com inadimplência todo mês — não apenas "seria bom resolver um dia".  
**Status:** 🔴 Crítica — não validada com externos  
**Como testar:** 10 entrevistas com donos de franquias fora da rede Kumon. Pergunta-chave: "Quanto você deixou de receber nos últimos 3 meses por inadimplência? O que você faz hoje quando alguém não paga?"  
**Critério de sucesso:** ≥7/10 relatam inadimplência como problema ativo (não latente) e descrevem processo manual de cobrança  
**Se for falsa:** a dor é latente, não urgente — o GTM precisa criar senso de urgência em vez de apenas resolver o problema

---

### H2 — O decisor age sozinho e decide rápido quando vê ROI
**O que assumimos:** o dono da franquia não precisa de aprovação de sócio, contador ou franqueadora para contratar um SaaS de R$ 450–600/mês.  
**Status:** 🔴 Crítica  
**Como testar:** nas primeiras 10 demos, perguntar "Quem mais precisa ser consultado antes da decisão?" e medir tempo entre demo e assinatura.  
**Critério de sucesso:** ≥70% assinam em até 7 dias após a demo, sem aprovação de terceiros  
**Se for falsa:** o ciclo de venda é mais longo e precisa de material para múltiplos stakeholders

---

### H3 — A solução atual é planilha + boleto manual + WhatsApp pessoal
**O que assumimos:** o ICP não usa nenhum sistema de gestão financeira — ou usa algo tão ruim que consideraria trocar facilmente.  
**Status:** 🟡 Importante  
**Como testar:** nas entrevistas de descoberta, perguntar "Me mostra como você emite cobrança hoje" (pedir pra ver a tela, se remoto).  
**Critério de sucesso:** ≥60% usam planilha ou processo 100% manual; ≤20% têm sistema atual satisfatório  
**Se for falsa:** há um sistema instalado que precisa ser desinstalado — o argumento de venda muda para "migração" e a objeção principal é troca de custo e aprendizado

---

### H4 — Franqueados da mesma rede se falam e indicam uns aos outros
**O que assumimos:** o canal de referral entre franqueados é real — grupos de WhatsApp ativos, encontros de rede, comunidade.  
**Status:** 🟡 Importante  
**Como testar:** no piloto Kumon Camargos, medir quantas indicações chegam espontaneamente nos primeiros 60 dias. Pedir ao Pimenta que liste os grupos de que participa.  
**Critério de sucesso:** ≥2 indicações qualificadas nos primeiros 60 dias do piloto  
**Se for falsa:** o canal de referral não funciona — o GTM precisa de canal alternativo (LinkedIn, Google Ads, cold outreach direto)

---

### H5 — Escolas independentes têm a mesma dor e o mesmo perfil de compra que franquias
**O que assumimos:** donos de escola privada básica não-franqueada têm dor equivalente e decidem com velocidade similar.  
**Status:** 🟢 Secundária (validar após 20 clientes de franquia)  
**Como testar:** após PMF com franquias, fazer 5 demos com donos de escola independente e comparar ciclo de venda e taxa de conversão  
**Critério de sucesso:** taxa de conversão demo→contrato ≥20% (vs. 30%+ esperado em franquias)  
**Se for falsa:** escola independente precisa de GTM separado — canal diferente, argumento diferente, talvez preço diferente

---

## Bloco 2 — Pricing e WTP

### H6 — WTP é R$ 400–600/mês para franqueados com 50–200 alunos
**O que assumimos:** o único dado de WTP que temos (Pimenta, R$ 400–500) generaliza para o mercado. Pimenta é sócio comercial — há viés.  
**Status:** 🔴 Crítica — dado interno, não validado externamente  
**Como testar:** 3–5 entrevistas com franqueados externos (não Kumon Camargos, não conhecidos de Pimenta). Usar âncora competitiva: "Você sabe que o Isaac cobra ~R$ 900/mês? O que você pagaria por uma solução mais simples e fixo?"  
**Critério de sucesso:** ≥3/5 aceitam faixa R$ 349–449 sem objeção de preço como barreira principal  
**Se for falsa:** WTP real pode ser R$ 200–300 — precisa revisar planos ou focar em escolas maiores (200+ alunos)

---

### H7 — O ICP compara o produto com Isaac/Sponte, não com ERPs genéricos baratos
**O que assumimos:** quando o dono pesquisa solução, pensa em "gestão financeira escolar" e encontra Isaac/Sponte como referência, não DK Soft ou SPE.  
**Status:** 🟡 Importante  
**Como testar:** nas demos, perguntar "Você chegou a pesquisar outras soluções? O que você encontrou?" e registrar as respostas.  
**Critério de sucesso:** ≥50% das demos menciona Isaac, Sponte ou Educbank espontaneamente  
**Se for falsa:** o ICP não conhece Isaac/Sponte — o argumento de ancoragem de preço perde força; precisamos de outro ângulo de comparação

---

### H8 — Setup isento remove a principal fricção de entrada
**O que assumimos:** o maior bloqueador de conversão é o custo de setup, não o preço mensal.  
**Status:** 🟡 Importante  
**Como testar:** A/B na abordagem comercial: 50% recebem proposta com setup isento; 50% recebem com setup R$ 748 (50% off anual). Medir taxa de conversão.  
**Critério de sucesso:** versão com setup isento converte ≥2x mais que versão com setup  
**Se for falsa:** a fricção é outra (confiança no produto, medo de migração, preço mensal) — realocar o "desconto" para outra alavanca

---

### H9 — Cobrança por aluno ativo é a métrica certa (vs. por matéria)
**O que assumimos:** aluno é a unidade de cobrança correta para o ICP, inclusive Kumon (que internamente cobra por matéria).  
**Status:** 🔴 Crítica — decisão arquitetural pendente  
**Como testar:** perguntar diretamente ao Pimenta e a 3 outros franqueados Kumon: "Você prefere pagar por aluno ou por matéria? Por quê?" e entender como eles comunicam o preço internamente.  
**Critério de sucesso:** ≥60% preferem ou aceitam faturamento por aluno ativo  
**Se for falsa:** precisa criar faixa por matéria — impacto direto no modelo de dados e na tabela de preços

---

## Bloco 3 — Produto e Funcionalidades

### H10 — Automação completa de cobrança (emissão + envio + régua) elimina o principal trabalho de Fran
**O que assumimos:** se a cobrança rodar sozinha, Fran libera ~2h/mês e reduz estresse com inadimplência. Isso é o valor central do produto.  
**Status:** 🟡 Importante  
**Como testar:** no piloto Kumon Camargos, medir tempo gasto por Fran com cobrança antes e depois (self-report quinzenal).  
**Critério de sucesso:** redução de ≥70% no tempo declarado com tarefas de cobrança após 30 dias  
**Se for falsa:** o valor não está na automação, mas em outra funcionalidade — precisa entender onde está o real ganho

---

### H11 — Onboarding em <30 min é viável (do zero até 1ª cobrança emitida)
**O que assumimos:** com o wizard de onboarding, criar subconta Asaas + importar alunos + configurar régua + emitir 1ª cobrança leva menos de 30 minutos.  
**Status:** 🟡 Importante  
**Como testar:** medir tempo real no onboarding do Kumon Camargos; cronometrar cada fase.  
**Critério de sucesso:** onboarding completo em <30 min, com 1ª cobrança emitida no mesmo dia  
**Se for falsa:** onboarding é gargalo — precisa de simplificação ou de um serviço gerenciado de implantação

---

### H12 — Clickwrap (aceite eletrônico simples) é legalmente defensável no contexto B2C escolar
**O que assumimos:** o aceite via checkbox no link de matrícula é válido juridicamente contra o CDC e o Código Civil.  
**Status:** 🔴 Crítica — risco jurídico  
**Como testar:** consultar advogado especializado em direito do consumidor e contratos eletrônicos. Custo: ~R$ 500–1.500 por parecer.  
**Critério de sucesso:** parecer jurídico confirma validade do clickwrap com os campos de IP + timestamp + versão do termo  
**Se for falsa:** precisa de assinatura eletrônica (DocuSign, Autentique) — aumenta fricção no onboarding do responsável

---

### H13 — NFS-e automática é desejada por 100% das escolas (sem exceção)
**O que assumimos:** todas as escolas querem emitir nota fiscal automaticamente a cada pagamento.  
**Status:** 🟡 Importante  
**Como testar:** no onboarding do piloto, verificar se Kumon Camargos tem inscrição municipal ativa. Perguntar a 5 outros prospects se emitem NFS-e hoje.  
**Critério de sucesso:** ≥80% têm inscrição municipal e querem automação de NFS-e  
**Se for falsa:** NFS-e deve ser opcional no onboarding — não bloquear escolas sem inscrição municipal

---

### H14 — Negativação SPC/Serasa é diferencial de venda relevante (não assusta o dono)
**O que assumimos:** o dono vê negativação como ferramenta de cobrança, não como risco jurídico.  
**Status:** 🟡 Importante  
**Como testar:** nas demos, apresentar negativação como feature e medir reação (entusiasmo vs. preocupação). Registrar verbatim.  
**Critério de sucesso:** ≥60% reagem positivamente ("quero isso") vs. negativamente ("tenho medo")  
**Se for falsa:** negativação divide o público — posicionar como feature avançada (opt-in), não como padrão do produto

---

### H15 — 4 durações de plano (mensal/trimestral/semestral/anual) cobrem todos os casos de uso
**O que assumimos:** as 4 opções de duração são suficientes para o mercado — sem necessidade de plano semanal, bimestral ou personalizado.  
**Status:** 🟢 Secundária  
**Como testar:** nos primeiros 20 onboardings, registrar se alguma escola pediu duração diferente.  
**Critério de sucesso:** ≤10% dos clientes pedem duração fora do padrão  
**Se for falsa:** adicionar plano bimestral ou personalizado — baixo impacto técnico

---

## Bloco 4 — Canal e Vendas

### H16 — Demo de 20 min por Zoom converte ≥30% em contrato
**O que assumimos:** uma demo de 20 minutos é suficiente para o decisor entender o valor e assinar.  
**Status:** 🔴 Crítica — sem baseline  
**Como testar:** registrar todas as demos realizadas (data, empresa, porte, resultado) a partir da primeira. Calcular taxa após 10 demos.  
**Critério de sucesso:** ≥30% das demos resultam em contrato assinado em até 14 dias  
**Se for falsa:** a demo não converte sozinha — precisa de follow-up estruturado, trial gratuito, ou caso de sucesso do piloto como âncora

---

### H17 — Pimenta consegue prospectar 1–5 leads qualificados por semana
**O que assumimos:** o canal de venda via Pimenta (grupos de WhatsApp, rede de franqueados) gera volume suficiente para o funil.  
**Status:** 🟡 Importante  
**Como testar:** medir leads gerados por Pimenta nos primeiros 30 dias (julho 2026).  
**Critério de sucesso:** ≥4 leads qualificados (donos de franquia, 50+ alunos) em 30 dias  
**Se for falsa:** Pimenta não escala como canal — Rafa precisa fazer outreach direto; reavaliar parceria comercial

---

### H18 — Taxa de inadimplência típica no ICP é ~5% e ticket médio ~R$ 550/aluno/mês
**O que assumimos:** os números usados no argumento de ROI ("payback em 5 dias") são representativos do mercado.  
**Status:** 🟡 Importante  
**Como testar:** no piloto Kumon Camargos, medir inadimplência real e ticket médio. Cruzar com 3–5 entrevistas com outros donos.  
**Critério de sucesso:** inadimplência real entre 3–8% e ticket médio entre R$ 400–700  
**Se for falsa:** o argumento de ROI precisa ser recalibrado com números reais — pode ser mais forte ou mais fraco

---

## Bloco 5 — Operacional e Técnico

### H19 — COGS real é ~R$ 1–2 por aluno por mês (margem >95%)
**O que assumimos:** os custos de PIX (gratuito), boleto (R$ 1,99 só se pago), WhatsApp (~R$ 0,55/msg) e SMS resultam em custo desprezível.  
**Status:** 🟡 Importante  
**Como testar:** medir custos reais na Asaas após 1 mês de operação com o piloto.  
**Critério de sucesso:** COGS real <R$ 3/aluno/mês no piloto  
**Se for falsa:** margin pode ser menor que 95% — revisar pricing ou renegociar condições Asaas

---

### H20 — Dados sujos na importação de alunos são tratáveis no onboarding
**O que assumimos:** as bases de dados que os clientes trazem (Excel, planilha) têm qualidade suficiente para importação com limpeza básica.  
**Status:** 🟡 Importante  
**Como testar:** auditar a base de alunos do Kumon Camargos antes da importação.  
**Critério de sucesso:** ≤20% dos registros precisam de correção manual  
**Se for falsa:** importação é gargalo — precisa de ferramenta de limpeza de dados ou serviço de migração assistida

---

## Resumo executivo — prioridade de validação

### Validar ANTES do lançamento (julho 2026)

| # | Hipótese | Método | Responsável |
|---|----------|--------|-------------|
| H1 | Dor de inadimplência é urgente | 10 entrevistas externas | Rafa |
| H6 | WTP R$ 400–600 generaliza | 3–5 entrevistas externas | Rafa |
| H9 | Cobrança por aluno (vs. matéria) | Entrevista direta Pimenta + 3 franqueados | Rafa |
| H12 | Clickwrap é legalmente defensável | Parecer jurídico | Rafa (contratar advogado) |
| H16 | Demo converte ≥30% | Registrar todas as demos | Rafa |

### Validar NO PILOTO (julho–agosto 2026)

| # | Hipótese | Método | Responsável |
|---|----------|--------|-------------|
| H2 | Decisor age sozinho | Medir tempo demo→contrato | Rafa |
| H4 | Referral entre franqueados funciona | Contar indicações espontâneas | Pimenta |
| H7 | ICP compara com Isaac/Sponte | Registrar verbatim em demos | Rafa |
| H10 | Automação elimina trabalho de Fran | Self-report quinzenal | Fran |
| H11 | Onboarding <30 min | Cronometrar no piloto | Rafa |
| H13 | NFS-e desejada por todos | Verificar inscrição municipal nos leads | Rafa |
| H17 | Pimenta gera 1–5 leads/semana | Contar leads em julho | Pimenta |
| H18 | Inadimplência ~5%, ticket ~R$ 550 | Dados reais do Kumon Camargos | Rafa |
| H19 | COGS <R$ 3/aluno | Fatura Asaas após 1 mês | Rafa |

### Validar PÓS-PMF (após 20 clientes)

| # | Hipótese | Método |
|---|----------|--------|
| H3 | Solução atual é planilha/manual | Auditoria em 20 onboardings |
| H5 | Escola independente = mesmo perfil | 5 demos com escola básica privada |
| H8 | Setup isento remove fricção | A/B em propostas |
| H14 | Negativação é diferencial positivo | Registrar reação em demos |
| H15 | 4 durações de plano são suficientes | Pedidos fora do padrão nos onboardings |
| H20 | Dados de importação são tratáveis | Auditar bases dos clientes |

---

*Fontes: GTM-PLAN.md · PRICING-STRATEGY.md · ANALISE-CONCORRENTES.md · MATRIZ-COMPETITIVA.md · visao-produto.md · 00-PERSONAS.md · 02-JORNADAS-USUARIO.md · MARKET-SIZING.md*

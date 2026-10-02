---
name: decision-questions-framework
description: Use quando o usuário estiver decidindo entre construir algo internamente (build) versus comprar/contratar/terceirizar uma solução pronta (buy) — para produto, ferramenta interna, ou até decisões de desenvolvimento pessoal/carreira.
---

# Decision-Making Questions Framework: Build vs. Buy

## O que é

Um framework estruturado de perguntas para avaliar a decisão de **construir internamente** uma solução versus **comprar/adotar** uma solução pronta. Originário do curso Udacity "Digital Transformation for Business Leaders" (seção Data Science & Analytics), generalizável para qualquer contexto: tecnologia, produto, carreira, desenvolvimento pessoal ou negócio.

A decisão build vs. buy envolve três opções:
- **Build**: Construir/desenvolver internamente (controle total, maior investimento inicial)
- **Buy**: Adquirir/terceirizar uma solução pronta (mais rápido, menos controle)
- **Hybrid**: Combinar os dois (comprar base + customizar internamente)

---

## Quando usar

✓ **Decisões de produto/tecnologia:**
- Construir um sistema de pagamento customizado vs. integrar Stripe/Asaas
- Desenvolver um CRM próprio vs. contratar Salesforce/Pipelify
- Criar uma ferramenta interna de análise vs. comprar um BI pronto (Power BI, Tableau)
- Construir API própria vs. usar serviço third-party

✓ **Decisões de negócio:**
- Montar um time de marketing interno vs. contratar agência
- Construir infraestrutura de datacenter vs. usar cloud (AWS, Vercel, Supabase)
- Desenvolver módulo de IA próprio vs. usar API de terceiro (OpenAI, Anthropic)

✓ **Decisões de carreira/vida:**
- Aprender uma skill nova vs. contratar alguém que já domina
- Construir um portfolio/certificação próprio vs. pagar um curso pronto
- Fazer mentoria com especialista vs. estudar sozinho
- Gerenciar financeiro próprio vs. contratar consultor

---

## As Perguntas-Chave

### 1. **Tempo de Desenvolvimento/Implementação**
**Pergunta:** Quanto tempo levaria para construir/aprender isso internamente versus implementar uma solução pronta?

**Por que importa:**
- Build tem curva de desenvolvimento (pesquisa → prototipagem → testes → produção)
- Buy é geralmente mais rápido (setup inicial, onboarding, customização menor)
- Considerar **time-to-value** (quando começa a gerar retorno)

**Aplicações:**
- *Produto:* "Construir sistema de cobrança do zero leva 6 meses vs. Asaas em 2 semanas"
- *Carreira:* "Aprender machine learning do zero leva 1 ano vs. contratar um ML engineer"
- *Pessoal:* "Estudar inglês sozinho leva 2 anos vs. curso intensivo em 6 meses"

---

### 2. **Recursos Adicionais Necessários (Integração)**
**Pergunta:** Quais recursos (time, ferramentas, integrações, infraestrutura) são necessários para fazer funcionar?

**Por que importa:**
- Build exige: engenharia, manutenção, suporte técnico, treinamento
- Buy exige: adaptação, configuração, integrações com sistemas existentes
- Custos ocultos aparecem aqui (tempo de equipe, ferramentas auxiliares)

**Aplicações:**
- *Produto:* "Construir: preciso de 2 devs + DBA. Buy: 1 pessoa para integração + setup"
- *Negócio:* "Build datawarehouse: DBA, cloud costs, ferramentas ETL. Buy: analytics tool pronto"
- *Carreira:* "Aprender design: você mesmo + cursos. Contratar: poupa 40h/mês do seu tempo"

---

### 3. **Implicações de Custo (TCO - Total Cost of Ownership)**
**Pergunta:** Qual é o custo total (inicial + operacional + oportunidade)?

**Por que importa:**
- Build: investimento inicial alto, custos operacionais contínuos (salários, manutenção, upgrades)
- Buy: custos recorrentes (SaaS mensal, licensing), menos capex, mais previsível
- Considerar custo de oportunidade (tempo que poderia estar em outra coisa)

**Aplicações:**
- *Produto:* "Build: R$500k dev + R$50k/mês manutenção. Buy: R$15k/mês SaaS por 3 anos = R$540k"
- *Negócio:* "Build marketing team: 5 pessoas x R$20k = R$100k/mês. Buy agência: R$30k/mês"
- *Pessoal:* "Aprender sozinho: grátis + 500 horas seu tempo (R$50k custo oportunidade). Contratar mentor: R$8k direto"

---

### 4. **Métricas de Qualidade/Avaliação**
**Pergunta:** Como você vai medir se funciona bem? Quais métricas importam?

**Por que importa:**
- Build: qualidade depende da sua execução (risco é seu)
- Buy: qualidade vem com SLA (Service Level Agreement) e reputação do vendor
- Diferente para cada contexto (performance, confiabilidade, usabilidade, suporte)

**Aplicações:**
- *Produto:* "Build: uptime 99%, latência <100ms. Buy: SLA garante 99.9%, suporte 24/7"
- *Negócio:* "Build marketing: ROI, CAC, MRR crescimento. Buy agência: MRR, retenção, churn"
- *Carreira:* "Aprender sozinho: você controla ritmo, profundidade. Contratar: mentoria responsabiliza pelo resultado"

---

### 5. **Importância de Controle/Diferenciação (Propriedade Intelectual)**
**Pergunta:** Que tão crítico é isso para o seu negócio? É um diferencial competitivo ou commodidade?

**Por que importa:**
- **Build é favorável quando:** dados sensíveis, diferencial competitivo, propriedade intelectual crítica
- **Buy é favorável quando:** função genérica, commodidade, não é vantagem competitiva
- Equilíbrio entre inovação (build próprio) e velocidade (buy pronto)

**Aplicações:**
- *Produto:* "Build: algoritmo de recomendação é segredo da Netflix. Buy: email marketing é commodity, usa SendGrid"
- *Negócio:* "Build: seu modelo de dados único é diferencial. Buy: infraestrutura de cloud genérica"
- *Carreira:* "Build: sua metodologia própria é marca pessoal. Buy: ferramentas de gestão padrão"

---

## Passo a Passo

1. **Responda cada pergunta objetivamente** (sem viés emocional)
   - Use dados reais quando possível
   - Consulte precedentes similares
   - Envolva a equipe que vai fazer a coisa

2. **Calcule o custo total de propriedade (TCO) de ambas**
   - Build: investimento inicial + custos anuais de manutenção × horizonte de tempo
   - Buy: custo mensal/anual × horizonte de tempo
   - Inclua custo de oportunidade (seu tempo vale X por hora)

3. **Pese controle vs. velocidade**
   - Build favorece: controle, IP próprio, diferencial competitivo
   - Buy favorece: time-to-market, previsibilidade, suporte externo

4. **Considere o hybrid**
   - Muitas vezes a resposta é "compro a base + customizo"
   - Exemplo: "Compro Stripe + monto lógica de billing customizada"

5. **Decida** baseado no padrão:
   - **Dados proprietários/sensíveis** → Build (mais controle)
   - **Funções genéricas/commodities** → Buy (mais velocidade)
   - **Diferencial competitivo** → Build (controle)
   - **Problema urgente** → Buy (time-to-value)

---

## Template Pronto para Uso

Copie, preencha e use:

```markdown
## Decisão: Build vs. Buy — [Nome da Decisão]

**Data:** [data]  
**Responsável:** [seu nome]  
**Horizonte:** [quanto tempo? 1 ano? 3 anos?]

---

### 1. Tempo de Desenvolvimento/Implementação

**Build (construir internamente):**
- [ ] Quanto tempo levaria para ficar pronto? ___ horas/dias/meses
- [ ] Quando começaria a gerar valor? ___ (data)

**Buy (comprar/contratar pronto):**
- [ ] Quanto tempo para setup + onboarding? ___ dias
- [ ] Quando começa a funcionar? ___ (data)

**Vencedor:** ☐ Build  ☐ Buy  ☐ Empate

---

### 2. Recursos Adicionais Necessários

**Build (o que você precisa?):**
- [ ] Pessoal: ___ pessoas, custo R$ ___/mês
- [ ] Ferramentas/Infraestrutura: ___ (quais?)
- [ ] Treinamento/Onboarding: ___ horas
- [ ] Manutenção contínua: ___ horas/mês

**Buy (o que é necessário para integrar?):**
- [ ] Pessoal de integração: ___ horas
- [ ] Customizações necessárias: ___
- [ ] Treinamento de uso: ___ horas
- [ ] Suporte/Help desk: ___

**Vencedor:** ☐ Build  ☐ Buy  ☐ Empate

---

### 3. Implicações de Custo (TCO)

**Build:**
- Investimento inicial: R$ ___
- Custo operacional/mês: R$ ___
- Manutenção/upgrades/ano: R$ ___
- Custo de oportunidade (tempo): R$ ___
- **TOTAL 3 ANOS:** R$ ___

**Buy:**
- Custo mensal: R$ ___
- Customizações: R$ ___
- Suporte/premium: R$ ___
- **TOTAL 3 ANOS:** R$ ___

**Vencedor:** ☐ Build  ☐ Buy  ☐ Empate

---

### 4. Métricas de Qualidade/Avaliação

**Build:**
- Como você mede sucesso? (ex: uptime 99%, latência <50ms)
  - [ ] Métrica 1: ___
  - [ ] Métrica 2: ___
  - [ ] Métrica 3: ___
- Risco: você é responsável por atingir

**Buy:**
- Como o vendor garante qualidade?
  - [ ] SLA: ___ (ex: 99.9% uptime)
  - [ ] Support: ___ (ex: 24h response)
  - [ ] Reputação/reviews: ___ score
- Vantagem: vendor é responsável

**Vencedor:** ☐ Build  ☐ Buy  ☐ Empate

---

### 5. Importância de Controle/Diferenciação

**É diferencial competitivo?**
- ☐ Sim, crítico para o negócio → FAVORECE BUILD
- ☐ Não, é commodidade → FAVORECE BUY
- ☐ Parcialmente, alguns módulos sim

**Controle:**
- ☐ Preciso de controle total → BUILD
- ☐ Controle parcial está ok → HYBRID
- ☐ Não preciso controlar → BUY

**Vencedor:** ☐ Build  ☐ Buy  ☐ Hybrid

---

### RECOMENDAÇÃO FINAL

| Critério | Build | Buy | Hybrid |
|----------|-------|-----|--------|
| 1. Tempo | ☐ | ☐ | ☐ |
| 2. Recursos | ☐ | ☐ | ☐ |
| 3. Custo | ☐ | ☐ | ☐ |
| 4. Qualidade | ☐ | ☐ | ☐ |
| 5. Controle | ☐ | ☐ | ☐ |
| **TOTAL** | **☐** | **☐** | **☐** |

**DECISÃO:** _______________

**Fundamentação:** (resumo do porquê)
___________________________________________________________________________

**Próximos passos:**
1. [ ] ___
2. [ ] ___
3. [ ] ___
```

---

## Exemplo Aplicado: Decidindo sobre Sistema de Pagamento para SaaS

**Contexto:** Startup com 5k MRR quer processar pagamentos. Começar: construir sistema próprio ou usar Asaas?

---

### 1. Tempo

**Build (próprio):**
- Desenvolvimento: 3-4 meses (payment gateway, webhooks, PCI compliance)
- Pronto para produção: mês 4
- **Impacto:** Atrasa go-to-market em 4 meses

**Buy (Asaas):**
- Setup + integração: 1-2 semanas
- Pronto para cobrar: semana 2
- **Impacto:** Começa a cobrar imediatamente

**Vencedor:** 🏆 BUY (16x mais rápido)

---

### 2. Recursos

**Build:**
- 1 dev backend (6 meses, R$ 20k/mês) = R$ 120k
- 1 dev frontend para checkout (3 meses, R$ 15k) = R$ 45k
- Infrastructure/PCI compliance: R$ 10k
- Manutenção contínua: 20h/mês (R$ 8k/mês)

**Buy:**
- 1 pessoa para integração (40h) = R$ 3k
- Documentação/testes: 20h = R$ 1.5k
- Setup de conta: 5h = R$ 500
- **Recurso total:** R$ 5k (vs. R$ 165k)

**Vencedor:** 🏆 BUY (33x menor investimento)

---

### 3. Custo TCO (3 Anos)

**Build:**
- Dev inicial: R$ 165k
- Manutenção/mês (2 devs part-time): R$ 15k × 36 = R$ 540k
- Compliance/upgrades: R$ 50k
- **TOTAL 3 ANOS: R$ 755k**

**Buy (Asaas):**
- Setup: R$ 5k
- Tarifa (2.99% + R$ 0.99 por transação):
  - Ano 1: R$ 5k MRR × 2.99% × 12 = R$ 18k + taxa fixa
  - Ano 2: R$ 10k MRR × 2.99% × 12 = R$ 36k
  - Ano 3: R$ 15k MRR × 2.99% × 12 = R$ 54k
  - Subtotal 3 anos: ~R$ 110k + R$ 5k = **R$ 115k**

**Vencedor:** 🏆 BUY (R$ 755k vs R$ 115k = 6,5x mais barato)

---

### 4. Qualidade/Métricas

**Build:**
- Uptime depende de você
- PCI compliance é responsabilidade sua
- Bugs afetam receita diretamente
- **Risco:** Médio-Alto

**Buy (Asaas):**
- SLA 99.9% uptime garantido
- PCI DSS Compliance gerenciado
- Suporte 24/7
- Já processou bilhões em transações
- **Risco:** Baixo

**Vencedor:** 🏆 BUY (reduz risco operacional)

---

### 5. Controle/Diferenciação

**É checkout o diferencial de uma fintech?**
- ❌ Não. Checkout é commodity
- ✓ O diferencial é: análise de risco, retenção, UX do produto
- Asaas já faz bem a parte "aborrecida"

**Vencedor:** 🏆 BUY (deixe commodity para especialista)

---

### RECOMENDAÇÃO FINAL

| Critério | Build | Buy | Hybrid |
|----------|-------|-----|--------|
| 1. Tempo | ❌ | ✅✅✅ | |
| 2. Recursos | ❌ | ✅✅✅ | |
| 3. Custo | ❌ | ✅✅✅ | |
| 4. Qualidade | ❌ | ✅✅✅ | |
| 5. Controle | ✅ | ❌ | ✅ Hybrid |

**DECISÃO: BUY (Asaas) + Customização leve**

**Por quê:**
- Economiza R$ 640k em 3 anos
- Reduz time-to-revenue de 4 meses para 2 semanas
- Libera 2 devs para focar no diferencial (análise, segurança, features)
- SLA garante compliance sem risco interno

**Customizações leves (hybrid):**
- Integrar webhook de Asaas no seu sistema
- Dashboard customizado de reconciliação
- Lógica própria de retenção/retry

---

## Padrão de Decisão Rápido

Sem tempo? Use este padrão:

1. **Dados proprietários ou sensíveis?** → BUILD
2. **Diferencial competitivo?** → BUILD
3. **Urgência alta (precisa em <1 mês)?** → BUY
4. **Commodidade/genérico?** → BUY
5. **Orçamento muito apertado?** → BUILD (custo inicial) ou BUY (previsível)?
6. **Time pequeno (<5 pessoas)?** → BUY (mais escalável)
7. **Caso de uso único/customizado?** → BUILD

**Padrão:** Propriedade/Urgência/Commodidade → Build/Buy/Hybrid


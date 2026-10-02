---
name: design-principles
description: Use quando o usuário precisar criar princípios-guia curtos e memoráveis para orientar decisões futuras de um produto, projeto, time ou até decisões pessoais recorrentes — evita retrabalho de discussão a cada nova decisão.
---

# Design Principles

## O que é

Design principles são **diretrizes curtas e memoráveis que guiam como você pensa sobre construir um produto, projeto ou tomar decisões recorrentes**. São frases de 1-2 palavras seguidas de uma breve explicação que captura valores e prioridades sem precisar redebater do zero a cada decisão futura.

Uma vez alinhados com o time (ou consigo mesmo), os princípios eliminam discussões circulares — você simplesmente refere ao princípio já acordado e segue em frente.

## Quando usar

- **Definir a cultura de um time ou produto** — criar senso compartilhado do "como fazemos as coisas por aqui"
- **Criar critérios de decisão recorrentes** — desempatar features, prioridades, compromissos técnicos sem renegociar o critério toda vez
- **Decisões pessoais que se repetem** — carreira, saúde, estilo de vida ("quais projetos aceito?", "como priorizo aprendizado?")
- **Fases de design/desenvolvimento** — orientar protótipo, código, conteúdo, interface consistentemente
- **Reduzir fricção entre disciplinas** — quando designers e engenheiros precisam falar a mesma língua

## Anatomia de um bom princípio

Um bom princípio tem 3 partes:

1. **Frase curta (1-2 palavras)** — memorável, fácil de invocar
   - Exemplos: "Fast", "Conexão global", "Confiança", "Acessibilidade"

2. **Breve explicação (2-3 frases)** — deixa claro o "por quê" e o que significa na prática
   - Exemplo: "Conexão global: conectar hosts e guests globalmente como um amigo mútuo faria — pessoal, confiável, humano"

3. **Específico o suficiente para desempatar decisões**, não genérico demais ("ser bom" não vale)
   - ❌ Ruim: "Excelência" — não ajuda a desempatar nada
   - ✅ Bom: "Fast first: cada click/load conta — priorize velocidade antes de features extras"

## Exemplos de referência (do curso Udacity)

**Google Search** — "Fast" (com menos é mais)
- Frase: *Fast*
- Explicação: Abordagem "less is more" para criar uma UI focada em chegar à resposta o mais rápido possível
- Quando aplicar: Qualquer decisão de feature — vai adicionar 100ms de latência? Rejeita

**Airbnb** — "Conexão Global"
- Frase: *Conexão global*
- Explicação: Conectar hosts e guests globalmente como um amigo mútuo faria — pessoal, confiável, humano
- Quando aplicar: Decisões de UX, messaging, trust/segurança — "isso soa como um amigo recomendando?"

**Apple** — "Confiança"
- Frase: *Confiança*
- Explicação: Cuidado obsessivo em manter dados privados do usuário. Privacidade é o foundation
- Quando aplicar: Qualquer feature que coleta dados — "estamos sendo honestos? Protegendo dados?"

## Passo a passo para criar os seus

### Etapa 1: Identificar tensões recorrentes
Que decisões você redebate frequentemente? Onde o time discorda?
- "Lançamos rápido ou fechado?"
- "Feature complexa ou simples?"
- "Quantos dados coletamos?"
- "Quanto documentamos vs quantas features fazemos?"

### Etapa 2: Decidir o lado que você prioriza
Para cada tensão, escolha o lado — e seja honesto. Não tente ser tudo para todos.

| Tensão | Opção A | Opção B | Você prioriza |
|--------|---------|---------|--------------|
| Velocidade vs Qualidade | Lançar rápido | Polido antes de sair | _____ |
| Simples vs Poderoso | Fácil de usar | Muitas features | _____ |
| Confiabilidade vs Inovação | Estável/testado | Novo/experimental | _____ |

### Etapa 3: Escrever frase curta e memorável
Capture a essência em 1-2 palavras que a equipe lembará quando discutir decisões.
- "Rápido primeiro"
- "Confiança acima de tudo"
- "Simples ganha"
- "Dados transparentes"

### Etapa 4: Adicionar explicação breve (2-3 linhas)
Deixe claro por que você prioriza isso e quando o princípio se aplica.

### Etapa 5: Testar contra decisões passadas
Pague-se: seus princípios explicariam as decisões que você já tomou? Se não, ajuste.
- "Fizemos X. Isso teria sido diferente com este princípio?" → ajuste o princípio
- "Nos arrastamos em Y. Este princípio teria nos poupado?" → princípio válido

## Template pronto para uso

Salve em markdown e preencha com seu contexto (produto, time, vida pessoal):

```markdown
# Design Principles — [Nome do Projeto/Time/Fase]

Última atualização: [data]

## 1. [Frase Curta]
**Explicação:** [Por quê importa? O que significa na prática?]  
**Quando aplicar:** [Tipo de decisão onde este princípio orienta]

## 2. [Frase Curta]
**Explicação:** [Por quê importa?]  
**Quando aplicar:** [Tipo de decisão]

## 3. [Frase Curta]
**Explicação:** [Por quê importa?]  
**Quando aplicar:** [Tipo de decisão]

## 4. [Frase Curta] — *opcional*
**Explicação:** [Por quê importa?]  
**Quando aplicar:** [Tipo de decisão]

## 5. [Frase Curta] — *opcional*
**Explicação:** [Por quê importa?]  
**Quando aplicar:** [Tipo de decisão]

---

**Notas de alinhamento:**
- Alinhado com o time em: [data]
- Próxima revisão: [data]
- Decisões chave tomadas com base nestes princípios: [exemplos]
```

## Exemplo aplicado: Princípios para o Education Hub (Kumon)

Cenário: Time definindo princípios para o Education Hub (SaaS de gestão pedagógica para Kumon).

```markdown
# Design Principles — Education Hub v1

Última atualização: 2026-07-20

## 1. Foco no Aluno
**Explicação:** Cada decisão começa perguntando "isso melhora a experiência do aluno?". Não é sobre quantidade de features — é sobre impacto pedagógico real. Se não muda o resultado do aluno, repensa.  
**Quando aplicar:** Priorização de features, design de interfaces, integração com currículo Kumon

## 2. Simplicidade Ganha
**Explicação:** Um bom design instrucional é invisível. Menos clicks, menos documentação externa, menos dúvidas dos professores. Se a feature precisa de tutorial, talvez ela não seja clara.  
**Quando aplicar:** UX de professor (criar plano, acompanhar progresso), UX de aluno (lições, entregas)

## 3. Dados Transparentes
**Explicação:** Profs e pais entendem exatamente como o aluno está indo. Sem linguagem técnica, sem métricas que ninguém pede. Relatório é útil ou é poluição?  
**Quando aplicar:** Dashboards, relatórios para coordenador/professor/pai, visualizações de progresso

## 4. Confiança em Primeiro Lugar
**Explicação:** Kumon é escolhido porque funciona. A plataforma tem que provar isso — dados honestos, sem gamification que engana, sem promessas vazias. Se há um problema, mostra.  
**Quando aplicar:** Retenção de alunos, comunicação de resultados, tratamento de falhas/bugs

## 5. Respeita Fluxo Kumon
**Explicação:** Você não redesenha o método Kumon. A plataforma amplifica o fluxo existente — não inventa um "jeito melhor" de metodologia. Trabalha com Prof/Aluno/Pai, não contra.  
**Quando aplicar:** Decisões arquiteturais, integração com pedagogia existente, definição de MVP

---

**Notas de alinhamento:**
- Alinhado com time em: 2026-07-20
- Próxima revisão: 2026-10-20
- Decisões chave: Cortamos dashboard de "pontos" (não é Kumon) → Foco Aluno + Confiança
```

### Como usar esses princípios em reunião

Quando o time está dividido em uma decisão:

- **Product Manager**: "Pessoal, vamos voltar aos princípios. Essa feature de gamification — respeita Fluxo Kumon?"
- **Time**: "Hm, não realmente. Kumon é sobre disciplina, não badges."
- **PM**: "Concordo. Rejeita essa abordagem. Próxima?"

**Resultado:** 5 minutos de discussão em vez de 45.

## Leitura adicional

- **Design Principles (principles.design)** — catálogo de princípios de produtos reais
- **Invert, Always Invert (Charlie Munger)** — como formular princípios negativos ("O que NUNCA fazemos?")
- **Decisões Frame (Inspired by Marty Cagan)** — como invocar princípios ao explicar PRDs

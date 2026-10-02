---
name: knowledge-router
description: >
  Decide onde um achado deve ser salvo pra virar conhecimento reutilizável, e com quanta autonomia.
  Ativa quando o pedido é "onde salvo isso", "isso vira skill?", "documenta esse aprendizado",
  "isso é rule ou nota?", ao fim de uma sessão que produziu um padrão/correção/decisão digna de
  registro, ou quando um agent precisa escolher entre repo de metodologia, vault pessoal, tracker
  de tarefa e documentação pra humanos. Cobre: critério de classificação em 4 destinos, checagem
  de recorrência antes de criar, e fronteiras que nunca podem ser cruzadas.
---

# Knowledge Router

Um achado que fica só no histórico da sessão está perdido. Um achado salvo no lugar errado é pior:
polui o destino, e ninguém acha depois. Esta skill decide **onde** salvar e **com quanta autonomia**
agir.

## O erro que esta skill previne

Sem critério explícito, todo achado vira "vou anotar num arquivo" — e o resultado é conhecimento
espalhado em quatro sistemas sem ninguém saber qual é a fonte de verdade. O sintoma clássico é
redescobrir três vezes na mesma semana algo que já estava escrito em algum lugar.

## Antes de rotear: o achado merece registro?

A maior parte do que acontece numa sessão é **ruído de execução** — rodou comando, leu arquivo,
corrigiu typo. Isso não vira conhecimento. Registrar tudo é tão ruim quanto não registrar nada:
enche o destino de lixo e afoga o que importa.

Merece registro se passa em pelo menos um:
- **Corrigiu um modelo mental errado** — algo que parecia verdade e não era.
- **Custou tempo pra descobrir** e vai custar de novo se esquecido.
- **É uma decisão com razão** — a escolha importa menos que o porquê.
- **Já apareceu antes** — recorrência é o sinal mais forte de todos.

Não merece: resultado de comando, passo de execução bem-sucedido, detalhe que o código já conta
sozinho, ou qualquer coisa que o git history já registra.

## Passo obrigatório: buscar antes de criar

**Nunca criar sem antes procurar.** Grep no destino provável por palavra-chave/categoria do achado.
Três resultados possíveis:

1. **Já existe igual** → não duplica. Se o registro existente está incompleto, edita ele.
2. **Existe parecido, 2ª ou 3ª ocorrência do mesmo tema** → é recorrência. Sobe de nível: o que era
   nota vira rule/skill. É aqui que "≥3x vira regra permanente" deixa de ser promessa e vira ato.
3. **Não existe** → cria no destino que a tabela abaixo indicar.

Sem esse passo, o contador de recorrência nunca existe e a mesma lição é reaprendida pra sempre.

## Os 4 destinos

| Se o achado é… | Vai pra | Autonomia |
|---|---|---|
| **Metodologia** — "como pensar sobre X", vale em qualquer projeto | repo de agents/skills (`skills/` ou `rules/`) | Propõe, humano aprova |
| **Decisão / história / contexto pessoal** — "o que decidimos e por quê" | vault de conhecimento pessoal | Propõe, humano aprova |
| **Estado de trabalho** — próximo passo, contexto de ticket, status | tracker de tarefas (Linear) | **Escreve direto** |
| **Documentação estável pra outras pessoas** | ferramenta de docs (Notion) | Propõe, **sempre exige aprovação** |

### Como distinguir os dois primeiros (é onde mais se erra)

O teste: **remova todo o contexto pessoal/de projeto. Ainda sobra algo útil?**

- Sobra → metodologia. "Não assumir que E2E automatizado é obrigatório em todo épico; confirmar
  antes quando o volume de subtickets é grande" vale pra qualquer time.
- Não sobra → decisão/contexto. "Neste repo o único usuário de teste é admin, então rota de
  orientador não é verificável visualmente" só faz sentido dentro daquele projeto.

Regra prática: se o texto precisa citar um nome de repo, pessoa ou produto pra fazer sentido, não é
metodologia — é contexto.

### Por que a autonomia difere

- **Tracker escreve direto**: comentário em ticket é reversível, de baixo impacto, e já é rotina.
  Pedir aprovação pra cada um só gera atrito.
- **Repo e vault propõem**: viram conteúdo permanente que outros agents vão carregar como verdade.
  Errar aqui contamina sessões futuras.
- **Docs pra humanos sempre pergunta**: outras pessoas leem e agem em cima. Publicar algo errado ou
  prematuro tem custo externo, não só interno.

## Fronteiras que nunca são cruzadas

- **Conteúdo clínico/de saúde nunca sai do vault.** Não vira skill, não vai pra ferramenta de docs,
  não entra em canal externo, não entra em resumo automático. Sem exceção, mesmo que pareça
  metodologia útil.
- **Segredo nunca é registrado.** Se o achado depende de uma credencial pra fazer sentido,
  reescreve sem ela ou não registra.
- **Achado sobre uma pessoa** (desempenho, comportamento, avaliação) não vira registro permanente
  sem pedido explícito.

## Nível de autonomia cresce com a confiança

Começa **propondo tudo** (exceto tracker). Depois que o critério provar acerto ao longo de vários
ciclos — as propostas sendo aceitas sem correção — promoções de baixo risco podem passar a rodar
sozinhas. A ordem é sempre essa: propõe primeiro, ganha autonomia depois. Nunca o contrário.

Qualquer destino de escrita direta precisa ser reversível. Se desfazer é caro, é proposta.

## O que esta skill não decide

Não decide **se** o achado está certo — só onde ele mora. Um achado errado bem-roteado continua
errado. A validação é responsabilidade de quem aprova a proposta.

---
name: task-contract
description: "Use SEMPRE antes de escrever qualquer código — monta o Task Contract de 3 campos (Objetivo, Scope/Not-Included, DoD-comando) que trava o escopo. Dispara em: feature, bug, fix, implementar, criar, build, codar."
triggers:
  - feature
  - bug
  - fix
  - implementar
  - criar
  - build
  - codar
  - refactor
---

# Task Contract

Este é o CONTRATO que trava o escopo de TODA tarefa de desenvolvimento. Sem este contrato preenchido e validado, não escreva uma linha de código.

## O que é um Task Contract?

Um Task Contract é um documento de 3 campos que define EXATAMENTE o que vai ser feito, o que NÃO vai ser feito, e como você PROVA que está pronto. Evita scope creep, ambiguidade e retrabalho.

## Template (copie e preencha)

```markdown
# Task Contract: [NOME DA TAREFA]

## 1. Objetivo (1-2 linhas)
O que vai ser entregue? Uma frase imperativa clara.

Exemplo: "Implementar autenticação OAuth2 com Google em /src/auth/oauth.ts"

## 2. Scope & Not-Included (3-5 bullets cada)

### Dentro do Scope
- [ ] Implementação do código (arquivos/funções)
- [ ] Testes unitários (RED→GREEN)
- [ ] Type checks (TypeScript)
- [ ] Build sem erros

### Fora do Scope
- [ ] Documentação de API (PRs futuras)
- [ ] UI/componentes (responsibility de outra tarefa)
- [ ] Integração com banco de dados
- [ ] Deployment (CI/CD)

## 3. Definition of Done (DoD-comando)
O comando que PROVA que está pronto:

```bash
npm test -- --testPathPattern=oauth && npm run typecheck && npm run build
```

Exit 0 = PRONTO. Exit 1 = CONTINUA TRABALHANDO.
```

## Passo a Passo

1. **Preencha o Template** — copie a seção acima e adapte pra sua tarefa
2. **Valide com Rafa** — compartilhe os 3 campos; ele aprova ou pede ajustes
3. **Rode o DoD-comando uma vez** — confirme que funciona AGORA (baseline)
4. **Desenvolva** — não saia do escopo que definiu
5. **DoD-comando novamente** — antes de declarar "pronto"

## Regras

- **Scope & Not-Included tem que somar 100%** — não deixe lacunas
- **DoD-comando é testável e determinístico** — não "parece estar funcionando"
- **WIP = 1** — trabalhe em 1 tarefa de cada vez
- **Se o escopo expandir** → nova tarefa, novo contract

## Arquivo de Referência

Template salvo em: `templates/task-contract.md`

Sempre que precisar, rode:
```bash
cat templates/task-contract.md
```

---

## Fechamento (Linear)

Quando o **DoD-comando** rodar e der `exit 0`:

1. `list_issue_statuses` do time EDU → encontre o status com `type: completed` (nunca hardcodar o ID).
2. `update_issue` movendo o issue ativo pra esse status.
3. `save_comment` no issue com: o que foi feito, o DoD-comando rodado, o exit code, e o hash do commit.

**Nunca fechar/mover um issue sem `exit 0` do DoD-comando.** Se o DoD falhar, o issue continua "In Progress" e o trabalho continua.

---

**Uso Obrigatório:** Este skill é chamado AUTOMATICAMENTE antes de `dev-workflow`. Não pule esta etapa.

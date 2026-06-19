# Task Contract: [NOME DA TAREFA]

Use este template para toda tarefa de desenvolvimento. Preencha os 3 campos abaixo e valide com Rafa antes de começar.

## 1. Objetivo (1-2 linhas)
O que vai ser entregue? Uma frase imperativa clara.

**Exemplo:** Implementar autenticação OAuth2 com Google em `/src/auth/oauth.ts`, com suporte a sign-up/login e token refresh.

**Seu objetivo:**
```

```

---

## 2. Scope & Not-Included

### Dentro do Scope
O que ENTRA nesta tarefa? Liste com checkboxes:

```
- [ ] Arquivo/função específica
- [ ] Testes unitários (RED→GREEN)
- [ ] Type checks (TypeScript, zero `any`)
- [ ] Build sem erros
- [ ] Integração com [Sistema X]
```

### Fora do Scope
O que NÃO entra? Seja explícito:

```
- [ ] Documentação de API (PR futura)
- [ ] UI/componentes (responsibility de outra tarefa)
- [ ] Banco de dados (integração com [Sistema Y])
- [ ] Deployment / CI/CD
- [ ] Monitoramento / alertas
```

---

## 3. Definition of Done (DoD-comando)

O comando que PROVA que você está pronto. **Exit 0 = PRONTO. Exit 1 = CONTINUA TRABALHANDO.**

**Exemplo:**
```bash
npm test -- --testPathPattern=oauth && npm run typecheck && npm run build
```

**Seu DoD-comando:**
```bash

```

---

## Checklist Pré-Desenvolvimento

- [ ] Objetivo claro e validado com Rafa
- [ ] Scope & Not-Included somam 100% (sem lacunas)
- [ ] DoD-comando roda no baseline (exit 0 AGORA, antes de qualquer mudança)
- [ ] Arquivo salvo em git (branch `feature/` ou `fix/`)

---

## Checklist Pré-Pronto

- [ ] DoD-comando passa (exit 0)
- [ ] Nenhum código novo saiu do scope definido
- [ ] Testes escritos em TDD (RED→GREEN→REFACTOR)
- [ ] Não há secrets hardcoded (sempre `${VAR}`)
- [ ] TypeScript: zero erros
- [ ] Build: sem warnings

---

## Histórico de Contratos

(Use para histórico — quando terminar esta tarefa, adicione uma entrada aqui)

| Data | Tarefa | DoD-Status | Notas |
|---|---|---|---|
| 2026-06-19 | [Seu contrato aqui] | Pendente | Link para PR quando done |

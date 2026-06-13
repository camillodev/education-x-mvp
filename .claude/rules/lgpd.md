# Regras de LGPD — Education X

> Aplica-se a todo código que toca dados pessoais. O Education X processa PII de responsáveis financeiros E de menores de idade (alunos) — isso eleva o rigor. A LGPD-proof completa é pós-MVP, mas estas regras valem DESDE O DIA 1 para não criar dívida que custe caro depois.

## Contexto legal (o que muda nossas decisões)

- **Lei:** LGPD (Lei 13.709/2018). Dados de **crianças e adolescentes** (alunos) têm proteção reforçada (art. 14) — tratamento no melhor interesse, consentimento de um dos pais/responsável.
- **Papéis:** a **Escola (Unit)** é a **controladora** dos dados dos seus responsáveis/alunos. A **Impact X / Education X** é **operadora** (processa em nome da escola). Isso está nos termos (cláusula de isenção). O código deve refletir esse limite: a IX não usa os dados pra fim próprio.
- **Base legal predominante:** execução de contrato (cobrança da mensalidade) + obrigação legal (nota fiscal). Consentimento é a base para usos secundários (marketing, etc.) — que NÃO existem no MVP.

## Dados pessoais que tocamos (PII)

| Dado | De quem | Sensibilidade |
|------|---------|---------------|
| Nome, CPF, e-mail, telefone, endereço | Responsável financeiro (Guardian) | Alta (CPF = identificador) |
| Nome, data de nascimento | Aluno (Student) — **menor** | Alta (criança) |
| Valores, histórico de pagamento | Responsável | Financeira |
| Cartão de crédito | Responsável | **Crítica — NUNCA armazenar PAN** |

## Regras de código (valem desde o dia 1)

1. **Cartão de crédito: só token.** Nunca armazenar número (PAN), CVV ou validade. A tokenização é da Asaas. O banco guarda no máximo `last4` + `creditCardToken`. Qualquer código que persista número de cartão é bug crítico.

2. **CPF mascarado na UI por padrão.** Exibir `•••.•••.987-00` (últimos dígitos), igual ao protótipo (`maskCpf`). CPF completo só onde estritamente necessário (geração de NF) e nunca em logs.

3. **PII nunca em logs.** Não logar CPF, e-mail, telefone, nome completo, valores. Logs usam IDs (`guardianId`, `unitId`), não dados. O hook de secrets também ajuda, mas é responsabilidade do código.

4. **Isolamento de tenant é proteção de dados.** Toda query filtra por `unitId` da sessão. Escola A nunca acessa PII da escola B — isso é requisito LGPD, não só de produto. Ver `security.md`.

5. **Minimização de dados.** Coletar só o necessário para cobrar e emitir NF. Nada de campo "por via das dúvidas". Cada campo de PII no schema deve ter justificativa de finalidade.

6. **Consentimento registrado com prova.** O aceite do responsável (matrícula) registra IP + timestamp + versão dos termos (`TermsAcceptance`). Isso é a base legal documentada. Não há tratamento sem esse aceite.

7. **Dado de menor exige aceite do responsável.** O fluxo de matrícula captura consentimento parental explícito (o responsável aceita pelo aluno). Nunca um aluno menor consente sozinho.

8. **Retenção e exclusão (preparar, não implementar agora).** O schema deve permitir, no futuro, anonimização/exclusão a pedido do titular (direito do art. 18). NÃO usar deletes físicos que quebrem integridade fiscal — usar soft-delete/anonimização. Marcar com TODO onde aplicável. Implementação completa = pós-MVP.

9. **Transferência só para operar.** PII só vai para terceiros que são sub-operadores necessários (Asaas para cobrança, NF). Nunca para fins de marketing/venda. A própria Asaas é referenciada como infraestrutura, não exposta ao usuário.

10. **Política de Privacidade existe desde o MVP.** Texto básico (quais dados, por quê, base legal) aceito no onboarding e na matrícula. Versionado em `TermsVersion`. Revisão jurídica formal = pós-MVP, mas o texto funcional existe no lançamento.

## O que é pós-MVP (não bloqueia validar PMF, mas é obrigação)

- Matriz completa de base legal por finalidade
- Portal de direitos do titular (acesso, correção, portabilidade, esquecimento)
- Log de auditoria de acesso a PII
- Criptografia de PII em repouso além do padrão do Supabase
- DPA formal (contrato de operador) Escola↔IX revisado por advogado
- Relatório de impacto (RIPD) se necessário

> Entram cedo no pós-lançamento porque são obrigação legal — mas não travam a validação comercial. O que NÃO pode escapar agora: token de cartão, CPF mascarado, PII fora de logs, isolamento de tenant, consentimento registrado. Esses são baratos no dia 1 e caríssimos de retrofitar.

## Anti-padrões (nunca)
- ❌ Armazenar número de cartão / CVV
- ❌ CPF/e-mail/telefone em log, mensagem de erro, ou URL
- ❌ Query de PII sem filtro de `unitId`
- ❌ Coletar dado sem finalidade clara
- ❌ Tratamento de dado de menor sem consentimento do responsável
- ❌ Delete físico de registro com vínculo fiscal (usar anonimização)

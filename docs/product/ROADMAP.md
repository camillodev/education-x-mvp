# Roadmap — Education X
> O que vamos construir, quando, e como acompanhar.
> Documento sem termos técnicos — feito para acompanhar com o coach.
> A versão técnica (para o Claude implementar) está em PLANO-TECNICO.md.

---

## O que é o Education X, em uma frase

Um sistema que faz a **cobrança das mensalidades de escolas pequenas rodar sozinha** — da matrícula ao recebimento, sem a escola precisar perseguir quem deve.

## O que o produto faz (os 9 fluxos aprovados no protótipo)

O protótipo já está aprovado e é a referência do que construir. São 9 fluxos:

1. **Cadastra a escola** (onboarding em 4 passos) — em poucos minutos a escola está pronta para cobrar.
2. **Matricula o aluno** — pelo link (o pai preenche no celular) ou manual (a escola preenche, o pai só confirma).
3. **Cobra automático** — todo mês o sistema gera a cobrança (boleto/PIX) e envia.
4. **Recebe e dá baixa** — quando o pai paga, o sistema reconhece e emite a nota fiscal.
5. **Cobra quem atrasa** — lembretes automáticos e, se necessário, negativação (nome no Serasa), decidida caso a caso.
6. **Mostra a situação** — painel com quem pagou, quem deve, relatórios e o quanto a régua recupera.
7. **Área do responsável** — o pai paga, vê histórico, baixa nota e cadastra cartão pelo celular.
8. **Saca o dinheiro** — a escola transfere o saldo para o banco e pode antecipar recebíveis de cartão.
9. **Gerencia o próprio plano** — a escola vê a assinatura da Education X, as faturas, e importa alunos em massa.

---

## 📆 Como vamos construir — núcleo demonstrável primeiro

O escopo é o protótipo inteiro. Mas a ordem é por **valor de venda**: o ciclo que o Pimenta mostra para vender fica pronto primeiro; o resto vem logo depois. Não é cortar nada — é a sequência certa.

**Bloco A — o que o Pimenta demonstra (núcleo):**
cadastra escola → matricula → cobra → recebe → emite nota → negativa → painel

**Bloco B — o resto do MVP (logo após a demo):**
área do responsável → saque/antecipação → importação → plano da escola → cobrança extra → configurações

### Como o prazo foi calculado (sem chute)

Não é "uma fase por dia". Olhamos **cada uma das ~30 tarefas**, estimamos quantas sessões de Claude cada uma leva pela complexidade real, e quanto da sua revisão cada sessão consome. A conta:

- **~56 sessões de Claude** no total
- **1 sessão ≈ 1,5h da sua revisão** (ler, testar no preview, aprovar)
- = ~85h **+10% de folga = ~93h** ÷ **6h/dia = ~15,5 dias úteis = ~3 semanas**

| Semana | O que fica pronto | Bloco |
|--------|-------------------|-------|
| **Sem 1** · 16–20/jun | Sistema montado · escola se cadastra (4 passos) · cada escola só vê seus dados · matrícula (link + manual) | A |
| **Sem 2** · 23–27/jun | Cobrança gerada · pagamento reconhecido · nota fiscal automática · lembretes · roda sozinha + teste no real · negativação | A |
| **Sem 3** · 30/jun–4/jul | Painel com relatórios · funil de recuperação · cobrança extra → **núcleo pronto ~2/jul** → área do responsável · saque · antecipação | A→B |
| **Sem 4** · 7–8/jul | Plano da escola + faturas · importação em massa · configurações | B |

### 🎯 Núcleo pronto pra vender: ~2 de julho

No meio da Semana 3 o ciclo completo de venda está pronto e testado no real: cadastra → matricula → cobra → recebe → emite nota → negativa → vê painel. **Dá para o Pimenta demonstrar e vender** sem esperar o MVP inteiro.

### MVP completo (9 fluxos): ~8 de julho

Área do responsável, saque, importação e plano da escola entram logo depois. Nada foi cortado — só ordenado.

> **Se o ritmo cair pra 4h/dia em vez de 6h**, o calendário estica pra ~5,5 semanas (MVP ~25/jul) — sem furar nem entrar em pânico. A data é honesta, não otimista.

---

## Marcos para celebrar com o coach

Cada um é uma vitória concreta. Quando bater, registre.

| Marco | Quando | Por que é uma vitória |
|-------|--------|------------------------|
| **A escola entra no sistema** | Sem 1 | Saí do zero. A porta de entrada existe. |
| **O pai matricula sozinho** | Sem 1 | As famílias usam sem a escola fazer por elas. |
| **A primeira cobrança é paga** | Sem 2 | O coração do produto bate. O dinheiro entra e o sistema vê. |
| **A cobrança roda sozinha** | Sem 2 | A escola para de fazer no manual. O valor central. |
| **Núcleo pronto pra vender (no real)** | ~3/jul | Dá para o Pimenta mostrar e fechar a primeira escola. |
| **MVP completo (9 fluxos)** | ~17/jul | O produto inteiro do protótipo está no ar. |

---

## Por que é possível nesse ritmo

**O código é escrito pelo Claude, em minutos — não em dias.** O que travava era a espera pela Asaas, e ela já está **toda liberada** (conta, negativação e ambiente de testes prontos). O que resta é: **o Claude escreve, você revisa todo dia.** Como o escopo cresceu (9 fluxos do protótipo), o calendário passou de 1 para ~5 semanas — mas cada semana entrega um bloco que você revisa junto.

---

## ⚡ Duas coisas para você decidir

1. **Quando uma cobrança conta como "paga"** (assim que o banco confirma, ou quando o dinheiro cai) — decisão rápida, antes da Semana 2.
2. **O preço dos planos da Education X** (Básico/Crescimento/Pro) — você definiu que faz isso na semana de 15/jun. Não trava o núcleo, só a parte do "plano da escola" (Semana 5).

> Tudo o mais — conta Asaas, negativação, ambiente de testes — você já tem. Sem espera externa para o núcleo.

---

## O que fica para depois do lançamento

Estas coisas importam, mas não precisam estar prontas para validar se alguém compra.

- **Adequação completa à lei de dados (LGPD)** — obrigação, entra logo no começo do pós-lançamento, mas não trava a validação.
- **Revisão dos termos por um advogado** — os textos de lançamento são bons o suficiente para começar.
- **Multa de cancelamento automática** (hoje dá para cobrar manualmente).
- **Contratos formais via assinatura digital** (hoje o contrato é PDF + aceite no link).

> A regra: cada uma entra **quando um cliente real mostrar que precisa** — não por estar numa lista.

---

## Como me manter no ritmo (lembretes para os dias difíceis)

1. **O calendário é o piso, não a corrida.** Uma semana mais lenta empurra a data, não recalcula tudo em pânico.
2. **Bateu o marco da semana = sucesso.** Registre. Cada bloco é uma vitória concreta.
3. **Revisar é trabalho de verdade.** Aprovar o que ficou pronto conta tanto quanto qualquer coisa.
4. **Você não está programando — está dirigindo.** O Claude faz o trabalho pesado; você decide e revisa.
5. **Se a energia não permitir o ritmo, tudo bem.** O produto sai com a mesma qualidade um pouco mais devagar. A pressa é opção, não obrigação.

---

## Documentos relacionados

- **PLANO-TECNICO.md** — o mesmo plano, com o detalhe técnico (para o Claude implementar)
- **DISCREPANCIAS-roadmap-vs-prototipo.md** — o cruzamento que trouxe os 9 fluxos pro escopo
- **SYSTEM-DESIGN.md** — como o sistema é montado por dentro
- **DEVOPS.md** — onde o sistema roda e quanto custa
- **[00-FILOSOFIA.md](../../../Strategy/00-FILOSOFIA.md)** — a missão da empresa

# Suporte WhatsApp — Education X
> Versão 1.0 · 13 jun 2026 · Founder-led (Rafa/Pimenta)

---

## Princípios de tom e voz

**Quem está do outro lado:** a Ana ganha R$1.500–2.200/mês, aprendeu o sistema sozinha, tem medo de errar e gerar confusão. A Fernanda quer resolver em 30 segundos no celular. Nenhuma das duas quer ler um manual.

1. **Humano antes de técnico.** Primeiro validar que entendeu o problema, depois resolver.
2. **Afirmar, não culpar.** Nunca "você fez errado". Sempre "acontece, vamos resolver".
3. **Uma coisa por vez.** Se o problema tem 3 passos, mandar passo 1 → esperar confirmação → passo 2.
4. **Nunca mencionar a franqueadora de forma negativa.** Se o problema envolver sistema legado da rede, responder "isso fica fora do que a gente gerencia, mas posso te ajudar com X".
5. **Português coloquial mas profissional.** "Oi Ana!" é certo. "Prezada Ana" é errado. "Oi mana" é errado.

---

## SLA inicial (founder-led)

| Horário da mensagem | Meta de resposta |
|---------------------|-----------------|
| Seg–Sex 9h–18h | ≤ 2h |
| Seg–Sex 18h–22h | ≤ 4h (melhor esforço) |
| Fim de semana / feriado | D+1 útil |

> Urgência real (pagamento que não entrou, nota fiscal bloqueando fechamento): responder em ≤ 30 min independente do horário. Critério: a escola perde dinheiro se não resolver hoje?

---

## O que registrar em toda conversa

Após encerrar, anotar em planilha compartilhada (link na bio do WA):

| Campo | Exemplo |
|-------|---------|
| Data | 13/06/2026 |
| Contato (escola) | Kumon Camargos – Ana |
| Tipo de problema | Segunda via boleto |
| Resolvido? | Sim |
| Precisou escalar? | Não |
| Observação livre | Ana não sabia que link fica no e-mail da Asaas |

> Essa planilha vira a base pra decidir o que entra no FAQ do portal e onde o produto precisa melhorar.

---

## Quando escalar para o Rafa

Escalar via mensagem direta com o contexto completo (escola + problema + o que já foi tentado):

- Pagamento confirmado mas status ainda aparece como pendente há > 2h
- NFS-e com erro que não se resolve pelo painel (código municipal errado, rejeição da prefeitura)
- Negativação: escola quer negativar e tem dúvida jurídica ("posso negativar mesmo sem contrato assinado?")
- Reclamação formal de responsável ameaçando Procon ou advogado
- Bug que impede o uso do sistema (tela em branco, erro 500, não consegue emitir cobrança)
- Solicitação de reembolso ou crédito de mensalidade da plataforma
- Qualquer situação que envolva dinheiro na conta da escola (saque, antecipação, divergência de saldo)

---

## Fluxos de atendimento por tipo de problema

### 1. Segunda via de boleto / PIX

**Quando chega:** "Preciso do boleto do João de novo" / "O pai perdeu o PIX"

**O que fazer:**
1. Confirmar nome do aluno/responsável e mês de referência.
2. Acessar painel → Cobranças → buscar pelo nome → abrir o registro.
3. Copiar o link do boleto (ou código PIX, ou QR) diretamente da tela de detalhe.
4. Enviar pro contato com o template abaixo.
5. Se a cobrança aparecer como cancelada ou vencida há > 30 dias: verificar se precisa emitir nova cobrança extra (Fase 6.3 do produto). Escalar se tiver dúvida.

**O que NÃO fazer:** não reemitir manualmente pela Asaas — tudo fica no painel.

---

### 2. Nota fiscal (NFS-e) — dúvida ou erro

**Quando chega:** "Como emito a nota?" / "O pai pediu nota e não sei onde pegar" / "Deu erro na nota"

**O que fazer:**
1. Perguntar: a nota é pra um pagamento que já foi confirmado ou tá tentando emitir antes do pagamento?
   - Antes do pagamento: explicar que a nota só é gerada automaticamente após confirmação do pagamento.
   - Após pagamento: acessar painel → Cobranças → detalhe da cobrança paga → bloco NFS-e → link do PDF.
2. Se aparecer "Nota com erro" ou status diferente de emitida: verificar se a inscrição municipal está cadastrada nas configurações da escola. Se não tiver, escalar pro Rafa.
3. Se pai pedir nota fiscal da matrícula (não da mensalidade): explicar que o sistema emite nota por cobrança mensal, não por matrícula.

---

### 3. Aluno/responsável em atraso — o que fazer

**Quando chega:** "Como cobro o João que tá devendo 2 meses?" / "Posso negativar?"

**O que fazer:**
1. Acessar painel → Cobranças → filtrar "Vencidas" → localizar o responsável.
2. Opção A — Reenviar cobrança: no detalhe, botão "Reenviar" → escolhe canal (WhatsApp/e-mail). O sistema manda automaticamente com link de pagamento atualizado (valor já inclui multa 2% + juros 1% a.m.).
3. Opção B — Negativação: o painel mostra botão "Negativar" apenas para cobranças elegíveis (prazo e valor mínimos da Asaas já cumpridos). Se aparecer, pode usar. Se não aparecer, ainda não é elegível — a Ana deve aguardar ou tentar reenvio.
4. Se a Ana perguntar "posso negativar sem avisar o pai?": explicar que o sistema cuida do aviso obrigatório automaticamente (a Asaas envia notificação ao devedor). Ela não precisa fazer nada extra.
5. Se a Ana tiver dúvida jurídica além disso: escalar pro Rafa.

---

### 4. Cobrança com valor errado

**Quando chega:** "O boleto veio com valor diferente do combinado" / "Cobrou a mais"

**O que fazer:**
1. Pedir pra Ana abrir o detalhe da cobrança no painel e confirmar o valor que aparece lá.
2. Verificar se o valor inclui multa/juros (cobrança vencida): o breakdown fica visível na tela.
3. Se o valor base (sem multa) estiver errado:
   - Verificar se o plano e descontos do aluno estão configurados corretamente (Matrículas → aluno → plano).
   - Se tiver divergência no cadastro: corrigir o plano e orientar a cancelar a cobrança errada pelo painel → emitir nova. Mas atenção: cancelar cobrança não cancela a matrícula.
4. Se não conseguir identificar a origem do erro: escalar pro Rafa com print do detalhe.

---

### 5. Onboarding — criar subconta e configurar escola

**Quando chega:** escola nova sendo ativada / "Como inicio no sistema?"

**O que fazer (este fluxo geralmente é o Rafa que conduz, mas segue o script):**
1. Confirmar que tem em mãos: CNPJ, inscrição municipal (pra emitir NF), conta bancária pra repasse, dia de vencimento preferido.
2. Acessar painel admin IX → Criar escola → wizard 4 passos (dados → regras de cobrança → documentos → revisão).
3. Após criar: enviar template de boas-vindas (abaixo).
4. Orientar a primeira configuração: cadastrar matérias + valores → criar planos → importar alunos (CSV se tiver lista) ou cadastrar manualmente.
5. Se travar em qualquer passo do wizard: escalar pro Rafa.

---

### 6. Negativação — medo jurídico / "posso fazer isso?"

**Quando chega:** "Tenho medo de negativar e tomar processo" / "Qual o risco?"

**O que fazer:**
1. Tranquilizar: o sistema usa a Asaas para negativar, que é um processo regulamentado. O aviso obrigatório ao devedor (exigência legal) é feito automaticamente — a escola não precisa se preocupar com isso.
2. Explicar os 4 status que aparecem no painel: Em aviso → Elegível → Negativado → Regularizado. O botão "Negativar" só aparece quando já está Elegível (prazo cumprido).
3. Lembrar que a escola pode escolher não negativar e usar opt-out caso prefira só cobrar sem registro em bureau.
4. Se a Ana tiver dúvida específica sobre um caso (ex: aluno com problema de saúde, situação delicada): não dar conselho jurídico, escalar pro Rafa.
5. Se aparecer "Solicitar baixa" no painel: significa que o responsável pagou a dívida negativada e a escola pode solicitar a retirada do registro. Orientar a clicar e aguardar a Asaas processar (prazo varia por bureau).

---

## Templates de mensagem

### Boas-vindas onboarding

```
Oi [Nome]! Seja bem-vinda ao Education X 🎉

Seu acesso já está ativo. Aqui vai um caminho rápido pra começar:

1. Entre em [link do painel]
2. Cadastre as matérias e valores (menu Configurações → Planos)
3. Registre os alunos (Matrículas → Novo aluno) ou importe pelo CSV se tiver uma lista

Qualquer dúvida, me chama aqui. Você não precisa resolver tudo de uma vez — vamos juntas.
```

---

### Segunda via de boleto/PIX

```
Oi [Nome]! Aqui vai a segunda via:

📄 Boleto: [link]
📱 PIX (copia e cola): [código]

Válido até [data de vencimento]. Se passar desta data, me avisa que gero uma nova cobrança atualizada.
```

---

### Nota fiscal disponível

```
Oi [Nome]! A nota fiscal desse pagamento já foi emitida automaticamente.

Para acessar:
1. Abra a cobrança no painel (Cobranças → [nome do aluno])
2. Role até o bloco "Nota Fiscal" — lá tem o PDF pra baixar ou enviar pro responsável

Qualquer dúvida é só falar!
```

---

### Erro na nota fiscal (investigando)

```
Oi [Nome], recebi. Vou verificar o que aconteceu com essa nota agora.

Pode me dizer:
- O nome do aluno/responsável?
- O mês de referência do pagamento?

Com isso resolvo mais rápido.
```

---

### Reenvio de cobrança para inadimplente

```
Oi [Nome]! Para reenviar a cobrança pro [nome do responsável]:

1. No painel, vá em Cobranças → Vencidas
2. Abra a cobrança dele
3. Clique em "Reenviar" e escolha WhatsApp ou e-mail

O sistema já manda com o valor atualizado (inclui a multa e os juros automaticamente).

Se quiser negativar, o botão "Negativar" aparece quando o prazo mínimo for cumprido. Me avisa se tiver dúvida sobre isso.
```

---

### Resposta de medo jurídico sobre negativação

```
Oi [Nome]! Entendo a preocupação — é normal ter esse cuidado.

O processo de negativação pelo nosso sistema é regulamentado: a Asaas (quem processa a cobrança) envia o aviso obrigatório pro devedor antes de qualquer registro, seguindo o que a lei exige. Você não precisa fazer nada extra.

O painel só mostra o botão "Negativar" quando o prazo legal já foi cumprido. Se preferir não negativar em algum caso específico, tem também a opção de opt-out.

Se tiver alguma situação delicada (aluno com problema de saúde, acordo informal, etc.), me conta que a gente pensa junto antes de tomar qualquer ação.
```

---

### Escalação (encaminhando pro Rafa)

```
Oi [Nome], recebi e entendo. Esse caso precisa de atenção do nosso time técnico — vou passar pro Rafael agora mesmo.

Ele entra em contato em breve (meta: até [prazo]). Obrigada pela paciência!
```

---

### Encerramento padrão

```
Resolvido! Se tiver qualquer outra dúvida, é só chamar. Boa continuação!
```

---

## Anti-padrões (nunca fazer)

- Dar conselho jurídico sobre negativação, atraso, Procon.
- Pedir login/senha do painel por WhatsApp.
- Prometer prazo que não controla (ex: "a Asaas resolve em 1h").
- Mencionar que o produto ainda está em MVP ou citar nomes internos (Asaas, Prisma, etc.) pra usuária.
- Fazer alteração no banco diretamente sem passar pelo fluxo do painel.

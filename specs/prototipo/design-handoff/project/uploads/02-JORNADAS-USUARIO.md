# Jornadas de Usuário — Education X (escopo MVP)

> User journey maps por persona. **Vêm antes dos fluxos** — mapeiam o que a pessoa vive
> (fases, ações, emoção, dor, oportunidade) end-to-end. Os fluxos de tela (doc 03) traduzem
> estas jornadas. Escopo: MVP (Escola↔Responsável). Personas: doc `00-PERSONAS.md`.

Legenda de emoção: 😟 frustração · 😐 neutro · 🙂 confiança · 😀 satisfação

---

## Jornada 1 — Admin IX conecta uma nova escola (Onboarding)

| Fase | Ação | Pensa / Sente | Dor | Oportunidade (produto) |
|------|------|---------------|-----|------------------------|
| **1. Pré-venda fechada** | Recebe ok do Pimenta pra ativar a escola | "Vamos ativar rápido pra mostrar valor" 🙂 | Demora pra ativar mata o momento da venda | Onboarding em minutos, não dias |
| **2. Coleta de dados** | Junta CNPJ, endereço, dados bancários da escola | "Espero ter tudo em mãos" 😐 | Faltar um dado trava tudo | Wizard mostra exatamente o que falta; salva rascunho |
| **3. Criação da subconta** | Preenche wizard → sistema cria subconta Asaas | "Será que vai dar erro na Asaas?" 😟 | Erro técnico opaco da Asaas assusta | Mensagem clara; rollback se falhar; nada salvo pela metade |
| **4. Configuração** | Define vencimento, multa, juros, nota fiscal | "Quais valores uso?" 😐 | Não saber o padrão | Defaults sensatos (multa 2%, juros 1%); explicação inline |
| **5. Importar alunos** | Sobe a base de alunos/responsáveis da escola | "Tomara que importe certo" 😟 | Dados sujos/duplicados | Validação na importação; relatório do que faltou |
| **6. Ativa** | Vê "Escola pronta para cobrar" | "Foi rápido!" 😀 | — | Confirmação clara + próximo passo óbvio |

**Momento da verdade:** fase 3 (criação da subconta). Se falhar feio, a venda esfria.
**Métrica de sucesso:** tempo de onboarding < 30 min; escola emite 1ª cobrança no mesmo dia.

---

## Jornada 2 — Maria (responsável) matricula o filho e paga

| Fase | Ação | Pensa / Sente | Dor | Oportunidade |
|------|------|---------------|-----|--------------|
| **1. Recebe o link** | Abre link de matrícula no WhatsApp | "O que é isso? É confiável?" 😐 | Link genérico/suspeito | Topo com marca da escola + Education X; visual sério (Alfabeto) |
| **2. Preenche dados** | Digita CPF, email, telefone, dados do aluno (celular) | "Espero que seja rápido" 😐 | Formulário longo no celular | Mobile-first, poucos campos por passo, máscaras, salva progresso |
| **3. Escolhe plano** | Vê mensal/tri/sem/anual + valor | "Quanto vai ficar?" 🙂 | Valor confuso/escondido | Valor calculado em destaque, claro |
| **4. Aceita termos** | Lê e marca "Li e aceito" | "Tô assinando o quê?" 😟 | Texto jurídico assustador | Resumo claro + termos acessíveis; aceite simples (clickwrap) |
| **5. Envia** | Confirma matrícula | "E agora?" 😐 | Não saber o próximo passo | "Enviado! A escola vai confirmar. Você recebe o boleto em breve." |
| **6. Recebe cobrança** | Boleto/PIX chega por WhatsApp+email+SMS | "Ótimo, vou pagar agora" 😀 | Cobrança que não chega | Multicanal; PIX copia-e-cola; lembrete antes de vencer |
| **7. Paga** | Paga via PIX no celular | "Pronto, rápido" 😀 | Pagar e não ter comprovante | Confirmação automática; (pós-MVP) nota fiscal no portal |

**Momento da verdade:** fase 4 (aceite). Se assustar, abandona a matrícula.
**Métrica:** taxa de conclusão da matrícula via link; tempo médio < 5 min.

---

## Jornada 3 — Fran (orientadora) na rotina de cobrança

| Fase | Ação | Pensa / Sente | Dor | Oportunidade |
|------|------|---------------|-----|--------------|
| **1. Aprovar matrículas** | Revisa cadastros que os pais enviaram | "Os dados estão certos?" 😐 | Cadastro incompleto | Tela de revisão clara; bloqueia aprovar sem CPF/email/telefone |
| **2. Fechamento do mês** | Sistema emite todos os boletos sozinho | "Espero que tenha emitido tudo" 😐 | Esquecer alguém / emitir errado | Emissão automática no fechamento + resumo (X emitidos, Y erro) |
| **3. Acompanhar** | Olha o dashboard: quem pagou, quem não | "Quanto já entrou?" 🙂 | Dado espalhado, sem visão | Dashboard recebido/a vencer/vencido num relance |
| **4. Cobrar atrasado** | Vê vencidos, reenvia cobrança | "Tenho que ligar pra todo mundo?" 😟 | Cobrar um a um no WhatsApp | Régua automática de avisos; botão reenviar; multicanal |
| **5. Cobrança extra** | Gera multa de cancelamento ou taxa avulsa | "Como cobro isso?" 😐 | Não ter como cobrar fora da mensalidade | Cobrança extra manual com valor editável |
| **6. Inadimplente crônico** | Aciona negativação após avisos | "Posso negativar? É legal?" 😟 | Medo de processo (CDC) | Aviso prévio obrigatório automático; sistema garante a lei |
| **7. Regularização** | Pai paga, negativação some sozinha | "Que alívio" 😀 | Esquecer de tirar do SPC | Baixa automática via webhook |

**Momento da verdade:** fase 4 (cobrar atrasado). É a maior dor da Fran hoje.
**Métrica:** redução de tempo gasto cobrando; queda da inadimplência mês a mês.

---

## Jornada 4 — Pimenta (franqueado) decide e acompanha

| Fase | Ação | Pensa / Sente | Dor | Oportunidade |
|------|------|---------------|-----|--------------|
| **1. Descoberta** | Vê a demo (protótipo) que o comercial mostra | "Isso parece sério?" 🙂 | Ferramentas amadoras no mercado | Estética Alfabeto (azul institucional), parece banco |
| **2. Avaliação** | Pergunta "quanto reduzo de inadimplência?" | "Vale o custo?" 😐 | Não enxergar ROI | Demo mostra dashboard de inadimplência + negativação |
| **3. Decisão** | Aceita os termos da IX e ativa | "Espero que funcione" 🙂 | Burocracia de contrato | Aceite digital simples |
| **4. Primeiros resultados** | Vê 1º mês: recebimento + atrasos caindo | "Tá funcionando" 😀 | Resultado lento/invisível | Relatório claro do mês; comparativo |
| **5. Expansão** | Considera ativar outra unidade | "Quero em todas" 😀 | — | Onboarding repetível por unidade |

**Momento da verdade:** fase 1 (demo). É onde o protótipo do Stitch/Claude entra.
**Métrica:** conversão da demo em ativação; nº de unidades por franqueado.

---

## Síntese — o que as jornadas dizem pros fluxos

1. **Mobile-first na matrícula** (Maria vive no celular) — passo curto, máscaras, progresso salvo.
2. **Automático por padrão** (Fran não quer trabalho) — emissão e régua sem clique.
3. **Confiança visual** (Pimenta decide pela estética) — Alfabeto azul, parece sério.
4. **Lei sempre visível** (medo de processo) — aviso prévio e aceite registrados, explicados.
5. **Momentos da verdade a caprichar:** criação da subconta, aceite na matrícula, cobrar atrasado, demo de venda.

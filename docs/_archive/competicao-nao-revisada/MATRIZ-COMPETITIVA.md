# Matriz Competitiva — Education X

> v2.0 · Junho 2026 · Confidencial  
> ✅ disponível · ❌ não tem · ❓ não confirmado · ⚠️ parcial ou com ressalva  
> `†` = funcionalidade que depende de parceiro externo, não é nativo no Asaas

---

## 1. Cobrança e pagamentos

| Funcionalidade | Education X | Sponte | KAITS | Sophia | DK Soft | Sistema Easy | isaac |
|----------------|:-----------:|:------:|:-----:|:------:|:-------:|:------------:|:-----:|
| Boleto automático com PIX | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cartão como assinatura recorrente | ✅ | ✅ | ✅ | ✅ | ✅ | ❓ | ✅ |
| Nota fiscal automática (NFS-e) | ✅ | ✅ | ✅ | ✅ | ✅ (R$ 0,38/nota) | ❓ | ❓ |
| Aviso antes do vencimento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cobrança automática após atraso | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Negativação no SPC/Serasa | ✅ (MVP) | ✅ | ❌ | ❌ | ❓ | ❌ | ✅ |
| WhatsApp na cobrança (automático) | ✅ | ✅ | ❓ | ❌ | ✅ (pago à parte) | ❓ | ✅ |
| Email na cobrança | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SMS na cobrança | ✅ | ✅ | ❌ | ❌ | ❓ | ❌ | ❓ |
| Baixa automática quando pago | ✅ | ✅ | ❓ | ✅ | ✅ | ✅ | ✅ |
| Cobrança avulsa por aula | ✅ | ❓ | ✅ | ❓ | ❓ | ❓ | N/A |
| Garantia de recebimento mesmo com inadimplência | ❌ `†` | ⚠️ (só ed. básica) | ❌ | ❌ | ❌ | ❌ | ✅ (core) |
| Ajuste proporcional por dias no mês (entrada/saída) | ✅ (MVP) | ❓ | ❓ | ❓ | ❓ | ❓ | N/A |

> **Garantia de recebimento** (`†`): requer que uma fintech assuma o risco de quem não paga — está fora do escopo do Asaas. Só o isaac entrega como produto principal, mas cobra ~2% do recebível.

---

## 2. Gestão da escola

| Funcionalidade | Education X | Sponte | KAITS | Sophia | DK Soft | Sistema Easy | isaac |
|----------------|:-----------:|:------:|:-----:|:------:|:-------:|:------------:|:-----:|
| Cadastro e matrícula do aluno | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Aceite digital de contrato | ✅ (MVP) | ✅ | ❓ | ✅ | ❓ | ❓ | ❌ |
| Gestão de planos e matérias | ✅ (MVP) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Portal do responsável para ver cobranças | ✅ (MVP) | ✅ | ✅ | ✅ | ✅ | ❓ | ❌ |
| Diário de aula e frequência | ❌ (próximo) | ✅ | ✅ | ✅ | ✅ | ❓ | ❌ |
| Gestão de horários de professores | ❌ (próximo) | ✅ | ✅ | ✅ | ✅ | ❓ | ❌ |
| App mobile próprio | ❌ (backlog) | ✅ | ✅ | ✅ | ✅ (pago à parte) | ❓ | ❓ |
| Gestão de captação de novos alunos (CRM) | ❌ (backlog) | ✅ | ❓ | ❓ | ❓ | ❓ | ❌ |
| Gestão de múltiplas unidades | ✅ (arquitetura) | ✅ | ❓ | ✅ | ✅ | ❓ | ❓ |

---

## 3. Preço e contrato

| Critério | Education X | Sponte | KAITS | Sophia | DK Soft | Sistema Easy | isaac |
|----------|:-----------:|:------:|:-----:|:------:|:-------:|:------------:|:-----:|
| **Preço publicado no site** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Menor plano (estimativa) | R$ 349/mês | **R$ 300–1.500/mês** (estimado, opaco) | **R$ 200–800/mês** (estimado, opaco) | **R$ 800+/mês** (escola pequena) → R$ 3.000+/mês com crescimento | R$ 96,50 base + ~R$ 200/mês em taxas por boleto = **~R$ 323/mês real** | Opaco | ~R$ 895/mês (150 alunos) |
| Taxa de ativação (setup) | R$ 997–1.997 | Não divulgada | Não divulgada | **R$ 18.000** (reportado 2024) | Zero | Não divulgada | Não divulgada |
| **Fidelidade mínima** | ❌ | 12 meses | ❌ | ❓ | ❌ | ❓ | ❓ |
| **Aviso prévio para cancelar** | 30 dias | **90 dias** | 30 dias | ❓ | ❓ | ❓ | ❓ |
| **Multa por cancelamento antecipado** | ✅ (proporcional) | ✅ (valor opaco) | ❌ | ❓ | ❌ | ❓ | ❓ |
| Taxa extra para negativação | ✅ (repassada) | ❓ | N/A | N/A | ❓ | N/A | N/A |
| Taxa de cartão repassável | ✅ | ❓ | ❓ | ❓ | ❓ | ❓ | N/A |
| Taxas extras por módulo | ❌ | ❓ | ❓ | ✅ (setup R$ 18k, treinamentos, homologação bancária) | ✅ WhatsApp R$ 29,90 + App R$ 29,90 + boleto R$ 1,72–2,58/pag | ❓ | ❓ |

---

## 4. Atendimento

| Critério | Education X | Sponte | KAITS | Sophia | DK Soft | Sistema Easy | isaac |
|----------|:-----------:|:------:|:-----:|:------:|:-------:|:------------:|:-----:|
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ | ❓ | ❓ |
| WhatsApp | ✅ | ✅ | ✅ | ✅ | ❓ | ✅ | ❓ |
| Telefone | ❓ | ✅ | ✅ | ✅ | ✅ | ❓ | ❓ |
| Email | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❓ |
| Videoconferência (quando necessário) | ✅ | ❌ | ✅ | ❓ | ❓ | ❓ | ❓ |
| Horário | Seg–Sex **8h–19h** | Seg–Sex 8h–18h | Seg–Sex 8h–18h | Seg–Sex 9h–17h45 | n/d | n/d | n/d |
| Prazo para resposta por email | **48h** | Não declarado | Não declarado | 48h | Não declarado | Não declarado | n/d |
| Reputação Reclame Aqui | — | 8,2/10 (33 rec.) | Sem registro | Baixa (sem Selo) | **9,5/10 (38 rec.)** | Sem registro | n/d |

---

## 5. Onde a Education X ganha hoje

| Vantagem | Como usar na venda |
|----------|-------------------|
| **Preço transparente — você vê antes de falar com vendedor** | Sponte, KAITS, Sophia: cotação obrigatória. Aqui você decide hoje. |
| **Sem fidelidade mínima de 12 meses** | Sponte trava por 12 meses. Se não gostar, sai pagando só o aviso de 30 dias. |
| **Aviso prévio de 30 dias** | Sponte exige 90 dias — clientes processaram por abusividade. |
| **Negativação no SPC/Serasa já no lançamento** | Sophia e KAITS não têm. Você reduz inadimplência desde o primeiro mês. |
| **Feito para franquia complementar — não escola regular adaptada** | Fluxo do Kumon: matéria, plano, responsável, COF. Não é adaptação de sistema genérico. |
| **Ativa sem precisar de vendedor** | Todos os concorrentes têm ciclo de venda longo com demo, implantação, treinamento. |
| **Taxas claras — só extra de negativação** | Sophia cobra treinamentos, homologação bancária extra, reajustes progressivos. |

## 6. Onde os concorrentes ainda estão na frente (gaps a fechar)

| Gap | Quem tem | Prioridade para fechar |
|-----|----------|----------------------|
| Diário de aula e frequência | Sponte, KAITS, Sophia, DK Soft | **Alta — próximo módulo** |
| Gestão de horários de professores e atendentes | Sponte, KAITS, Sophia, DK Soft | **Alta — próximo módulo** |
| App mobile | Sponte, KAITS, Sophia, DK Soft | Backlog — web no celular resolve no curto prazo |
| Gestão de captação | Sponte | Backlog — não é motivo de troca de sistema |

---

## 7. Posição de preço no mercado

```
MAIS BARATO                                                    MAIS CARO
────────────────────────────────────────────────────────────────────────
Traus/RollClass   DK Soft real      Education X     KAITS/Sponte      Sophia        isaac
R$ 35–177/mês     ~R$ 323/mês       R$ 349–649/mês  R$ 200–1.500/mês  R$ 800–3k+    ~R$ 895/mês
(básicos)         (com taxas boleto) (preço real,    (opaco, sem lock-in               (cede % recebível)
                                      publicado)      ou com 12 meses)
```

**DK Soft:** preço publicado de R$ 96,50 é enganoso — taxas de boleto PJBank, WhatsApp e NFS-e chegam a **~R$ 323/mês real** para escola com 100 alunos. Genérico, sem vertical de franquia, arquitetura antiga (versão local instalada no servidor da escola).

**Sponte:** maior e mais completo, mas prende em contrato de 12 meses com 90 dias de aviso prévio para cancelar — contestado judicialmente como abusivo. Preço estimado R$ 300–1.500/mês, cobranças por transação via Sponte Pay não divulgadas.

**Sophia:** setup de R$ 18.000 documentado + mensalidades que crescem com o tempo + cobranças extras não previstas (homologação bancária, treinamentos, módulos de relatório). Custo total imprevisível.

**isaac:** modelo diferente — escola cede ~2% do recebível em troca de garantia de pagamento. Para 150 alunos a R$ 300/mensalidade, representa ~R$ 895/mês que sai do faturamento da escola todo mês.

**Education X:** preço publicado, sem surpresa. R$ 349 (até 100 alunos) a R$ 649 (até 350 alunos). Taxa extra apenas para negativação no SPC/Serasa. Setup R$ 997–1.997 uma única vez.

*Education X · Matriz Competitiva v2.0 · Junho 2026 · Confidencial*

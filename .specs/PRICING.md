# Pricing — Education X

> **Status:** fechado (Rafa + Claude, 2026-07-03). Fonte única de preço do produto. Resolve a pendência de pricing que a `f2-04-billing-importacao-settings` marcava como MOCK.
> **Decisão-base:** **espelhar o preço da Sponte** (concorrente homologado Kumon), com o **Asaas como custo interno** (o spread vira margem). Fonte: proposta comercial Sponte–Kumon 2026 (`~/Downloads/Apresentação Comercial Sponte - Kumon 2026_atualizada.pdf`, pág. 16-17).

---

## 1. Mensalidade SaaS (preço de venda = Sponte)

| Item | Preço de venda | Nota |
|---|---|---|
| **Plano base** | **R$ 150,00/mês** até 150 alunos | ERP gestão financeira, 5 GB anexos, usuários ilimitados |
| Aluno excedente | **R$ 1,00/aluno/mês** | acima de 150 |
| Reajuste | **IGPM anual** | mesma regra da Sponte |
| Modelo de contagem | **por aluno gerenciado** | (a Sponte usa o mesmo) |

### Serviços adicionais (mesmos valores da Sponte)
| Serviço | Preço de venda |
|---|---|
| App do responsável (Agenda) | R$ 0,80/aluno · mínimo R$ 120/mês |
| Régua de cobrança (e-mail + WhatsApp) | R$ 109,00/mês |
| NF-e/NFS-e | R$ 30,00 (até 100 notas) · R$ 0,30/nota excedente |
| Assinatura eletrônica | R$ 2,40/documento |
| SMS | R$ 0,15/envio |
| Armazenamento de anexos | R$ 1,90/mês por GB |

> **Cunha:** a Sponte **não tem negativação automática** (transcript [05:50]). A negativação SPC/Serasa (`mvp-05`) entra no produto como diferencial. Custo Asaas por inclusão (~R$ 29,90) → decidir se repassa ao responsável, à escola, ou embute (ver §4, pendência).

---

## 2. Gateway de pagamento (preço de venda = Sponte; custo = Asaas por dentro)

A escola vê o **mesmo preço que a Sponte cobra**. O Asaas é nosso custo (menor) — a diferença é margem. Assim como a Sponte faz com Pagar.me/Stone.

| Meio | Preço de venda (= Sponte) | Repasse (Sponte) |
|---|---|---|
| **Boleto** | R$ 1,50/pagamento recebido | D+2 · sem tarifa de emissão/cancelamento |
| **PIX** | R$ 1,50/pagamento recebido | D+1 |
| **Cartão recorrente** | 1,10% (Visa/Master), 2,56% (Hiper), 3,06% (Elo), 3,36% (Amex/outras) | — |
| **Cartão 1x** | 2,49% (Visa/Master) … 3,36% (Amex) | — |
| **Cartão 2–6x** | 2,55% … 3,45% | — |
| **Cartão 7–18x** | 2,85% … 3,65% | — |
| **Taxa fixa/transação (cartão)** | R$ 0,79 | — |
| **Antecipação** | 1,50% (acumulativo no parcelado) | liberação após 90 dias do credenciamento; compensação 29 dias + 2 úteis |

> **Custo interno Asaas:** as taxas reais do Asaas (boleto, PIX, cartão, antecipação) são o **custo** — **a confirmar** para calcular a margem exata por meio. Não inventar aqui; levantar da tabela oficial Asaas antes de fechar o modelo financeiro. O **preço de venda acima não muda** com isso (é fixo = Sponte); só a margem depende do custo Asaas.

---

## 3. Onde isso entra nas specs

- **`f2-04-billing-importacao-settings`** — dona do billing da plataforma (IX cobra a escola). Substituir o MOCK de pricing (`39900/59900/79900`) por: **plano único R$ 150,00/mês (15000 centavos) + R$ 1,00/aluno excedente (100 centavos)**. Adicionais como itens de linha.
- **`mvp-03-cobranca-automatica`** — as taxas de gateway (boleto/PIX/cartão) são o que a escola paga ao receber; a taxa de venda é a da tabela §2.
- **`mvp-05-negativacao`** — custo de inclusão SPC (R$ 29,90) já referenciado na spec; alinhar com §1/§4.

---

## 4. Pendências de pricing (decisão antes de codar o billing)

- **Planos múltiplos vs. único.** A Sponte–Kumon tem **plano único** (R$150 base + adicionais à la carte). O mock antigo do repo tinha 3 planos (Básico/Crescimento/Pro). **Decisão:** seguir o modelo Sponte — **1 plano base + adicionais**, não 3 tiers. Confirmar se algum dia haverá tier premium.
- **Quem paga a negativação (R$ 29,90):** responsável, escola, ou embutido. `mvp-05` usa `negativacaoFeePayer` (ESCOLA/RESPONSAVEL) — manter configurável.
- **Custo real Asaas** (para margem): levantar tabela oficial. Não bloqueia o preço de venda.
- **Absorção de taxa (`cardFeePayer` / absorção):** o onboarding (`mvp-01`) já coleta "quem paga a taxa" (escola/família) — consistente com o modelo Sponte de repasse.

---

## 5. Referência
- Proposta Sponte–Kumon 2026 (PDF, pág. 16-17) — origem de todos os valores de venda.
- Transcript reunião Sponte×Camargos 2026-06-19 — confirmou base R$150, adicionais, e a ausência de negativação.

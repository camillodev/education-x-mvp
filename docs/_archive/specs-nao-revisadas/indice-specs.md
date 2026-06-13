# Asaas — Integração Education X

> **Branch:** `feature/asaas-integration` · **Status:** 🟡 Aguardando aprovação do Rafa

Integração com a Asaas como único provedor de pagamentos do Education X — plataforma de
gestão de matrículas e cobrança para escolas (Kumon, Wizard, Cultura Inglesa).

## Estrutura das specs

| Doc | Conteúdo | Lançamento |
|-----|----------|-----------|
| [00-visao.md](./00-visao.md) | **Doc-mãe** — visão, glossário, hierarquia, jornadas, 31 decisões | — |
| [ROADMAP-IMPLEMENTACAO.md](./ROADMAP-IMPLEMENTACAO.md) | **Plano técnico de implementação do MVP** (endpoints, payloads, sequência) | — |
| [01-epico-boleto-nota-fiscal.md](./01-epico-boleto-nota-fiscal.md) | onboarding + boleto/PIX automático + extras + NFS-e | ⭐ |
| [02-epico-cobranca-automatica.md](./02-epico-cobranca-automatica.md) | emissão no fechamento + régua de avisos | ⭐ |
| [03-epico-negativacao.md](./03-epico-negativacao.md) | negativação SPC/Serasa com aviso legal | ⭐ |
| [05-epico-contratos.md](./05-epico-contratos.md) | aceite clickwrap Escola↔Responsável | ⭐ |
| [06-epico-planos-cancelamento.md](./06-epico-planos-cancelamento.md) | planos, matéria+valor, cancelamento, pro-rata | parcial |
| [04-epico-cartao-credito.md](./04-epico-cartao-credito.md) | cartão, cartões salvos, reembolso, chargeback | parcial |
| [07-epico-portal-responsavel.md](./07-epico-portal-responsavel.md) | portal do pai: boletos, histórico, NFS-e | pós-MVP |

## Como ler

1. Comece pelo **00-visao** — entende o modelo (Escola = subconta, Responsável = cliente).
2. Cada épico tem **Parte 1 (UX/Features com user stories)** e **Parte 2 (técnica)**.
3. Ordem de entrega = ordem dos épicos (01 → 04).

## Glossário rápido

- **Escola** = franquia/unidade cliente (subconta Asaas)
- **Responsável** = quem paga a mensalidade (cliente Asaas)
- **Cobrança** = boleto/PIX/cartão (payment Asaas)

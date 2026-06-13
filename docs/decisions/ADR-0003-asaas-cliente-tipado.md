# ADR-0003: Integrar Asaas via cliente tipado (interface + live + mock)

**Status:** Accepted
**Data:** 2026-06-13

## Contexto
Pagamentos via Asaas (boleto/PIX/cartão, NFS-e, negativação, antecipação). Precisamos testar a lógica de negócio sem chamar a API real, e isolar o ponto onde valores convertem de centavos (app) para reais (API Asaas).

## Decisão
Cliente tipado com `interface` + `AsaasLiveClient` + `AsaasMockClient`, migrado de `education-x-new/src/lib/integration/asaas/`. Toda chamada Asaas passa pelo cliente. A conversão centavos→reais acontece na **borda do cliente**. Sandbox primeiro.

## Consequências
✅ Lógica testável com mock, sem rede.
✅ Contrato de integração explícito (interface).
✅ Conversão de valores num único lugar.
⚠️ O mock precisa ser mantido em sincronia com a API real (contract tests contra sandbox antes de produção).

## Alternativas consideradas
- `fetch` direto: não testável, espalha a conversão de valores pelo código.
- SDK oficial: não controla a borda de conversão centavos↔reais.

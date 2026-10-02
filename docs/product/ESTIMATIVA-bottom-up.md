# Estimativa Bottom-up — Education X MVP

> Como o prazo foi calculado: por complexidade de cada ticket, não por "dia de calendário".
> Base das datas em ROADMAP.md e PLANO-TECNICO.md.
> Versão 1.0 · 13/jun/2026

## A alavanca (ajuste este número e tudo recalcula)

**1 sessão de Claude = 1,5h de revisão do Rafael.**

Esse é o único número subjetivo. Revisar uma sessão com qualidade alta (baixa manutenção) = ler o diff → rodar no preview → testar nos 3 breakpoints → validar o comportamento real → aprovar ou pedir correção → re-revisar. Para tarefas críticas (cobrança, webhook, billing) inclui o custo de pensar se a lógica está certa.

**"Sessões por ticket"** = complexidade real + limite de contexto/token por sessão produtiva. Tela dumb (Haiku) ≈ 0,5 · service com regra de negócio (Sonnet) ≈ 1 · integração sensível com dinheiro/idempotência/segurança ≈ 2.

## Tabela por ticket

| Ticket | Complexidade | Sessões |
|--------|--------------|---------|
| 0.1 Revisão cliente Asaas | Média (auditoria) | 1 |
| 0.2 Scaffold + migração Asaas + tokens | Média | 1,5 |
| 0.3 Quality gate + CI | Média | 1 |
| 1.1 Schema base + criptografia AES | Alta (cripto crítica) | 2 |
| 1.2 Service onboarding + subconta + rollback | Alta (rollback externo) | 1,5 |
| 1.3 Wizard 4 passos + FeeRouter + NFS-e/matéria | Alta (4 telas + lógica) | 2,5 |
| 1.4 Auth + RBAC + isolamento tenant | Alta (segurança) | 2 |
| 1.5 Termos + isenção IX (redação) | Média | 1 |
| 2.1 Planos + 2 descontos + 5 alunos | Alta (pricing) | 2 |
| 2.2 Matrícula via link + duplo aceite | Média-alta | 1,5 |
| 2.3 Matrícula manual + confirmação | Média-alta | 1,5 |
| 3.1 Resolver/criar customer Asaas | Baixa (wrapper) | 0,5 |
| 3.2 Emitir Invoice boleto/PIX | Alta (dinheiro, idempotência) | 2 |
| 3.3 Webhook idempotente + event bus | Alta (núcleo crítico) | 2 |
| 4.1 NFS-e automática | Média-alta (fiscal) | 1,5 |
| 4.2 Régua de avisos (Asaas nativo) | Baixa (config) | 0,5 |
| 4.3 Cron de emissão em lote | Média-alta (orquestração) | 1,5 |
| 4.4 Contract tests Asaas real (GATE) | Alta (reconciliação) | 2 |
| 5.1 Schema + interface negativação | Média | 1,5 |
| 5.2 Regularização + UI 4 status + opt-out | Alta (máq. estados) | 2 |
| 6.1 Dashboard 3 abas + 4 relatórios + funil | Alta (muita UI + dados) | 2,5 |
| 6.2 Lista + detalhe cobrança | Média | 1,5 |
| 6.3 Cobrança extra avulsa | Baixa-média | 1 |
| 7.1 Portal responsável (home/PIX/vencido/NF/notif) | Alta (5 telas mobile) | 2,5 |
| 7.2 Cartão recorrente + tokenização | Alta (sensível) | 2 |
| 8.1 Saldo + saque PIX | Média-alta (dinheiro) | 1,5 |
| 8.2 Antecipação de recebíveis | Média-alta (cálculo) | 1,5 |
| 9.1 Billing da plataforma (planos IX + faturas) | Alta (cobrança B2B) | 2,5 |
| 9.2 Settings completo (3 abas) | Média | 1,5 |
| 9.3 Importação CSV + validação | Média-alta (parser) | 1,5 |
| Buffer integração/E2E entre fases | — | 3 |

## A conta, até semanas

- **Σ sessões** = 56,5
- **Σ horas de revisão** = 56,5 × 1,5h = 84,75h
- **+10% folga** = ~93h
- **÷ 6h/dia** = ~15,5 dias úteis
- **Início seg 16/jun**, 5 dias úteis/semana → **~3,1 semanas**

### Marcos
- **Núcleo demonstrável** (tickets 0.x–6.x, sem Portal/saque/billing): 38,5 sessões → 58h → +10% = 63,5h → ~10,5 dias úteis → **~2/jul**
- **MVP completo** (9 fluxos): **~8/jul**

### Sensibilidade (se as âncoras mudarem)
| Se… | Então… |
|-----|--------|
| Revisão = 1h/sessão (corrida) | ~62h → ~10,5 dias → MVP ~7/jul (mais risco de retrabalho) |
| Revisão = 2h/sessão (cuidadosa) | ~124h → ~21 dias → MVP ~25/jul (mais seguro p/ baixa manutenção) |
| Ritmo = 4h/dia (em vez de 6h) | ~93h ÷ 4 = ~23 dias → MVP ~25/jul |

## Premissas
- Asaas já liberada (conta + dunning + sandbox) — sem espera externa pro núcleo.
- Claude escreve o código; o gargalo é a revisão do Rafael, não o tempo de codar.
- Qualidade e baixa manutenção acima de velocidade — por isso a alavanca de 1,5h/sessão é conservadora de propósito.

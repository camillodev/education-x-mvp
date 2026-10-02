# Pricing Strategy — Education X

> Versão 0.1 (RASCUNHO) · 13/jun/2026
> ⚠️ **Documento parcial.** A hipótese de preço está definida; os campos marcados `[PESQUISAR]` dependem da pesquisa de concorrentes 1-a-1 que o Rafa fará. Validar nas primeiras vendas.

---

## 1. Princípio de pricing

A IX cobra a **escola** uma **mensalidade fixa** (SaaS) + **taxas extras** (negativação, recebimento). **Não escala por aluno nem por matéria** — preço fixo, simples, previsível.

> **Por quê fixo e não por aluno?** A dor primária do ICP é **margem** — a franqueadora já leva ~40% do faturamento (ver `00-PERSONAS`, `education-x-dor-posicionamento`). Preço variável que cresce com a escola assusta quem tem margem apertada. Preço fixo baixo é coerente com "não tiro mais da sua margem". E separa o nosso pricing (IX→escola) do pricing do produto (escola→pai, que é por matéria — ver H9 / ADR de schema).

---

## 2. Tabela de preços (hipótese de trabalho — validar nas 1ªs vendas)

| Plano | Faixa de alunos | Mensalidade IX→escola | Status |
|-------|-----------------|------------------------|--------|
| Único (MVP) | até 200 alunos | **R$ 400/mês** | ⚠️ hipótese (Rafa, 13/jun) |
| `[PESQUISAR]` | 201–`[?]` | `[PESQUISAR]` | a definir após pesquisa |

> Para o MVP e o piloto, **um plano só** (até 200 alunos, R$ 400/mês). Faixas adicionais entram quando houver demanda real — não criar complexidade de pricing antes de validar a faixa de entrada.

### Taxas extras (IX→escola)
| Taxa | Valor | Status |
|------|-------|--------|
| Negativação (SPC/Serasa) | `[PESQUISAR custo Asaas + margem]` | a definir |
| Recebimento (por transação paga) | `[PESQUISAR — boleto Asaas ~R$1,99; PIX grátis]` | a definir |

> **Quem paga a taxa** (escola ou responsável) é configurável no onboarding via FeeRouter (`cardFeePayer`, `negativacaoFeePayer` — ver PLANO-TECNICO Tarefa 1.3).

---

## 3. Benchmarks de concorrência (dados reais — Rafa, 13/jun)

| Concorrente | Preço observado | Por aluno | Observação |
|-------------|-----------------|-----------|------------|
| **Sponte** | R$ 600 / 80 alunos | ~R$ 7,50 | Tem parceria com franquia; robusto mas caro pra escola pequena |
| **Orienthe** | R$ 250 / 140 alunos | ~R$ 1,79 | Barato, mas qualidade ruim (segundo Rafa) |
| **Isaac** | ~R$ 900/mês | — | Segmento acima (garantia de recebível); âncora de preço alta |
| **Educbank** | `[PESQUISAR]` | — | Nicho de garantia de recebível |
| **Nosso plano (hipótese)** | R$ 400 / até 200 | a partir de ~R$2,00 (200 alunos) | Mais simples/barato que Sponte, melhor que Orienthe |

**Posicionamento de preço:** entre Orienthe (barato/ruim) e Sponte (caro/robusto) — "mais simples e barato que o Sponte, e que funciona de verdade (ao contrário do Orienthe)". Ancorar abaixo do Isaac quando o prospect o conhecer (H7).

---

## 4. Pesquisa de concorrentes 1-a-1 (TODO — Rafa)

> Rafa fará pesquisa direta pra calibrar. Preencher esta seção conforme os dados chegarem.

Concorrentes a investigar e o que descobrir de cada (preço, por quantos alunos, o que inclui, força/fraqueza):
- [ ] Sponte — confirmar tabela completa de planos
- [ ] Orienthe — confirmar
- [ ] Isaac — planos e o que muda em relação a nós (garantia de recebível)
- [ ] Educbank — `[PESQUISAR]`
- [ ] Outros que aparecerem nas demos (registrar verbatim — H7)

---

## 5. Hipóteses de pricing a validar (de HIPOTESES-VALIDACAO)

| # | Hipótese | Como validar |
|---|----------|--------------|
| H6 | R$ 400 até 200 alunos é aceitável | 1ªs vendas + entrevistas externas (fora do círculo Pimenta) |
| H8 | Setup isento remove fricção | A/B em propostas (pós-PMF) |
| H18 | Inadimplência ~5%, ticket ~R$550/aluno (argumento de ROI) | Dados reais do Kumon Camargos |
| H19 | COGS < R$3/aluno (margem >95%) | Fatura Asaas após 1 mês |

---

## 6. Restrição estratégica

Nada no pricing ou na comunicação de preço pode soar como "fuja da franquia". A IX precisa do apoio do dono da franqueadora no médio/longo prazo (ver `ICP-FASEADO`). Vender economia/margem, não rebeldia contra a rede.

---

*Fontes de benchmark: dados diretos do Rafa (13/jun/2026) + MARKET-SIZING.md. Validação: WIP-HIPOTESES-VALIDACAO.md.*

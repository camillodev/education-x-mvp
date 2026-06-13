# DevOps & Infraestrutura — Education X

> **Autoria:** Coda (Engineering Lead, Impact X)  
> **Data:** 2026-06-12  
> **Status:** Rascunho v1 — aprovação pendente  
> **Público:** Rafa (CEO/CTO), tech lead futuro  
> **Princípio-guia:** Baixa manutenção, custo enxuto, escala pequena por design.

---

## 1. Filosofia de Infra

Education X opera com **1 fundador + 1 vendedor**, começa em 1 escola piloto (Kumon Camargos) e projeta 200–500 unidades em 18 meses. Essa escala define tudo:

**Regras de ouro:**

1. **Gerenciado > self-hosted.** Zero servidor para manter. Se um serviço gerenciado cobre o caso, usar sempre — mesmo que seja 20% mais caro. A hora do Rafa não é barata.
2. **Free tier até provar demanda.** Não pagar por capacidade antes de ter usuários. Só mover de tier quando a dor for real, não projetada.
3. **Pago onde dói se falhar.** Auth (Clerk), banco (Supabase), pagamentos (Asaas) — aqui o free tier tem risco real de outage ou limite surprise. Avaliar caso a caso.
4. **PII em mãos confiáveis.** CPF, dados de menores, histórico de negativação — esses dados não podem ir para nuvens sem compliance LGPD/GDPR documentado.
5. **Um ambiente de prod limpo.** Dev e staging isolados via preview deploys e branches, nunca compartilhando dados reais.
6. **Backups automáticos desde o dia 1.** PITR no banco. Não é paranoía: é custo de um bug de schema que sobrescreve dados de 40 famílias.

---

## 2. Stack de Infra Recomendada

### Tabela principal

| Serviço | Função | Plano recomendado | Preço (2026) | Quando subir de tier |
|---------|--------|-------------------|--------------|----------------------|
| **Vercel** | Hosting Next.js (frontend + API routes) | Pro | ~$20/mês (1 seat) | Se ultrapassar 1M invocações/mês ou precisar de more team seats |
| **Supabase** | PostgreSQL gerenciado (banco + storage + realtime) | Pro | $25/mês | >8GB dados ou >100k MAU — provavelmente na faixa 50–100 escolas |
| **Clerk** | Auth (login, sessões, MFA, multi-tenant por escola) | Free → Pro | $0 → $25/mês | >10k MAU (~50–80 escolas ativas com múltiplos usuários) |
| **Asaas** | Pagamentos, boleto, PIX, NFS-e, negativação, régua | Pay-per-use (já contratado) | % sobre transações | Não há tier — custo cresce com volume de cobranças |
| **Resend** | Emails transacionais (notificações admin, alertas) | Free → Pro | $0 → $20/mês (50k emails) | >3k emails/mês (free tier) |
| **Sentry** | Monitoramento de erros (frontend + backend) | Free | $0 | >5k erros/mês ou se precisar de alertas avançados |
| **Uptime Robot** | Uptime check (ping a cada 5min) | Free | $0 | Nunca — free é suficiente pra alertas de downtime |
| **Cloudflare** | DNS + CDN + proteção DDoS | Free | $0 | Se precisar de WAF avançado — improvável no horizonte |
| **Supabase Storage** | PDFs (boletos, NFS-e, contratos) | Incluído no Pro | ~$0.021/GB além dos 100GB incluídos | Se volume de PDFs ultrapassar 100GB (~10M docs) |
| **GitHub** | Repositório + GitHub Actions CI/CD | Free (1 repo privado) | $0 | Se precisar de mais minutos de Actions ou mais seats |
| **Vercel Analytics** | Performance e Web Vitals | Incluído no Pro | $0 extra | — |

### Notas por serviço

**Vercel** — A escolha natural para Next.js. Preview deploys por branch são fundamentais para testar sem contaminar prod. O plano Pro a $20/mês (1 seat) cobre bem o piloto. Bandwidth inclusa (1TB/mês no Pro) é mais que suficiente.

**Supabase** — PostgreSQL gerenciado com Row Level Security nativa (crítico para isolamento por escola). O plano Free tem limitações sérias: pausa o projeto após 7 dias de inatividade e não inclui PITR. **Para produção, Pro ($25/mês) desde o dia 1.** O PITR (point-in-time recovery) está incluso no Pro, o que é obrigatório dado que lida com dados financeiros e PII.

**Clerk** — Melhor escolha para multi-tenant (cada escola = uma organização no Clerk). Free tier em 2026 cobre até 10k MAU, mas verificar limite exato ao contratar. O plano Pro ($25/mês + $0.02/MAU acima do base) ainda é barato comparado ao custo de construir auth próprio. MFA incluso, o que é bom para LGPD.

**Asaas** — Já é o processador de pagamentos definido na spec do produto. Email/SMS de régua de cobrança é nativo do Asaas — não precisamos de serviço separado para isso. Usar email transacional próprio (Resend) apenas para notificações admin do Education X, não para os responsáveis.

**Resend** — Para emails internos: alertas de erro, notificações para o admin da escola, onboarding. O free tier (3k emails/mês) é suficiente para o piloto. Asaas cuida dos emails para os responsáveis (boleto, lembrete, negativação).

**Sentry** — Free tier cobre 5k erros/mês com 90 dias de retenção. Suficiente para o piloto e fase inicial. Integração nativa com Next.js e Node.

---

## 3. Custo Total Estimado por Estágio

| Estágio | Escolas | MAU estimado | Custo mensal |
|---------|---------|--------------|--------------|
| **(a) Piloto** | 1 (Kumon Camargos) | ~50 (staff + responsáveis ativos) | **~$45–50/mês** |
| **(b) Tração inicial** | 10 escolas | ~500 MAU | **~$70–80/mês** |
| **(c) Crescimento** | 100 escolas | ~5.000 MAU | **~$130–160/mês** |
| **(d) Escala** | 500 escolas | ~25.000 MAU | **~$350–450/mês** |

### Detalhamento por estágio

#### (a) Piloto — 1 escola (~$47/mês)

| Serviço | Custo |
|---------|-------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Clerk | $0 (free) |
| Resend | $0 (free) |
| Sentry | $0 (free) |
| Uptime Robot | $0 (free) |
| Cloudflare DNS | $0 |
| GitHub | $0 |
| **Total** | **~$45/mês** |

#### (b) 10 escolas (~$75/mês)

| Serviço | Custo |
|---------|-------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Clerk | $0 (ainda no free) |
| Resend | $0 (free) |
| Sentry | $0 (free) |
| **Total** | **~$45/mês** |

> Custo por escola: ~$4,50/escola/mês (quase zero — margens ótimas)

#### (c) 100 escolas (~$145/mês)

| Serviço | Custo |
|---------|-------|
| Vercel Pro | $20 |
| Supabase Pro | $25 (base) + ~$10 bandwidth overage estimado |
| Clerk Pro | $25 base + ~$10 MAU overage (5k MAU acima do base) |
| Resend Pro | $20 (volume de emails admin começa a crescer) |
| Sentry Team | ~$26 (se superar o free tier em erros) |
| Cloudflare | $0 |
| **Total** | **~$116–150/mês** |

> Custo por escola: ~$1,20–1,50/escola/mês — marginal

#### (d) 500 escolas (~$400/mês)

| Serviço | Custo |
|---------|-------|
| Vercel Pro (múltiplos seats ou Enterprise) | $60–100 |
| Supabase Pro + bandwidth | $25 + ~$40 overages |
| Clerk Pro | $25 + ~$150 (25k MAU × $0.02 × fração acima do base) |
| Resend Business | $50 |
| Sentry Business | $80 |
| Cloudflare Pro (opcional, WAF) | $20 |
| **Total** | **~$370–450/mês** |

> Custo por escola: menos de $1/escola/mês. Com pricing de R$ 299–499/escola/mês, a infra é menos de 0,5% da receita.

---

## 4. Ponto de Virada de Custo

Cada serviço tem um ponto onde sai do free tier ou do plano base. Aqui o mapa:

| Serviço | Tier atual (piloto) | Trigger de upgrade | Custo ao subir |
|---------|--------------------|--------------------|----------------|
| **Clerk** | Free (~10k MAU) | ~50–80 escolas com staff + responsáveis ativos | $25/mês base + $0.02/MAU acima |
| **Supabase** | Pro $25/mês | >8GB banco (estimado em ~150–200 escolas, cada escola ~50MB médio) | Overage $0.021/GB |
| **Supabase bandwidth** | 100GB/mês incluído | >100GB transferência — improvável antes de 200 escolas | $0.09/GB |
| **Resend** | Free 3k emails/mês | ~30–40 escolas ativas com alertas e onboarding | $20/mês (50k emails) |
| **Sentry** | Free 5k errors/mês | Depende de bug rate — monitorar | $26/mês (100k errors) |
| **Vercel** | Pro 1 seat | Precisa de mais devs com acesso ou ultrapassa 1M invocações serverless | $20/seat adicional |

**Regra prática:** até 50 escolas, o custo de infra não se move de $45–50/mês. O próximo salto real acontece em torno de 80–100 escolas com o Clerk Pro e eventuais overages de Supabase.

---

## 5. Ambientes

### Três ambientes, separação clara

| Ambiente | Branch | URL | Banco | Dados |
|----------|--------|-----|-------|-------|
| **Production** | `main` | `app.educationx.com.br` | Supabase projeto `prod` | Dados reais — escolas, responsáveis, cobranças |
| **Staging** | `staging` | `staging.educationx.com.br` | Supabase projeto `staging` | Dados sintéticos — seed automatizado |
| **Development** | qualquer `feature/*` | Preview URL Vercel automática | Supabase local (CLI) | Local — nunca dados reais |

### Regras de ambiente

- **Preview deploys** — Vercel gera URL única por branch (`feature-cobranca-auto.educationx.vercel.app`). Ótimo para QA antes de merge.
- **Staging** — réplica de prod sem dados reais. Usado para smoke tests e demos para clientes. Banco separado no Supabase (projeto diferente, não apenas schema diferente).
- **Variáveis de ambiente** — via Vercel dashboard, nunca em código. Cada ambiente tem suas próprias chaves Clerk, Supabase, Asaas sandbox.
- **Asaas sandbox** — existe ambiente de sandbox separado da Asaas para dev/staging. Nunca usar chaves de prod fora do ambiente production.
- **Dados de dev** — nunca copiar dados reais para dev. Usar Supabase CLI local com seed de dados fictícios.

### Isolamento de escolas no banco

O isolamento por tenant é implementado **na camada de aplicação** (ver SYSTEM-DESIGN.md seção 5): toda query Prisma é escopada por `unitId`, que vem sempre da sessão Clerk (nunca de parâmetro HTTP), via uma Prisma client extension que injeta o `unitId` automaticamente — nenhuma query pode "esquecer" o scope. **RLS do Postgres fica ativo apenas em `audit_logs`** (camada extra na tabela mais sensível). Essa abordagem é adequada ao porte atual (escala pequena por design) e mantém a baixa manutenção — sem duplicar a lógica de tenant entre app e banco. Vazamento entre tenants seria incidente grave de LGPD, por isso o isolamento por aplicação é coberto por teste Playwright cross-tenant (escola A → dados de B → 403).

---

## 6. CI/CD

### Pipeline recomendado: GitHub Actions + Vercel

```
Push para feature/* branch
  │
  ├── GitHub Actions (CI)
  │     ├── lint (ESLint + Prettier) — ~30s
  │     ├── typecheck (tsc --noEmit) — ~45s
  │     ├── unit + integration tests (Vitest) — meta: 80% coverage  — ~2min
  │     └── build (next build) — ~3min
  │
  ├── Vercel Preview Deploy (automático) — ~3min
  │     └── URL de preview gerada automaticamente
  │
  └── E2E (Playwright, roda na preview URL) — ~5min
        └── flows críticos: login, onboarding escola, gerar cobrança, pagar (sandbox Asaas)

PR aprovado → merge para main
  │
  └── Vercel Deploy para Production (automático) — ~3min
        └── Zero-downtime (Vercel ISR + edge)
```

### Configuração GitHub Actions

O pipeline roda em paralelo onde possível (lint + typecheck simultâneos). O E2E roda só em PRs para `main` e `staging` — não em cada feature branch (muito lento para feedback rápido em dev).

**Cobertura de testes:**
- **80% coverage** como gate para merge em `staging`
- **90% coverage** como meta para merge em `main` (não gate — bloquear build por 1% de coverage é contraproducente)
- E2E cobre os 5 flows críticos: autenticação, onboarding escola, matrícula de aluno, geração de cobrança, visualização de pagamentos

**Por que GitHub Actions e não só Vercel?**
Vercel roda build e deploy, mas não testes. O combo GitHub Actions (testes) + Vercel (deploy) é o padrão para Next.js e tem custo zero nos planos free/Pro para repos com < 2.000 minutos de Actions/mês — o que cobre bem o piloto e fase inicial.

---

## 7. Backups e Disaster Recovery

### Supabase Pro — o que está incluso

| Feature | Plano Free | Plano Pro |
|---------|-----------|-----------|
| Backups diários | Sim (7 dias retenção) | Sim (7 dias retenção) |
| PITR (Point-in-Time Recovery) | Não | **Sim — até 7 dias** |
| Backup manual via dashboard | Sim | Sim |
| Restore em nova instância | Sim | Sim |

**Por que o PITR importa aqui:** Education X lida com cobranças de mensalidades. Um bug que sobrescreve pagamentos ou matrículas precisa de restauração granular (ex: "restaurar para 14:32 de ontem, antes do deploy com bug"). O backup diário não cobre isso — PITR sim.

### Plano de DR simplificado

| Cenário | Tempo de recuperação estimado | Ação |
|---------|-------------------------------|------|
| Bug que corrompeu dados nas últimas horas | <30min | PITR no Supabase — restore para momento anterior |
| Exclusão acidental de tabela/schema | <1h | Restore de backup diário ou PITR |
| Vercel com deploy quebrado | <5min | Rollback para deploy anterior (1 clique no dashboard Vercel) |
| Supabase indisponível | Aguardar (SLA 99.9%) | Vercel retorna erro controlado — não perde dados |
| Conta Clerk comprometida | <2h | Revogar sessões em massa via Clerk dashboard, rodar redefinição de senhas |

### Retenção de dados (LGPD)

- Dados de alunos menores: manter pelo período contratual + 5 anos (recomendação LGPD para dados de menores)
- Dados financeiros (cobranças, notas fiscais): 5 anos (obrigação fiscal)
- Logs de acesso: 6 meses mínimo (LGPD, incidentes)
- Implementar soft-delete (nunca DELETE físico em dados financeiros) — marcar como `deleted_at` e arquivar

---

## 8. Monitoramento e Observabilidade

### Stack recomendada

| Ferramenta | O que monitora | Plano | Custo |
|-----------|---------------|-------|-------|
| **Sentry** | Erros em runtime (frontend + backend), stack traces, performance | Free (5k erros/mês) | $0 |
| **Uptime Robot** | Uptime da URL de prod (ping a cada 5min) + alerta WhatsApp/email | Free (50 monitors) | $0 |
| **Vercel Analytics** | Web Vitals, performance de páginas, Core Web Vitals | Incluso no Pro | $0 extra |
| **Vercel Logs** | Logs de serverless functions em tempo real | Incluso no Pro | $0 extra |
| **Supabase Dashboard** | Query performance, conexões ativas, slow queries | Incluso | $0 |

### O que alertar (regras de ouro)

Configurar alertas para:
1. Uptime caiu (Uptime Robot → WhatsApp do Rafa)
2. Taxa de erro > 1% em 5min (Sentry → email)
3. Erro novo não visto antes (Sentry → email imediato)
4. Falha em geração de cobrança (log de erro crítico via Sentry — impacto direto em receita)
5. Supabase: conexões > 80% do pool (sinal de vazamento de conexão)

### Logging

- Usar `console.error` com contexto estruturado (JSON) nas API routes — Vercel Logs captura automaticamente
- Para logs de auditoria (quem acessou qual cobrança), salvar no banco (`audit_log` table) — requisito LGPD implícito
- Não logar PII em logs de aplicação (CPF, nome completo) — só IDs internos

---

## 9. Segurança e LGPD na Infra

### Onde o PII reside

| Dado | Onde fica | Proteção |
|------|-----------|----------|
| CPF do responsável | Supabase PostgreSQL | Criptografia AES-256-GCM no campo + isolamento por `unitId` na app |
| Nome e dados do aluno menor | Supabase PostgreSQL | Criptografia no campo + isolamento por `unitId` (escola correspondente) |
| Histórico de cobranças e pagamentos | Supabase PostgreSQL + Asaas | Isolamento por `unitId` na app + dados financeiros na Asaas (subconta isolada) |
| PDFs de boletos e NFS-e | Supabase Storage | Bucket privado, acesso por signed URL com expiração |
| Dados de negativação | Asaas (não replicado no Education X) | Asaas gerencia conformidade com SPC/Serasa |
| Tokens de sessão | Clerk (gerenciado) | Clerk é SOC 2 Type II certificado |

### Conformidade dos provedores

| Provedor | LGPD/GDPR | Certificação | Data Center no Brasil? |
|---------|-----------|-------------|----------------------|
| **Vercel** | GDPR compliant (DPA disponível) | SOC 2 Type II | Edge no Brasil (São Paulo) |
| **Supabase** | GDPR compliant (DPA disponível), SOC 2 Type II | SOC 2 Type II | Região `sa-east-1` (São Paulo) disponível no Pro |
| **Clerk** | SOC 2 Type II, GDPR compliant | SOC 2 Type II | Dado em US por padrão — avaliar impacto LGPD |
| **Asaas** | Empresa brasileira, LGPD nativo | PCI DSS | Brasil |

**Ação obrigatória:** configurar Supabase na região `sa-east-1` (São Paulo) desde o início — evita discussão sobre transferência internacional de dados de menores.

**Clerk e LGPD:** Clerk armazena dados de autenticação (email, nome) em servidores nos EUA por padrão. Para LGPD estrita, explorar se Clerk oferece EU hosting (como proxy para BR). Alternativa: minimizar dados em Clerk (só email + ID), mantendo nome/CPF somente no Supabase BR.

### Secrets e credenciais

- Todas as variáveis de ambiente no Vercel dashboard (nunca em `.env` commitado)
- Chaves da Asaas, Clerk, Supabase: rotação manual a cada 6 meses ou imediata em caso de vazamento
- Nunca logar tokens ou chaves em nenhum log (Sentry, Vercel Logs)
- `.env.local` nunca commitado (`.gitignore` obrigatório)

### Checklist LGPD mínimo para ir a prod

- [ ] DPA assinado com Supabase
- [ ] Banco na região `sa-east-1`
- [ ] Anonimização implementada (não apagar dados financeiros/fiscais fisicamente — ver SYSTEM-DESIGN seção 7)
- [ ] Isolamento por `unitId` na app + criptografia AES-256-GCM nos campos PII; RLS ativo em `audit_logs`
- [ ] Teste Playwright cross-tenant (escola A → dados de B → 403)
- [ ] Tabela `audit_logs` (quem acessou o quê, quando — sem PII em plaintext)
- [ ] Política de privacidade publicada no produto
- [ ] Mecanismo de solicitação de exclusão de dados (LGPD Art. 18)

---

## 10. Recomendação Final

### Stack mínima viável — começar HOJE

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Pro (1 seat) | $20/mês |
| Supabase | **Pro** (região sa-east-1) | $25/mês |
| Clerk | Free | $0 |
| Asaas | Pay-per-use | % transação |
| Resend | Free | $0 |
| Sentry | Free | $0 |
| Uptime Robot | Free | $0 |
| Cloudflare DNS | Free | $0 |
| GitHub | Free | $0 |
| **Total fixo** | | **$45/mês** |

**Por que Supabase Pro desde o primeiro dia e não Free?**
O Free pausa projetos após 7 dias de inatividade e não tem PITR. Para um piloto com dados reais de uma escola (famílias, cobranças, CPFs), isso é risco inaceitável. Os $25/mês são o custo de não acordar com o banco pausado.

### Caminho de evolução

```
Hoje (piloto 1 escola)
  → $45/mês fixo
  → Validar PMF com Kumon Camargos

~50–80 escolas
  → Clerk atinge free tier limit → migrar para Pro (+$25/mês)
  → Custo total: ~$70/mês

~100 escolas
  → Avaliar Supabase Team ($599/mês) se:
    · PITR > 7 dias for necessário
    · Time crescer e precisar de roles granulares
  → Ou: otimizar banco para ficar no Pro por mais tempo
  → Custo total: ~$120–160/mês

~500 escolas
  → Avaliar Vercel Enterprise (SLA, suporte dedicado)
  → Avaliar Sentry Team para alertas avançados
  → Custo total: ~$350–450/mês
  → Receita estimada: R$ 60k–250k MRR
  → Infra = menos de 0,5% da receita
```

**O que NÃO fazer no horizonte de 18 meses:**
- Não montar Kubernetes ou infraestrutura própria
- Não self-hostar banco PostgreSQL (não vale o custo operacional)
- Não construir auth próprio (Clerk é mais seguro e mais barato)
- Não over-provisionar — só subir de tier quando a dor for concreta

---

*Próxima revisão sugerida: quando atingir 50 escolas ou o custo mensal ultrapassar $100/mês.*

# System Design Checklist — Impact X

## Antes de começar
- [ ] Problema está bem definido (PRD exists)
- [ ] Requisitos funcionais listados
- [ ] Requisitos não-funcionais com targets numéricos
- [ ] Escopo está claro (o que NÃO fazemos)

## Arquitetura
- [ ] Diagrama de alto nível (componentes + comunicação)
- [ ] Stack justificada (por que cada tecnologia?)
- [ ] Trade-offs documentados (o que escolhemos vs. alternativas)
- [ ] Modelo de dados desenhado (tabelas + relações)

## API
- [ ] Endpoints listados (método, path, auth, descrição)
- [ ] Request/Response schemas definidos
- [ ] Error responses padronizados
- [ ] Rate limiting definido
- [ ] Versionamento definido

## Segurança
- [ ] Auth strategy definida
- [ ] Authorization rules (quem pode o quê)
- [ ] Input validation em todas as entradas
- [ ] Secrets management (env vars, nunca hardcoded)
- [ ] CORS configurado
- [ ] Rate limiting em endpoints públicos

## Performance
- [ ] Caching strategy (o que, onde, TTL)
- [ ] Database indexes planejados
- [ ] Queries otimizadas (sem N+1)
- [ ] CDN para assets estáticos

## Observabilidade
- [ ] Logging estruturado
- [ ] Error tracking (Sentry ou similar)
- [ ] Métricas de performance
- [ ] Health check endpoint

## Deploy
- [ ] CI/CD pipeline definido
- [ ] Environment strategy (dev, staging, prod)
- [ ] Rollback plan
- [ ] Database migration strategy

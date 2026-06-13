# ADR-0001: Usar Next.js monolito modular

**Status:** Accepted  
**Data:** 2026-06-13

## Contexto
O projeto necessita backend + frontend integrados, com time reduzido (1 dev) e agentes auxiliares. Requer baixa complexidade operacional e deploy simplificado. Alternativas iniciais apontavam para NestJS separado ou monorepo front/back.

## Decisão
Usar Next.js 16 com App Router como monolito modular. Backend implementado via API routes + services layer, sem framework backend separado. Camadas de aplicação mantidas por disciplina dos guidelines, não por DI framework.

## Consequências
✅ Um repositório único, um deploy único  
✅ Sem overhead operacional de DI ou orquestração de múltiplos processos  
✅ Alinhado com stack existente (Vercel, Prisma, Clerk)  
⚠️ Disciplina de camadas (controllers/services/repos) fica por conta do time  
⚠️ Sem validação automática de dependências que NestJS ofereceria  

## Alternativas consideradas
- **NestJS separado:** Framework robusto mas overhead desnecessário para 1 dev
- **Monorepo front/back:** Flexibilidade de linguagens, mas complexidade de orquestração e deploy múltiplo

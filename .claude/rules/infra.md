# Regras Infraestrutura — Education X

Vercel (frontend + API routes) + Supabase (Postgres) + Clerk (auth). Carregar ao mexer em
config de deploy, env var, runtime, ou cache.

## Patterns

- **Node runtime é o default.** Edge só quando há ganho medido de latência e o código não usa
  Prisma Client nem API de Node. Prisma no Edge exige setup específico — não é o caminho padrão
  deste projeto.
- **Cache explícito, nunca implícito.** Toda rota que busca dado declara sua estratégia
  (`revalidate`, `cache: 'no-store'`, ou `dynamic = 'force-dynamic'`). Depender do default é
  como o dado de uma escola acaba servido para outra.
- **Env var validada no boot** com Zod, falhando alto. Env faltando tem que quebrar o build ou
  o startup — nunca virar `undefined` que só aparece em produção, num caminho raro.
- **Preview deploy é o ambiente de homologação** (Gate 3). O que o Rafa testa é o preview do PR,
  não a máquina de quem desenvolveu.

## Anti-padrões

- ❌ **Secret em `NEXT_PUBLIC_*`.** Tudo com esse prefixo vai pro bundle do browser, em texto
  plano, para qualquer visitante. Chave de serviço Supabase e secret do Clerk **nunca**.
- ❌ Ler `process.env` no meio de um componente. Env é lida uma vez, validada, e exportada
  tipada de um módulo de config.
- ❌ Assumir que env var de build está disponível em runtime (e vice-versa) — na Vercel são
  momentos diferentes.
- ❌ Migration rodando automática no deploy sem gate humano. Deploy e migration têm janelas de
  rollback diferentes: código volta em 1 clique, schema não.
- ❌ Log de payload inteiro em produção — vaza PII de responsável e aluno (ver `lgpd.md`).

## Performance

- Medir o que o usuário sente (LCP/INP em campo), não o build local. Vercel Analytics já dá isso.
- Rota que só serve dado estático de catálogo: `revalidate` em segundos, não `force-dynamic`.
- Imagem sempre por `next/image` — a otimização da Vercel só entra por esse caminho.
- Antes de suspeitar da infra: confirmar que não é query sem índice (ver `database.md`). Quase
  sempre é o banco, não a rede.

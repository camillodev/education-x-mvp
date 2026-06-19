# Onboarding — setup de autenticação (Clerk)

Notas pra rodar o fluxo de cadastro de escola (`/onboarding`) localmente com auth real.

## Variáveis de ambiente do Clerk (`.env`, não versionado)

Sem estas, o Clerk redireciona para o **Account Portal hospedado**
(`clerk.impactxlab.com`) em vez das telas locais `src/app/(auth)/sign-in` e
`/sign-up`. Adicione ao `.env`:

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

> `NEXT_PUBLIC_*` só recarrega ao reiniciar o `pnpm dev`.

## RBAC — role via custom session claim

O cadastro de escola exige `role=admin`. O role vive no `publicMetadata` do
usuário no Clerk, que **não entra no session token por padrão**. Por isso:

1. **Dashboard (1x):** Configure → Sessions → Customize session token → Claims editor:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   Salvar. (Instância **Production** — a app usa `pk_live_`.)
2. O código lê `sessionClaims.metadata` (ver `src/lib/auth/unit-context.ts`), com
   fallback `currentUser()` para sessões emitidas antes do claim.

Setar role admin num usuário: editar `publicMetadata` no Clerk Dashboard →
`{ "role": "admin" }`. (O fluxo de convite só cria `orientador`.)

## Testar o fluxo localmente

- `DISABLE_CLERK=true` no `.env` **bypassa** o RBAC (dev/Playwright) → NÃO testa o
  403 real. Para testar o RBAC de verdade, use `DISABLE_CLERK=false` + login real.
- `ASAAS_MODE=mock` evita criar subconta de pagamento real.
- ⚠️ `DATABASE_URL` aponta para o Supabase **de produção** — cadastros locais
  escrevem rows reais e disparam e-mail Resend real. Use CNPJ descartável.

Usuários de teste com `role=admin`: `rafael@impactxlab.com`,
`rafaelcamillospam@gmail.com` (= `CLERK_TEST_EMAIL`).

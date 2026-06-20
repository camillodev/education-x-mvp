import path from 'node:path'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup, expect } from '@playwright/test'

// Setup roda serial — necessário porque o storageState é compartilhado.
setup.describe.configure({ mode: 'serial' })

// Email do usuário de teste. Aceita o nome oficial do Clerk (E2E_CLERK_USER_EMAIL)
// com fallback pro nome já presente no .env (CLERK_TEST_EMAIL).
const EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? process.env.CLERK_TEST_EMAIL

const authFile = path.join(__dirname, '../../playwright/.clerk/user.json')

setup('clerk setup', async () => {
  // Obtém um Testing Token a partir de CLERK_SECRET_KEY/PUBLISHABLE_KEY —
  // contorna a proteção anti-bot do Clerk durante os testes.
  await clerkSetup()
})

setup('authenticate and save state', async ({ page }) => {
  if (!EMAIL) {
    throw new Error(
      'Email de teste ausente: defina E2E_CLERK_USER_EMAIL (ou CLERK_TEST_EMAIL).'
    )
  }

  // signIn exige uma página que monte o ClerkProvider. A home (`/`) é pública e
  // NÃO carrega o Clerk; `/sign-in` carrega (layout do grupo (auth)) e é pública.
  await page.goto('/sign-in')
  // Login por ticket server-side (Backend API) — sem senha. É a forma recomendada
  // pelo Clerk: contorna verificação/MFA e não esbarra em checagem de senha vazada.
  await clerk.signIn({ page, emailAddress: EMAIL })

  // Confirma acesso a uma rota protegida real (middleware ativo).
  await page.goto('/escolas')
  await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()

  await page.context().storageState({ path: authFile })
})

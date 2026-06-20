import path from 'node:path'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup, expect } from '@playwright/test'

// Setup roda serial — necessário porque o storageState é compartilhado.
setup.describe.configure({ mode: 'serial' })

// Credenciais do usuário de teste. Aceita os nomes oficiais do Clerk
// (E2E_CLERK_USER_*) com fallback pros nomes já presentes no .env (CLERK_TEST_*).
const IDENTIFIER = process.env.E2E_CLERK_USER_EMAIL ?? process.env.CLERK_TEST_EMAIL
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD ?? process.env.CLERK_TEST_PASSWORD

const authFile = path.join(__dirname, '../../playwright/.clerk/user.json')

setup('clerk setup', async () => {
  // Obtém um Testing Token a partir de CLERK_SECRET_KEY/PUBLISHABLE_KEY —
  // contorna a proteção anti-bot do Clerk durante os testes.
  await clerkSetup()
})

setup('authenticate and save state', async ({ page }) => {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error(
      'Credenciais de teste ausentes: defina E2E_CLERK_USER_EMAIL/E2E_CLERK_USER_PASSWORD (ou CLERK_TEST_EMAIL/CLERK_TEST_PASSWORD).'
    )
  }

  // signIn exige uma página que monte o ClerkProvider. A home (`/`) é pública e
  // NÃO carrega o Clerk; `/sign-in` carrega (layout do grupo (auth)) e é pública.
  await page.goto('/sign-in')
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: IDENTIFIER, password: PASSWORD },
  })

  // Confirma acesso a uma rota protegida real (middleware ativo).
  await page.goto('/escolas')
  await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()

  await page.context().storageState({ path: authFile })
})

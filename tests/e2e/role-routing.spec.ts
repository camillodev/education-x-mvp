import { test, expect, type Page } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

// EDU-81: post-login dispatcher on the `/` root, role guard in (app)/layout.tsx
// (admin-only) and role guard in (school)/layout.tsx (orientador-only), per
// ADR-0009. The shared session (storageState from global.setup.ts) is admin
// (ADMIN_EMAIL) — covers the "ok" branch for (app) and the dispatcher.
//
// The orientador branches need a second real Clerk user, authenticated with
// its own storageState (not the shared one) so it never overwrites
// playwright/.clerk/user.json. Set ORIENTADOR_EMAIL to enable them; they're
// skipped, not failed, when the env var is absent.

const ORIENTADOR_EMAIL = process.env.ORIENTADOR_EMAIL
const hasOrientadorUser = Boolean(ORIENTADOR_EMAIL)

async function signInAsOrientador(page: Page) {
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: ORIENTADOR_EMAIL! })
}

test.describe('admin', () => {
  test('admin autenticado em / é redirecionado para /escolas', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/escolas$/)
    await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()
  })

  test('admin autenticado continua acessando (app)/escolas normalmente', async ({ page }) => {
    await page.goto('/escolas')
    await expect(page).toHaveURL(/\/escolas$/)
    await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()
  })

  test('admin tentando (school)/painel/dashboard manualmente é redirecionado para /escolas', async ({
    page,
  }) => {
    await page.goto('/painel/dashboard')
    await expect(page).toHaveURL(/\/escolas$/)
    await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()
  })
})

test.describe('orientador', () => {
  test.skip(!hasOrientadorUser, 'requer ORIENTADOR_EMAIL configurado')

  // Does not use the shared (admin) storageState — signs in on its own,
  // without persisting the session, so it never overwrites the shared file.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('orientador autenticado em / é redirecionado para /painel/dashboard', async ({ page }) => {
    await signInAsOrientador(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/painel\/dashboard$/)
  })

  test('orientador tentando (app)/escolas manualmente é redirecionado para /painel/dashboard, não deslogado', async ({
    page,
  }) => {
    await signInAsOrientador(page)
    await page.goto('/escolas')
    await expect(page).toHaveURL(/\/painel\/dashboard$/)

    // "wrong-group" never signs out — the session stays active (ADR-0009).
    await page.goto('/painel/dashboard')
    await expect(page).toHaveURL(/\/painel\/dashboard$/)
    await expect(page.getByRole('link', { name: /sair/i })).toBeVisible()
  })

  test('orientador autenticado continua acessando (school)/painel/dashboard normalmente', async ({
    page,
  }) => {
    await signInAsOrientador(page)
    await page.goto('/painel/dashboard')
    await expect(page).toHaveURL(/\/painel\/dashboard$/)
  })
})

test.describe('visitante anônimo', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('em / vê a landing pública, sem loop de redirect', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /education x/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /gestão de escolas/i })).toHaveAttribute(
      'href',
      '/escolas'
    )
  })

  test('tentando (app)/escolas diretamente é redirecionado para /sign-in', async ({ page }) => {
    await page.goto('/escolas')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('tentando (school)/painel/dashboard diretamente é redirecionado para /sign-in', async ({
    page,
  }) => {
    await page.goto('/painel/dashboard')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

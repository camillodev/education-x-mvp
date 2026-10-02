import { test, expect } from '@playwright/test'
import { seedSchool, cleanupUnits, TEST_PREFIX } from './_seed'

test.beforeAll(async () => {
  await cleanupUnits()
  await seedSchool({ name: 'Kumon Camargos E2E', cnpj: '11222333000190', franchiseParent: 'Kumon', status: 'ACTIVE' })
  await seedSchool({ name: 'Wizard Contagem E2E', cnpj: '99888777000122', franchiseParent: 'Wizard', status: 'SUSPENDED' })
})
test.afterAll(async () => { await cleanupUnits() })

test('lista carrega e mostra as escolas seedadas', async ({ page }) => {
  await page.goto('/escolas')
  await expect(page.getByText(`${TEST_PREFIX} Kumon Camargos E2E`)).toBeVisible()
  await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()
})

test('busca filtra por nome', async ({ page }) => {
  await page.goto('/escolas')
  await page.getByPlaceholder(/buscar por escola/i).fill('Wizard')
  await expect(page.getByText(/Wizard Contagem E2E/)).toBeVisible()
  await expect(page.getByText(/Kumon Camargos E2E/)).toHaveCount(0)
})

test('filtro de status Suspensas mostra só suspensas', async ({ page }) => {
  await page.goto('/escolas')
  await page.getByRole('radio', { name: /suspensas/i }).click()
  await expect(page.getByText(/Wizard Contagem E2E/)).toBeVisible()
  await expect(page.getByText(/Kumon Camargos E2E/)).toHaveCount(0)
})

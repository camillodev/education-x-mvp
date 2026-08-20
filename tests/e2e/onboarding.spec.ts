import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/db'
import { cleanupUnits, TEST_PREFIX } from './_seed'

const HAPPY_CNPJ = '11444777000161'
const SCHOOL_NAME = `${TEST_PREFIX} Onboarding E2E`

test.beforeEach(async ({ page }) => {
  // Autofills (BrasilAPI/ViaCEP) are best-effort — their catches never block
  // the form. Aborting is more deterministic than depending on real external network.
  await page.route('**/brasilapi.com.br/**', (r) => r.abort())
  await page.route('**/viacep.com.br/**', (r) => r.abort())
})

test.beforeAll(async () => {
  await cleanupUnits()
})
test.afterAll(async () => {
  await cleanupUnits()
})

test('happy path: completes all 4 steps and persists Unit + BillingConfig + Subject', async ({ page }) => {
  await page.goto('/onboarding')

  // Step 1 — School data
  await expect(page.getByRole('heading', { name: /dados da escola/i })).toBeVisible()

  await page.locator('#cnpj').fill(HAPPY_CNPJ)
  // CNPJ lookup was aborted (route blocked) — the catch never reveals the
  // remaining fields, so we use the manual escape hatch.
  await page.getByText('Não tenho CNPJ / preencher manualmente').click()

  await page.locator('#name').fill(SCHOOL_NAME)
  await page.locator('#email').fill('escola@onboarding-e2e.com')
  await page.locator('#phone').fill('31999990001')

  await page.locator('#cep').fill('30130010')
  await page.locator('#address').fill('Avenida Teste')
  await page.locator('#number').fill('100')
  await page.locator('#neighborhood').fill('Centro')
  await page.locator('#city').fill('Belo Horizonte')
  await page.locator('#state').fill('MG')

  await page.locator('#responsibleName').fill('Responsável Onboarding E2E')
  await page.locator('#responsibleEmail').fill('responsavel@onboarding-e2e.com')
  await page.locator('#responsiblePhone').fill('31999990002')

  await page.getByRole('button', { name: 'Próximo' }).click()

  // Step 2 — Billing
  await expect(page.getByRole('heading', { name: /financeiro/i })).toBeVisible()
  await page.getByLabel(/Inscrição municipal/).fill('12345')
  await page.getByRole('button', { name: 'Próximo' }).click()

  // Step 3 — Subjects
  await expect(page.getByRole('heading', { name: 'Matérias', exact: true })).toBeVisible()
  await page.getByLabel('Nome da nova matéria').fill('Matemática')
  await page.getByLabel('Código NFS-e da nova matéria').fill('8.01')
  await page.getByRole('button', { name: 'Adicionar matéria' }).click()
  await expect(page.getByLabel('Nome da matéria 1')).toHaveValue('Matemática')
  await page.getByRole('button', { name: 'Próximo' }).click()

  // Step 4 — Review and submit
  await expect(page.getByRole('heading', { name: /revisão e envio/i })).toBeVisible()
  await page.getByRole('button', { name: 'Cadastrar e enviar confirmação' }).click()
  await expect(page.getByText('Escola cadastrada!')).toBeVisible({ timeout: 15000 })

  // Final assert via Prisma — not via UI
  const unit = await prisma.unit.findUnique({
    where: { cnpj: HAPPY_CNPJ },
    include: { billingConfig: true, subjects: true },
  })

  expect(unit).not.toBeNull()
  expect(unit!.name).toBe(SCHOOL_NAME)
  expect(unit!.status).toBe('PENDING')
  expect(unit!.billingConfig).not.toBeNull()
  expect(unit!.billingConfig!.municipalRegistration).toBe('12345')
  expect(unit!.subjects.length).toBeGreaterThanOrEqual(1)
  expect(unit!.subjects[0].name).toBe('Matemática')
})

test('step 1 blocks progress with invalid email and CNPJ', async ({ page }) => {
  await page.goto('/onboarding')

  await page.locator('#cnpj').fill('11111111111111')
  await expect(page.getByText('CNPJ inválido')).toBeVisible()

  await page.getByText('Não tenho CNPJ / preencher manualmente').click()
  await page.locator('#email').fill('nao-e-um-email')
  await expect(page.getByText('E-mail inválido')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Próximo' })).toBeDisabled()
})

test('step 2 blocks progress until municipal registration is filled', async ({ page }) => {
  await page.goto('/onboarding')

  await page.locator('#cnpj').fill(HAPPY_CNPJ)
  await page.getByText('Não tenho CNPJ / preencher manualmente').click()
  await page.locator('#name').fill(`${SCHOOL_NAME} P2`)
  await page.locator('#email').fill('escola-p2@onboarding-e2e.com')
  await page.locator('#phone').fill('31999990001')
  await page.locator('#cep').fill('30130010')
  await page.locator('#address').fill('Avenida Teste')
  await page.locator('#number').fill('100')
  await page.locator('#neighborhood').fill('Centro')
  await page.locator('#city').fill('Belo Horizonte')
  await page.locator('#state').fill('MG')
  await page.locator('#responsibleName').fill('Responsável Onboarding E2E')
  await page.locator('#responsibleEmail').fill('responsavel-p2@onboarding-e2e.com')
  await page.locator('#responsiblePhone').fill('31999990002')
  await page.getByRole('button', { name: 'Próximo' }).click()

  await expect(page.getByRole('heading', { name: /financeiro/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Próximo' })).toBeDisabled()

  await page.getByLabel(/Inscrição municipal/).fill('99999')
  await expect(page.getByRole('button', { name: 'Próximo' })).toBeEnabled()
})

test('step 3 blocks adding a subject without a name', async ({ page }) => {
  await page.goto('/onboarding')

  await page.locator('#cnpj').fill(HAPPY_CNPJ)
  await page.getByText('Não tenho CNPJ / preencher manualmente').click()
  await page.locator('#name').fill(`${SCHOOL_NAME} P3`)
  await page.locator('#email').fill('escola-p3@onboarding-e2e.com')
  await page.locator('#phone').fill('31999990001')
  await page.locator('#cep').fill('30130010')
  await page.locator('#address').fill('Avenida Teste')
  await page.locator('#number').fill('100')
  await page.locator('#neighborhood').fill('Centro')
  await page.locator('#city').fill('Belo Horizonte')
  await page.locator('#state').fill('MG')
  await page.locator('#responsibleName').fill('Responsável Onboarding E2E')
  await page.locator('#responsibleEmail').fill('responsavel-p3@onboarding-e2e.com')
  await page.locator('#responsiblePhone').fill('31999990002')
  await page.getByRole('button', { name: 'Próximo' }).click()

  await page.getByLabel(/Inscrição municipal/).fill('12345')
  await page.getByRole('button', { name: 'Próximo' }).click()

  await expect(page.getByRole('heading', { name: 'Matérias', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar matéria' }).click()
  await expect(page.getByText('Nome da matéria obrigatório')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Próximo' })).toBeDisabled()
})

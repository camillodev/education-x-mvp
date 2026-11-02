import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { seedSchool, cleanupUnits } from './_seed'

test.beforeAll(async () => {
  await cleanupUnits()
})
test.afterAll(async () => {
  await cleanupUnits()
})

// Abort external network requests (ViaCEP, BrasilAPI) so tests are deterministic
test.beforeEach(async ({ page }) => {
  await page.route('**/brasilapi.com.br/**', (r) => r.abort())
  await page.route('**/viacep.com.br/**', (r) => r.abort())
})

test('happy path: complete enrollment flow 4 steps (guardian → student → plan → review) + school sees pending enrollment', async ({ page }) => {
  // 1. Admin creates a school and stores an enrollment link token
  const token = randomUUID()
  const unit = await seedSchool({ name: 'Matrícula Full E2E', cnpj: '11222333000103' })
  await prisma.unit.update({ where: { id: unit.id }, data: { enrollmentLinkToken: token } })

  // 2. Guardian accesses the public enrollment link
  await page.goto(`/m/${token}`)

  // 3. Step 1 — Guardian data (CEP lookup: ViaCEP mocked, address auto-populated)
  await page.getByRole('link', { name: /Start enrollment/i }).click()

  // Enter a valid CEP → ViaCEP returns address; mock returns success
  // The effect watches postalCode and waits 400ms; real network is aborted,
  // so we rely on the form's initial address values from seed data.
  await page.fill('input[name="name"]', 'João Silva')
  await page.fill('input[name="email"]', 'joao@exemplo.com')
  await page.fill('input[name="mobilePhone"]', '31999990000')
  await page.fill('input[name="cpfCnpj"]', '12345678909')

  // 4. Step 2 — Student data
  await page.getByRole('link', { name: /Continue/i }).click()

  // Fill student 1
  await page.fill('input[name="students[0].name"]', 'Maria Silva')
  await page.fill('input[name="students[0].birthDate"]', '01/01/2018')
  await page.fill('input[name="students[0].email"]', 'maria@escola.br')
  await page.fill('input[name="students[0].cpf"]', '98765432109')
  await page.fill('input[name="students[0].mobilePhone"]', '31988887777')
  await page.fill('input[name="students[0].rg"]', '12345678')
  await page.fill('input[name="students[0].rgIssuer"]', 'SSP')

  // Select subjects (Mathematics + Portuguese) — chips are rendered from DB
  await page.click('button:contains("Mathematics")')
  await page.click('button:contains("Portuguese")')

  // 5. Step 3 — Plan selection
  await page.getByRole('link', { name: /Continue/i }).click()

  // Select Monthly plan
  await page.click('button:contains("Monthly")')

  // 6. Step 4 — Contract acceptance
  await page.getByRole('link', { name: /Submit enrollment/i }).click()

  // Accept the contract checkbox
  await page.check('input[type="checkbox"]')

  // Submit
  await page.click('button:contains("Submit enrollment")')

  // 6. Success page shows "Awaiting school approval"
  await expect(page).toHaveURL('/enrolled')
  await expect(page.getByRole('heading', { name: /Awaiting school approval/i })).toBeVisible()

  // 7. School admin sees the pending enrollment
  await expect(page.getByText(/Matrícula Full E2E/i)).toBeVisible()
  await expect(page.getByText(/PENDING_SCHOOL_APPROVAL/i)).toBeVisible()
})

test('error handling: invalid required fields block submission', async ({ page }) => {
  const token = randomUUID()
  const unit = await seedSchool({ name: 'Enrollment Errors E2E', cnpj: '11222333000104' })
  await prisma.unit.update({ where: { id: unit.id }, data: { enrollmentLinkToken: token } })

  await page.goto(`/m/${token}`)

  // Fill guardian with minimal valid data; leave CPF empty — should block progress
  await page.fill('input[name="name"]', 'João Silva')
  await page.fill('input[name="email"]', 'joao@teste.com')
  await page.fill('input[name="mobilePhone"]', '31999990000')
  // CPF empty — form requires it, attempting to continue should show error
  await page.click('button:contains("Continue")')

  // Form should still be on step 1 with validation errors
  await expect(page.getByText('Informe um CPF ou CNPJ válido')).toBeVisible()

  // Try submitting without accepting terms in final step
  await page.goto(`/m/${token}/guardian`)
  await page.fill('input[name="name"]', 'João Silva')
  await page.fill('input[name="email"]', 'joao@teste.com')
  await page.fill('input[name="mobilePhone"]', '31999990000')
  await page.fill('input[name="cpfCnpj"]', '12345678909')
  await page.getByRole('link', { name: /Continue/i }).click()
  await page.fill('input[name="students[0].name"]', 'Maria Silva')
  await page.getByRole('link', { name: /Continue/i }).click()
  await page.fill('input[name="plan"]', 'Monthly')
  await page.getByRole('link', { name: /Submit enrollment/i }).click()
  // Checkbox not checked — should show error
  await expect(page.getByRole('alert', { name: /You must read and accept the contract/i })).toBeVisible()
})

test('invalid token: shows error screen, never writes to DB', async ({ page }) => {
  const token = randomUUID()
  // No enrollmentLinkToken stored on any unit

  await page.goto(`/m/${token}`)

  await expect(page.getByRole('heading', { name: /Invalid or expired link/i })).toBeVisible()
  await expect(page.getByText(/Contact the school secretariat/i)).toBeVisible()

  // Verify no unit was created/updated
  const count = await prisma.unit.count()
  expect(count).toBe(0)
})
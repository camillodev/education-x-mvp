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

test('link válido: mostra boas-vindas com nome da escola', async ({ page }) => {
  const token = randomUUID()
  const unit = await seedSchool({ name: 'Matrícula B1 E2E', cnpj: '11222333000101' })
  await prisma.unit.update({ where: { id: unit.id }, data: { enrollmentLinkToken: token } })

  await page.goto(`/m/${token}`)

  await expect(page.getByRole('heading', { name: /Matrícula B1 E2E/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Começar matrícula/i })).toBeVisible()
})

test('link inválido: mostra tela de erro, sem retry, e nunca escreve no banco', async ({ page }) => {
  const before = await prisma.unit.count()

  await page.goto('/m/token-que-nao-existe-nunca')

  await expect(page.getByRole('heading', { name: /Link inválido ou expirado/i })).toBeVisible()
  await expect(page.getByText(/Fale com a secretaria da escola/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /tentar novamente/i })).toHaveCount(0)

  const after = await prisma.unit.count()
  expect(after).toBe(before)
})

test('prefilledStudentName aparece quando presente na query, e não aparece quando ausente', async ({ page }) => {
  const token = randomUUID()
  const unit = await seedSchool({ name: 'Matrícula B1 Prefill', cnpj: '11222333000102' })
  await prisma.unit.update({ where: { id: unit.id }, data: { enrollmentLinkToken: token } })

  await page.goto(`/m/${token}?prefilledStudentName=Maria`)
  await expect(page.getByText('Maria', { exact: false })).toBeVisible()

  await page.goto(`/m/${token}`)
  await expect(page.getByText(/Matrícula de/i)).toHaveCount(0)
})

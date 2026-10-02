import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoicesTable } from '@/components/billing/InvoicesTable'
import type { InvoiceListItemDTO } from '@/hooks/use-invoices'

// dueDate como string ISO (não Date) — é o shape real que chega ao client depois de
// res.json() (JSON não serializa Date). Usar Date aqui mascararia bug de quem assumir Date
// diretamente no componente (achado de code review, EDU-27).
function makeItem(overrides: Partial<InvoiceListItemDTO>): InvoiceListItemDTO {
  return {
    id: 'inv_1',
    enrollmentId: 'enr_1',
    status: 'PENDING',
    referenceMonth: '2026-09',
    amountCents: 35000,
    dueDate: '2026-09-10T00:00:00.000Z',
    guardianName: 'Maria da Silva',
    studentName: 'João',
    subjectName: 'Matemática',
    ...overrides,
  }
}

it('renderiza uma linha por item com os dados corretos', () => {
  render(<InvoicesTable items={[makeItem({})]} onReemitir={vi.fn()} />)
  expect(screen.getByText('Maria da Silva')).toBeInTheDocument()
  expect(screen.getByText('João')).toBeInTheDocument()
  expect(screen.getByText('Matemática')).toBeInTheDocument()
  expect(screen.getByText('R$ 350,00')).toBeInTheDocument()
})

it('linha com status BLOCKED mostra badge "Aguardando cadastro" cor warning', () => {
  render(<InvoicesTable items={[makeItem({ status: 'BLOCKED' })]} onReemitir={vi.fn()} />)
  const badge = screen.getByText('Aguardando cadastro')
  expect(badge).toBeInTheDocument()
  expect(badge.className).toMatch(/warning/)
})

it('linha com status ERROR mostra botão "Reemitir" habilitado', () => {
  render(<InvoicesTable items={[makeItem({ status: 'ERROR' })]} onReemitir={vi.fn()} />)
  expect(screen.getByRole('button', { name: /reemitir/i })).toBeEnabled()
})

it('linha com status PAID não mostra botão "Reemitir"', () => {
  render(<InvoicesTable items={[makeItem({ status: 'PAID' })]} onReemitir={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /reemitir/i })).not.toBeInTheDocument()
})

it('clicar "Reemitir" chama onReemitir com o invoiceId', async () => {
  const onReemitir = vi.fn()
  const user = userEvent.setup()
  render(<InvoicesTable items={[makeItem({ id: 'inv_err', status: 'ERROR' })]} onReemitir={onReemitir} />)

  await user.click(screen.getByRole('button', { name: /reemitir/i }))

  expect(onReemitir).toHaveBeenCalledWith('inv_err')
})

it('mostra "Processando…" e desabilita o botão ENQUANTO onReemitir está pendente (não só no tick síncrono)', async () => {
  // Achado de code review (EDU-27): handleReemitir não aguardava onReemitir antes, então
  // busyId era limpo no mesmo tick síncrono — "Processando…" nunca ficava visível de fato
  // durante a chamada de rede real, e o botão reabilitava a tempo de permitir duplo clique.
  let resolveReemitir: () => void = () => {}
  const onReemitir = vi.fn(() => new Promise<void>((resolve) => { resolveReemitir = resolve }))
  const user = userEvent.setup()
  render(<InvoicesTable items={[makeItem({ id: 'inv_err', status: 'ERROR' })]} onReemitir={onReemitir} />)

  await user.click(screen.getByRole('button', { name: /reemitir/i }))

  // Enquanto a Promise não resolve, o botão precisa estar em "Processando…" e desabilitado.
  expect(screen.getByRole('button', { name: /processando/i })).toBeDisabled()

  resolveReemitir()
  await screen.findByRole('button', { name: /^reemitir$/i })
  expect(screen.getByRole('button', { name: /^reemitir$/i })).toBeEnabled()
})

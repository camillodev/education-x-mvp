import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceDetailView } from '@/components/invoices/InvoiceDetailView'
import { ToastProvider } from '@/components/ui/toast'
import type { InvoiceDetail } from '@/lib/services/invoice-detail.service'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

function makeInvoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 'inv_1',
    status: 'PENDING',
    amountCents: 45000,
    netAmountCents: 45000,
    referenceMonth: '2026-09',
    dueDate: new Date('2026-09-10T00:00:00Z'),
    emittedAt: new Date('2026-09-01T00:00:00Z'),
    paidAt: null,
    paidAmountCents: null,
    asaasPaymentId: 'pay_abc',
    asaasPaymentUrl: 'https://sandbox.asaas.com/i/pay_abc',
    asaasBankSlipUrl: 'https://sandbox.asaas.com/b/pay_abc',
    asaasBarCode: '00000000000000000000000000000000000000000',
    student: { name: 'João' },
    subject: { name: 'Matemática' },
    guardian: { asaasCustomerId: 'cus_1' },
    enrollment: { discountType: null, discountValueBp: null, discountValueCents: null },
    billingConfig: { lateFeePercent: 200, monthlyInterestBp: 100 },
    payments: [],
    ...overrides,
  }
}

function renderInvoice(invoice: InvoiceDetail) {
  return render(
    <ToastProvider>
      <InvoiceDetailView invoice={invoice} />
    </ToastProvider>
  )
}

beforeEach(() => {
  refresh.mockClear()
  global.fetch = vi.fn()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
})

it('status PENDING mostra Cancelar cobrança e não mostra multa/juros nem banner de erro/bloqueio', () => {
  renderInvoice(makeInvoice({ status: 'PENDING' }))

  expect(screen.getByRole('button', { name: /cancelar cobrança/i })).toBeInTheDocument()
  expect(screen.queryByText(/multa e juros/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/falha ao emitir/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/aguardando cadastro/i)).not.toBeInTheDocument()
})

it('status OVERDUE mostra bloco de multa/juros com estimativa e não mostra Cancelar cobrança', () => {
  renderInvoice(makeInvoice({ status: 'OVERDUE', dueDate: new Date('2026-08-20T00:00:00Z') }))

  expect(screen.getByText(/multa e juros por atraso \(estimativa\)/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cancelar cobrança/i })).not.toBeInTheDocument()
})

it('status ERROR mostra banner de falha e Reemitir dispara POST /api/invoices/{id}/retry', async () => {
  const user = userEvent.setup()
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({}),
  })

  renderInvoice(makeInvoice({ status: 'ERROR' }))

  expect(screen.getByText(/falha ao emitir esta cobrança na asaas/i)).toBeInTheDocument()
  const retryButton = screen.getByRole('button', { name: /reemitir/i })
  expect(retryButton).toBeInTheDocument()

  await user.click(retryButton)

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices/inv_1/retry', { method: 'POST' })
  })
})

it('status BLOCKED mostra banner de aguardando cadastro e não mostra seção de boleto/PIX', () => {
  renderInvoice(makeInvoice({ status: 'BLOCKED' }))

  expect(screen.getByText(/aguardando cadastro do responsável na asaas/i)).toBeInTheDocument()
  expect(screen.queryByText(/boleto e pix/i)).not.toBeInTheDocument()
})

it('status PAID mostra Pago em e não mostra Cancelar cobrança nem Reemitir', () => {
  renderInvoice(
    makeInvoice({ status: 'PAID', paidAt: new Date('2026-09-05T00:00:00Z'), paidAmountCents: 45000 })
  )

  expect(screen.getByText(/pago em/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cancelar cobrança/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /reemitir/i })).not.toBeInTheDocument()
})

it('status PAID não mostra seção de boleto/PIX (evita pagamento duplicado — achado de review)', () => {
  renderInvoice(
    makeInvoice({ status: 'PAID', paidAt: new Date('2026-09-05T00:00:00Z'), paidAmountCents: 45000 })
  )

  expect(screen.queryByText(/boleto e pix/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ver qr code pix/i })).not.toBeInTheDocument()
})

it('status CANCELLED não mostra seção de boleto/PIX nem ações (evita pagamento de cobrança cancelada — achado de review)', () => {
  renderInvoice(makeInvoice({ status: 'CANCELLED' }))

  expect(screen.queryByText(/boleto e pix/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ver qr code pix/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cancelar cobrança/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /reemitir/i })).not.toBeInTheDocument()
})

it('cancelamento: confirma no diálogo, dispara DELETE e chama router.refresh()', async () => {
  const user = userEvent.setup()
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({}),
  })

  renderInvoice(makeInvoice({ status: 'PENDING' }))

  await user.click(screen.getByRole('button', { name: /cancelar cobrança/i }))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/cancelar esta cobrança\?/i)).toBeInTheDocument()

  await user.click(within(dialog).getByRole('button', { name: /confirmar cancelamento/i }))

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices/inv_1', { method: 'DELETE' })
  })
  await waitFor(() => {
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

it('copiar linha digitável chama clipboard.writeText com o asaasBarCode', async () => {
  const barCode = '00000000000000000000000000000000000000000'
  renderInvoice(makeInvoice({ status: 'PENDING', asaasBarCode: barCode }))

  // userEvent.setup() instala seu próprio stub de clipboard (getter-only), sobrescrevendo o
  // mock do beforeEach — por isso este teste dispara o clique via fireEvent, preservando o
  // mock configurado, em vez de userEvent.click().
  fireEvent.click(screen.getByRole('button', { name: /copiar linha digitável/i }))

  await waitFor(() => {
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(barCode)
  })
})

it('PIX é lazy: QR só é buscado após clicar em "Ver QR Code PIX"', async () => {
  const user = userEvent.setup()
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({
      pix: { encodedImage: 'base64img', payload: '000pixpayload', expirationDate: '2026-09-10' },
    }),
  })

  renderInvoice(makeInvoice({ status: 'PENDING' }))

  const pixButton = screen.getByRole('button', { name: /ver qr code pix/i })
  expect(global.fetch).not.toHaveBeenCalled()
  expect(screen.queryByAltText(/qr code pix/i)).not.toBeInTheDocument()

  await user.click(pixButton)

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices/inv_1/pix')
  })
  expect(await screen.findByAltText(/qr code pix/i)).toBeInTheDocument()
})

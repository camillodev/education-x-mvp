import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { processPaymentEvent } from '@/lib/services/webhook.service'
import type { AsaasWebhookPayload } from '@/lib/integration/asaas/types'

vi.mock('@/lib/db', () => {
  const invoiceFindFirst = vi.fn()
  const invoiceUpdate = vi.fn()
  const paymentCreate = vi.fn()
  // Simula prisma.$transaction([...]) no modo array: executa cada operação passada (já são
  // Promises retornadas pelos mocks de create/update acima) e propaga a primeira rejeição —
  // suficiente para os testes daqui, que não precisam de rollback real, só do encadeamento
  // create → update e da propagação de erro (P2002) no lugar certo.
  const transaction = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops))
  return {
    prisma: {
      invoice: {
        findFirst: invoiceFindFirst,
        update: invoiceUpdate,
      },
      payment: {
        create: paymentCreate,
      },
      $transaction: transaction,
    },
  }
})

type MockDb = {
  invoice: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  payment: {
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const db = prisma as unknown as MockDb

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

const INVOICE_PENDING = {
  id: 'inv-1',
  unitId: 'unit-1',
  enrollmentId: 'enr-1',
  amountCents: 14990,
  netAmountCents: 14990,
  referenceMonth: '2026-09',
  dueDate: new Date('2026-09-10T00:00:00Z'),
  status: 'PENDING',
  asaasPaymentId: 'pay_abc',
  idempotencyKey: 'enr-1:2026-09',
}

function buildPayload(overrides: Partial<AsaasWebhookPayload> = {}): AsaasWebhookPayload {
  return {
    id: 'evt_1',
    event: 'PAYMENT_RECEIVED',
    dateCreated: '2026-09-05 10:00:00',
    payment: {
      id: 'pay_abc',
      status: 'RECEIVED',
      value: 149.9,
      paymentDate: '2026-09-05',
      clientPaymentDate: '2026-09-05',
      externalReference: 'enr-1:2026-09',
      billingType: 'BOLETO',
    },
    ...overrides,
  }
}

describe('processPaymentEvent', () => {
  beforeEach(() => {
    // vi.clearAllMocks() só limpa histórico de chamadas, NÃO implementações — um teste que
    // faz db.$transaction.mockRejectedValue(...) deixaria esse comportamento vazar pros
    // testes seguintes (achado de code review, EDU-26: 2 testes passavam pelo caminho de erro
    // sem perceber, porque a rejeição de um teste anterior sobrevivia). Restaurar explicitamente
    // o comportamento padrão de $transaction (modo array, sucesso) a cada teste evita que
    // qualquer override feito num teste vaze pro próximo.
    vi.clearAllMocks()
    db.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
  })

  it('PAYMENT_RECEIVED em Invoice PENDING: cria Payment e promove Invoice para PAID', async () => {
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.payment.create.mockResolvedValue({ id: 'pay-record-1' })
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'PAID' })

    const result = await processPaymentEvent(buildPayload())

    expect(result).toEqual({ handled: true })
    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          webhookEventId: 'evt_1',
          invoiceId: 'inv-1',
          unitId: 'unit-1',
          asaasPaymentId: 'pay_abc',
          amountCents: 14990,
        }),
      })
    )
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          status: 'PAID',
          paidAmountCents: 14990,
          asaasPaymentId: 'pay_abc',
        }),
      })
    )
  })

  it('paidAt de payment.paymentDate (date-only "YYYY-MM-DD") é UTC midnight — nunca cai no dia anterior por timezone do processo', async () => {
    // Achado de code review (EDU-26): billing.service.ts já estabelece a convenção UTC do repo
    // (comentário em daysInMonth/nextDueDate). new Date('2026-09-05') é meia-noite UTC por spec
    // ES — o dia correto sempre, independente do TZ do processo que roda o teste/produção.
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.payment.create.mockResolvedValue({ id: 'pay-record-tz' })
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'PAID' })

    await processPaymentEvent(buildPayload({ payment: { ...buildPayload().payment, paymentDate: '2026-09-05' } }))

    const call = db.payment.create.mock.calls[0][0]
    const paidAt = call.data.paidAt as Date
    expect(paidAt.getUTCFullYear()).toBe(2026)
    expect(paidAt.getUTCMonth()).toBe(8) // setembro, 0-indexed
    expect(paidAt.getUTCDate()).toBe(5)
  })

  it('conversão de valor: Math.round trata o erro de ponto flutuante do JS (0.29 * 100 = 28.999999999999996), não trunca', async () => {
    // 0.29 * 100 em ponto flutuante JS não dá 29 exato — dá 28.999999999999996. Math.round
    // corrige pra 29; um truncamento (Math.floor / | 0) daria 28, subcobrando o pagamento em
    // 1 centavo. Esse valor discrimina de fato as duas estratégias — 149.90 (usado no teste
    // anterior) não discrimina, porque round e floor coincidem nesse caso.
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.payment.create.mockResolvedValue({ id: 'pay-record-1' })
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'PAID' })

    await processPaymentEvent(buildPayload({ payment: { ...buildPayload().payment, value: 0.29 } }))

    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 29 }),
      })
    )
  })

  it('PAYMENT_RECEIVED em Invoice ERROR: guard assimétrico promove para PAID mesmo assim', async () => {
    const invoiceError = { ...INVOICE_PENDING, id: 'inv-err', status: 'ERROR' }
    db.invoice.findFirst.mockResolvedValue(invoiceError)
    db.payment.create.mockResolvedValue({ id: 'pay-record-2' })
    db.invoice.update.mockResolvedValue({ ...invoiceError, status: 'PAID' })

    const result = await processPaymentEvent(buildPayload())

    expect(result).toEqual({ handled: true })
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-err' }, data: expect.objectContaining({ status: 'PAID' }) })
    )
  })

  it('PAYMENT_RECEIVED em Invoice OVERDUE: guard assimétrico promove para PAID mesmo assim', async () => {
    const invoiceOverdue = { ...INVOICE_PENDING, id: 'inv-overdue', status: 'OVERDUE' }
    db.invoice.findFirst.mockResolvedValue(invoiceOverdue)
    db.payment.create.mockResolvedValue({ id: 'pay-record-3' })
    db.invoice.update.mockResolvedValue({ ...invoiceOverdue, status: 'PAID' })

    const result = await processPaymentEvent(buildPayload())

    expect(result).toEqual({ handled: true })
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-overdue' }, data: expect.objectContaining({ status: 'PAID' }) })
    )
  })

  it('PAYMENT_RECEIVED com webhookEventId duplicado (P2002 na transação): não lança, retorna handled:true, e REAPLICA a promoção pra PAID fora da transação (idempotente)', async () => {
    // Correção de security review (F1, EDU-26): o Prisma $transaction (modo array) faz
    // rollback de TUDO se qualquer operação falhar — então quando payment.create colide em
    // webhookEventId (P2002), o invoice.update daquela MESMA tentativa também não commitou no
    // banco. Reaplicar o update no branch de catch, fora da transação, é o que de fato garante
    // que a Invoice fica promovida — sem isso, a Invoice ficaria presa em PENDING/ERROR/OVERDUE
    // pra sempre, porque a próxima reentrega bateria em P2002 de novo e retornaria cedo.
    //
    // NOTA DE FIDELIDADE DO MOCK: vi.fn() não modela transação real — os elementos do array
    // passado a $transaction() já são invocados (e contam como "chamado") antes de $transaction
    // em si rodar, porque são só Promises síncronas de mock, não PrismaPromise lazy. Por isso a
    // asserção certa aqui é CONTAGEM (2 chamadas: a "eager" da construção do array + a do catch),
    // não apenas toHaveBeenCalledWith — um teste que só checar "foi chamado com X" passaria
    // mesmo removendo o reapply do catch, porque a chamada eager já teria os mesmos argumentos.
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.$transaction.mockRejectedValue(p2002())
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'PAID' })

    const result = await processPaymentEvent(buildPayload())

    expect(result).toEqual({ handled: true })
    expect(db.invoice.update).toHaveBeenCalledTimes(2)
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'PAID', paidAmountCents: 14990 }),
      })
    )
  })

  it('PAYMENT_OVERDUE em Invoice PENDING: atualiza status para OVERDUE, sem criar Payment', async () => {
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'OVERDUE' })

    const result = await processPaymentEvent(
      buildPayload({ event: 'PAYMENT_OVERDUE', payment: { ...buildPayload().payment, status: 'OVERDUE' } })
    )

    expect(result).toEqual({ handled: true })
    expect(db.payment.create).not.toHaveBeenCalled()
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-1' }, data: expect.objectContaining({ status: 'OVERDUE' }) })
    )
  })

  it('PAYMENT_OVERDUE em Invoice já PAID: NÃO rebaixa o status — protege contra reentrega fora de ordem', async () => {
    const invoicePaid = { ...INVOICE_PENDING, status: 'PAID', paidAt: new Date('2026-09-05'), paidAmountCents: 14990 }
    db.invoice.findFirst.mockResolvedValue(invoicePaid)

    const result = await processPaymentEvent(
      buildPayload({ event: 'PAYMENT_OVERDUE', payment: { ...buildPayload().payment, status: 'OVERDUE' } })
    )

    expect(result).toEqual({ handled: true })
    expect(db.invoice.update).not.toHaveBeenCalled()
    expect(db.payment.create).not.toHaveBeenCalled()
  })

  it('event desconhecido (ex: PAYMENT_DELETED): retorna handled:false, nenhuma escrita no banco', async () => {
    const result = await processPaymentEvent(buildPayload({ event: 'PAYMENT_DELETED' }))

    expect(result).toEqual({ handled: false })
    expect(db.invoice.findFirst).not.toHaveBeenCalled()
    expect(db.invoice.update).not.toHaveBeenCalled()
    expect(db.payment.create).not.toHaveBeenCalled()
  })

  it('Invoice não encontrada (nem por asaasPaymentId nem por externalReference): retorna handled:false, sem lançar', async () => {
    db.invoice.findFirst.mockResolvedValue(null)

    const result = await processPaymentEvent(buildPayload())

    expect(result).toEqual({ handled: false })
    expect(db.invoice.update).not.toHaveBeenCalled()
    expect(db.payment.create).not.toHaveBeenCalled()
  })

  it('resolução por externalReference: Invoice ainda sem asaasPaymentId preenchido (nunca emitida com esse campo), mas externalReference bate com idempotencyKey — usa essa Invoice E grava o vínculo asaasPaymentId', async () => {
    // asaasPaymentId ausente é o cenário real em que o fallback por externalReference se aplica
    // de fato — se a Invoice já tivesse asaasPaymentId preenchido e divergente do payload, o
    // guard de consistência (F2 do security review) rejeitaria por design.
    const invoiceSemAsaasPaymentId = { ...INVOICE_PENDING, asaasPaymentId: null }
    db.invoice.findFirst.mockResolvedValue(invoiceSemAsaasPaymentId)
    db.payment.create.mockResolvedValue({ id: 'pay-record-4' })
    db.invoice.update.mockResolvedValue({ ...invoiceSemAsaasPaymentId, status: 'PAID' })

    const result = await processPaymentEvent(
      buildPayload({ payment: { ...buildPayload().payment, id: 'pay_novo', externalReference: 'enr-1:2026-09' } })
    )

    expect(result).toEqual({ handled: true })
    expect(db.invoice.findFirst).toHaveBeenCalled()
    // Discrimina o caminho feliz do caminho de erro (P2002/catch): $transaction chamada
    // exatamente 1x e invoice.update exatamente 1x prova que passou pela transação normal, não
    // pelo reapply do catch (que teria $transaction rejeitando + invoice.update chamado de
    // novo fora dela). Protege contra vazamento de mockRejectedValue de um teste anterior
    // (achado de code review, EDU-26 — NOVO-1: sem isso, este teste passaria mesmo tomando o
    // caminho de erro por engano, porque os dados gravados no reapply do catch são idênticos).
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.invoice.update).toHaveBeenCalledTimes(1)
    // Achado de code review (item 2): sem gravar asaasPaymentId aqui, a Invoice fica PAID mas
    // sem vínculo Asaas, e o guard de consistência (F2) fica permanentemente desarmado pra ela.
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asaasPaymentId: 'pay_novo' }),
      })
    )
  })

  it('guard de consistência: Invoice encontrada por externalReference já tem asaasPaymentId preenchido e DIVERGENTE do payment.id do evento — rejeita em vez de reconciliar a Invoice errada', async () => {
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING) // asaasPaymentId: 'pay_abc'

    const result = await processPaymentEvent(
      buildPayload({ payment: { ...buildPayload().payment, id: 'pay_outro', externalReference: 'enr-1:2026-09' } })
    )

    expect(result).toEqual({ handled: false })
    expect(db.payment.create).not.toHaveBeenCalled()
    expect(db.invoice.update).not.toHaveBeenCalled()
  })

  it('externalReference ausente: NÃO entra no OR como idempotencyKey:undefined (regressão — Prisma ignora undefined em where, o que colapsaria o OR e vazaria qualquer Invoice de qualquer Unit)', async () => {
    db.invoice.findFirst.mockResolvedValue(INVOICE_PENDING)
    db.payment.create.mockResolvedValue({ id: 'pay-record-5' })
    db.invoice.update.mockResolvedValue({ ...INVOICE_PENDING, status: 'PAID' })

    const payloadSemExternalReference = buildPayload()
    delete payloadSemExternalReference.payment.externalReference

    await processPaymentEvent(payloadSemExternalReference)

    const call = db.invoice.findFirst.mock.calls[0][0]
    const orClauses = call.where.OR as Array<Record<string, unknown>>
    for (const clause of orClauses) {
      if ('idempotencyKey' in clause) {
        expect(clause.idempotencyKey).not.toBeUndefined()
      }
    }
    // Com externalReference ausente, o OR só pode conter a cláusula de asaasPaymentId.
    expect(orClauses).toEqual([{ asaasPaymentId: 'pay_abc' }])
  })
})

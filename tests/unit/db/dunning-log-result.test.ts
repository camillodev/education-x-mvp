import { describe, it, expect } from 'vitest'
import { Prisma, DunningLogResult } from '@prisma/client'

// Contrato de tipo do ADR-0008 Emenda 3: DunningLog.result é o enum DunningLogResult
// (SUCCESS | ERROR), não mais String livre. Este teste prova a garantia que a emenda promete —
// não é suficiente confirmar que "nada quebrou" (o campo não tem escritor ainda, EDU-73), tem
// que confirmar que o tipo em si impede o vocabulário divergente que causou o problema original
// (D1: "sent"/"failed" nunca casavam com o guard de idempotência comparando "success").
describe('DunningLog.result — contrato de tipo (ADR-0008 Emenda 3)', () => {
  it('DunningLogResult expõe exatamente SUCCESS e ERROR, nenhum outro valor', () => {
    // DunningLogResult é o objeto de runtime gerado a partir do enum do schema — se alguém
    // adicionar/renomear um valor no schema.prisma sem querer, este teste quebra.
    expect(Object.values(DunningLogResult).sort()).toEqual(['ERROR', 'SUCCESS'])
  })

  it('cria um DunningLogUncheckedCreateInput válido com result: SUCCESS, sem errorDetail', () => {
    // Prova em tempo de compilação (não runtime) que o shape aceito pelo Prisma Client bate com
    // o que o ADR promete: result é obrigatório e tipado como enum; errorDetail é opcional.
    const input: Prisma.DunningLogUncheckedCreateInput = {
      unitId: 'unit-1',
      invoiceId: 'inv-1',
      action: 'NEGATIVATION',
      result: 'SUCCESS',
    }
    expect(input.result).toBe('SUCCESS')
    expect(input.errorDetail).toBeUndefined()
  })

  it('cria um DunningLogUncheckedCreateInput válido com result: ERROR + errorDetail preenchido', () => {
    const input: Prisma.DunningLogUncheckedCreateInput = {
      unitId: 'unit-1',
      invoiceId: 'inv-1',
      action: 'NEGATIVATION',
      result: 'ERROR',
      errorDetail: 'timeout ao chamar POST /paymentDunnings',
    }
    expect(input.result).toBe('ERROR')
    expect(input.errorDetail).toBe('timeout ao chamar POST /paymentDunnings')
  })

  it('rejeita em tempo de compilação um valor fora do vocabulário canônico (regressão do D1)', () => {
    // "sent" não é um valor de DunningLogResult; antes da Emenda 3 isso compilava normalmente
    // (result era String livre) e o guard de idempotência (R2/R8) nunca casava contra ele,
    // silenciosamente. Se a linha abaixo parar de dar erro de TS, a Emenda 3 regrediu — o CI
    // (tsc --noEmit) falha aqui, não só este teste em runtime.
    const input: Prisma.DunningLogUncheckedCreateInput = {
      unitId: 'unit-1',
      invoiceId: 'inv-1',
      action: 'NEGATIVATION',
      // @ts-expect-error — string fora do enum DunningLogResult, ver comentário acima
      result: 'sent',
    }
    expect(input).toBeDefined()
  })
})

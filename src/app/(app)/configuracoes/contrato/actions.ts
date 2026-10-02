'use server'

import { revalidatePath } from 'next/cache'
import { getUnitContext, ForbiddenError } from '@/lib/auth/unit-context'
import { saveUnitContract, EmptyContractBodyError } from '@/lib/services/contract.service'

export interface SaveContractState {
  error?: string
  success?: boolean
}

export async function saveContractAction(
  _prev: SaveContractState,
  formData: FormData
): Promise<SaveContractState> {
  const ctx = await getUnitContext()
  if (ctx.role !== 'orientador') {
    throw new ForbiddenError('Apenas a escola pode editar seu próprio contrato')
  }

  const body = String(formData.get('body') ?? '')

  try {
    await saveUnitContract(ctx.unitId, body)
  } catch (err) {
    if (err instanceof EmptyContractBodyError) {
      return { error: err.message }
    }
    throw err
  }

  revalidatePath('/configuracoes/contrato')
  return { success: true }
}

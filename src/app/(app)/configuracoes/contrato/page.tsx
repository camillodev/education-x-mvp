import { getUnitContext, ForbiddenError } from '@/lib/auth/unit-context'
import { getUnitContract } from '@/lib/services/contract.service'
import { ContractForm } from './ContractForm'

export const dynamic = 'force-dynamic'

export default async function ContratoConfigPage() {
  const ctx = await getUnitContext()
  if (ctx.role !== 'orientador') {
    throw new ForbiddenError('Apenas a escola pode acessar as configurações do próprio contrato')
  }

  const contract = await getUnitContract(ctx.unitId)

  return (
    <div className="mx-auto max-w-3xl">
      <ContractForm initialBody={contract.body} isCustom={contract.isCustom} />
    </div>
  )
}

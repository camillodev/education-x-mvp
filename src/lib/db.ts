import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Modelos com isolamento de tenant via unitId
const TENANT_MODELS = ['subject', 'guardian', 'billingconfig', 'termsacceptance']

export function forUnit(unitId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.includes(model.toLowerCase())) {
            return query(args)
          }

          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow'
          ) {
            // Reescreve findUnique → findFirst com unitId para evitar vazamento cross-tenant
            const typedArgs = args as { where?: Record<string, unknown>; [key: string]: unknown }
            return (prisma as unknown as Record<string, { findFirst: (a: unknown) => Promise<unknown> }>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ].findFirst({
              ...typedArgs,
              where: { ...typedArgs.where, unitId },
            })
          }

          if (
            ['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)
          ) {
            const typedArgs = args as { where?: Record<string, unknown> }
            typedArgs.where = { ...typedArgs.where, unitId }
          }

          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            const typedArgs = args as { where?: Record<string, unknown> }
            typedArgs.where = { ...typedArgs.where, unitId }
          }

          if (operation === 'create') {
            const typedArgs = args as { data?: Record<string, unknown> }
            typedArgs.data = { ...typedArgs.data, unitId }
          }

          if (operation === 'createMany') {
            const typedArgs = args as { data?: Array<Record<string, unknown>> }
            if (Array.isArray(typedArgs.data)) {
              typedArgs.data = typedArgs.data.map((item) => ({ ...item, unitId }))
            }
          }

          return query(args)
        },
      },
    },
  })
}

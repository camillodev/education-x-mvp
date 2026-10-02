import { PrismaClient } from '@prisma/client'
import { TERMS_DOCUMENTS } from '../src/lib/terms/content'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding TermsVersion...')

  for (const doc of TERMS_DOCUMENTS) {
    const result = await prisma.termsVersion.upsert({
      where: {
        // Upsert por kind + version não é suportado diretamente sem unique composto
        // Usamos findFirst + create/update manual
        id: `seed-${doc.kind}-${doc.version}`,
      },
      create: {
        id: `seed-${doc.kind}-${doc.version}`,
        kind: doc.kind,
        version: doc.version,
        body: doc.body,
      },
      update: {
        body: doc.body,
      },
    })
    console.log(`✓ ${doc.kind} v${doc.version} — id: ${result.id}`)
  }

  console.log(`\n✅ ${TERMS_DOCUMENTS.length} documentos criados/atualizados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

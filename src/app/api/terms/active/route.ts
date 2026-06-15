import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Returns the most recent TermsVersion of kind IX_ESCOLA (used for clickwrap)
export async function GET() {
  const version = await prisma.termsVersion.findFirst({
    where: { kind: 'IX_ESCOLA' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, version: true },
  })

  if (!version) {
    return NextResponse.json({ error: 'Terms not seeded' }, { status: 404 })
  }

  return NextResponse.json(version)
}

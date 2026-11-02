import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { guardAdmin } from '@/lib/api/guard'
import { errorResponse } from '@/lib/errors/handle'

type RouteCtx = { params: Promise<{ unitId: string }> }

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const denied = await guardAdmin('POST /api/units/[unitId]/enrollment-link')
  if (denied) return denied
  const { unitId } = await params

  try {
    const unit = await prisma.$transaction(async (tx) => {
      let existing = await tx.unit.findUnique({
        where: { id: unitId },
        select: { id: true, name: true, enrollmentLinkToken: true }
      })
      if (!existing) {
        return null
      }
      if (!existing.enrollmentLinkToken) {
        existing = await tx.unit.update({
          where: { id: unitId },
          data: { enrollmentLinkToken: randomUUID() },
          select: { id: true, name: true, enrollmentLinkToken: true }
        })
      }
      return existing
    })

    if (!unit) {
      return NextResponse.json({ error: 'Escola não encontrada.', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json(
      { enrollmentLinkToken: unit.enrollmentLinkToken, unitId: unit.id, unitName: unit.name },
      { status: 200 }
    )
  } catch (err) {
    return errorResponse(err, { route: 'POST /api/units/[unitId]/enrollment-link', unitId, exposeDetail: true })
  }
}
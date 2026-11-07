import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { listEnrollmentsForUnit, createEnrollment } from '@/lib/services/enrollment.service';

export async function GET(request: Request) {
  const ctx = await guardAdvisor('GET /api/enrollments');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId') || ctx.unitId;

    const enrollments = await listEnrollmentsForUnit(unitId);

    return NextResponse.json({ success: true, data: enrollments }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/enrollments', unitId: ctx.unitId });
  }
}

export async function POST(request: Request) {
  const ctx = await guardAdvisor('POST /api/enrollments');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const result = await createEnrollment(ctx.unitId, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return errorResponse(error, { route: 'POST /api/enrollments', unitId: ctx.unitId });
  }
}
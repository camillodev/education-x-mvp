import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import { listEnrollmentsForUnit, createEnrollment } from '@/lib/services/enrollment.service';

export async function GET() {
  try {
    const ctx = await requireSchoolAdmin();
    const enrollments = await listEnrollmentsForUnit(ctx.unitId);

    return NextResponse.json({ success: true, data: enrollments }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/enrollments' });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireSchoolAdmin();
    const body = await request.json();
    const result = await createEnrollment(ctx.unitId, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { route: 'POST /api/enrollments' });
  }
}
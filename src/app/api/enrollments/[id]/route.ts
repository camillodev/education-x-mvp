import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import {
  getEnrollmentDetail,
  updateEnrollment,
  cancelEnrollment,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdvisor('GET /api/enrollments/[id]');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const enrollment = await getEnrollmentDetail(ctx.unitId, id);
    if (!enrollment) {
      return errorResponse(new Error('Enrollment not found'), { route: 'GET /api/enrollments/[id]', unitId: ctx.unitId });
    }
    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/enrollments/[id]', unitId: ctx.unitId });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdvisor('PUT /api/enrollments/[id]');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateEnrollment(ctx.unitId, id, body);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'PUT /api/enrollments/[id]', unitId: ctx.unitId });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await guardAdvisor('DELETE /api/enrollments/[id]');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    await cancelEnrollment(ctx.unitId, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'DELETE /api/enrollments/[id]', unitId: ctx.unitId });
  }
}
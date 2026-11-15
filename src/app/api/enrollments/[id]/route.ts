import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import {
  getEnrollmentDetail,
  updateEnrollment,
  cancelEnrollment,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSchoolAdmin();
    const { id } = await params;
    const enrollment = await getEnrollmentDetail(ctx.unitId, id);
    if (!enrollment) {
      return errorResponse(new Error('Enrollment not found'), { route: 'GET /api/enrollments/[id]', unitId: ctx.unitId });
    }
    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/enrollments/[id]' });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSchoolAdmin();
    const { id } = await params;
    const body = await request.json();
    const updated = await updateEnrollment(ctx.unitId, id, body);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'PUT /api/enrollments/[id]' });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSchoolAdmin();
    const { id } = await params;
    await cancelEnrollment(ctx.unitId, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'DELETE /api/enrollments/[id]' });
  }
}
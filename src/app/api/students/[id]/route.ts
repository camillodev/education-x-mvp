import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import {
  getStudentDetail,
  updateStudent,
  deleteStudent,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unitContext = await requireSchoolAdmin();
    const { id } = await params;
    const student = await getStudentDetail(unitContext.unitId, id);
    if (!student) {
      return errorResponse(new Error('Student not found'), { route: 'GET /api/students/[id]', unitId: unitContext.unitId });
    }
    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/students/[id]' });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unitContext = await requireSchoolAdmin();
    const { id } = await params;
    const body = await request.json();
    const updated = await updateStudent(unitContext.unitId, id, body);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'PUT /api/students/[id]' });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unitContext = await requireSchoolAdmin();
    const { id } = await params;
    await deleteStudent(unitContext.unitId, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'DELETE /api/students/[id]' });
  }
}
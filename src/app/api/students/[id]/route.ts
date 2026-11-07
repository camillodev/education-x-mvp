import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import {
  getStudentDetail,
  updateStudent,
  deleteStudent,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('GET /api/students/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
    const student = await getStudentDetail(unitContext.unitId, id);
    if (!student) {
      return errorResponse(new Error('Student not found'), { route: 'GET /api/students/[id]', unitId: unitContext.unitId });
    }
    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/students/[id]', unitId: unitContext.unitId });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('PUT /api/students/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateStudent(unitContext.unitId, id, body);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'PUT /api/students/[id]', unitId: unitContext.unitId });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('DELETE /api/students/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
    await deleteStudent(unitContext.unitId, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'DELETE /api/students/[id]', unitId: unitContext.unitId });
  }
}
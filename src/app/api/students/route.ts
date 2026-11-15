import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import { encrypt } from '@/lib/crypto';
import {
  listStudentsForUnit,
  createStudent,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request) {
  let unitId: string | undefined;
  try {
    const unitContext = await requireSchoolAdmin();
    unitId = unitContext.unitId;
    const { searchParams } = new URL(request.url);
    const guardianId = searchParams.get('guardianId');

    const db = forUnit(unitContext.unitId);
    const students = await db.student.findMany({
      where: guardianId ? { guardianId } : undefined,
      include: { guardian: true, enrollments: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/students', unitId });
  }
}

export async function POST(request: Request) {
  let unitId: string | undefined;
  try {
    const unitContext = await requireSchoolAdmin();
    unitId = unitContext.unitId;
    const body = await request.json();
    const result = await createStudent(unitContext.unitId, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { route: 'POST /api/students', unitId });
  }
}
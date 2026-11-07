import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { encrypt } from '@/lib/crypto';
import {
  listStudentsForUnit,
  createStudent,
} from '@/lib/services/enrollment.service';

export async function GET(request: Request) {
  const unitContext = await guardAdvisor('GET /api/students');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId') || unitContext.unitId;
    const guardianId = searchParams.get('guardianId');

    const db = forUnit(unitId);
    const students = await db.student.findMany({
      where: guardianId ? { guardianId } : undefined,
      include: { guardian: true, enrollments: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/students', unitId: unitContext.unitId });
  }
}

export async function POST(request: Request) {
  const unitContext = await guardAdvisor('POST /api/students');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const body = await request.json();
    const result = await createStudent(unitContext.unitId, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return errorResponse(error, { route: 'POST /api/students', unitId: unitContext.unitId });
  }
}
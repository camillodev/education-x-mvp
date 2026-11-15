import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import { getAvailablePlansForUnit } from '@/lib/services/enrollment.service';

export async function GET() {
  try {
    const unitContext = await requireSchoolAdmin();
    const plans = await getAvailablePlansForUnit(unitContext.unitId);

    return NextResponse.json({ success: true, data: plans }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/plans' });
  }
}
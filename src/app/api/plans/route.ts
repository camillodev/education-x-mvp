import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { getAvailablePlansForUnit } from '@/lib/services/enrollment.service';

export async function GET() {
  const unitContext = await guardAdvisor('GET /api/plans');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const plans = await getAvailablePlansForUnit(unitContext.unitId);

    return NextResponse.json({ success: true, data: plans }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/plans', unitId: unitContext.unitId });
  }
}
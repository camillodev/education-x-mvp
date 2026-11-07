import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { getAvailablePlansForUnit } from '@/lib/services/enrollment.service';

export async function GET(request: Request) {
  const unitContext = await guardAdvisor('GET /api/plans');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId') || unitContext.unitId;

    const plans = await getAvailablePlansForUnit(unitId);

    return NextResponse.json({ success: true, data: plans }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/plans', unitId: unitContext.unitId });
  }
}
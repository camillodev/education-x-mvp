import { NextResponse } from 'next/server';
import { submitPlanStep } from '@/lib/services/enrollment.service';

export async function POST(request: Request) {
  try {
    const { unitId, guardianId, selection, plan } = await request.json();

    if (!unitId || !guardianId || !selection || !plan) {
      return NextResponse.json(
        { error: 'unitId, guardianId, selection and plan are required' },
        { status: 400 }
      );
    }

    const result = await submitPlanStep(unitId, guardianId, selection, plan);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Enrollment plan error:', error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
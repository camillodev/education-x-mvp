import { NextResponse } from 'next/server';
import { submitAcceptanceStep } from '@/lib/services/enrollment.service';

export async function POST(request: Request) {
  try {
    const { unitId, guardianId, ip } = await request.json();

    if (!unitId || !guardianId) {
      return NextResponse.json(
        { error: 'unitId and guardianId are required' },
        { status: 400 }
      );
    }

    await submitAcceptanceStep(unitId, guardianId, ip);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Enrollment contract error:', error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
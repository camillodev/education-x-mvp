import { NextResponse } from 'next/server';
import { submitGuardianStep } from '@/lib/services/enrollment.service';

export async function POST(request: Request) {
  try {
    const { unitId, existingGuardianId, input } = await request.json();

    if (!unitId || !input) {
      return NextResponse.json(
        { error: 'unitId and input are required' },
        { status: 400 }
      );
    }

    const result = await submitGuardianStep(unitId, existingGuardianId ?? null, input);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Enrollment guardian error:', error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
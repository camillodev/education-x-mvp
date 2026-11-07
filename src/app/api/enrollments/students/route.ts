import { NextResponse } from 'next/server';
import { submitStudentsStep } from '@/lib/services/enrollment.service';

export async function POST(request: Request) {
  try {
    const { unitId, guardianId, blocks } = await request.json();

    if (!unitId || !guardianId || !blocks) {
      return NextResponse.json(
        { error: 'unitId, guardianId and blocks are required' },
        { status: 400 }
      );
    }

    const result = await submitStudentsStep(unitId, guardianId, blocks);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Enrollment students error:', error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/auth/unit-context';
import { errorResponse } from '@/lib/errors/handle';
import { getUnitContract, saveUnitContract } from '@/lib/services/contract.service';

export async function GET() {
  try {
    const ctx = await requireSchoolAdmin();
    const contract = await getUnitContract(ctx.unitId);

    return NextResponse.json({ success: true, data: contract }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/contracts' });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireSchoolAdmin();
    const { body } = await request.json();
    if (!body) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const contract = await saveUnitContract(ctx.unitId, body);

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { route: 'POST /api/contracts' });
  }
}
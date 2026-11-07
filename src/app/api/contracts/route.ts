import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { getUnitContract, saveUnitContract } from '@/lib/services/contract.service';

export async function GET(request: Request) {
  const ctx = await guardAdvisor('GET /api/contracts');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId') || ctx.unitId;

    const contract = await getUnitContract(unitId);

    return NextResponse.json({ success: true, data: contract }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/contracts', unitId: ctx.unitId });
  }
}

export async function POST(request: Request) {
  const ctx = await guardAdvisor('POST /api/contracts');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { unitId, body } = await request.json();
    if (!unitId || !body) {
      return NextResponse.json(
        { error: 'unitId and body are required' },
        { status: 400 }
      );
    }

    const contract = await saveUnitContract(unitId, body);

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error: any) {
    return errorResponse(error, { route: 'POST /api/contracts', unitId: ctx.unitId });
  }
}
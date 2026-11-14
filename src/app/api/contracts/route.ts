import { NextResponse } from 'next/server';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { getUnitContract, saveUnitContract } from '@/lib/services/contract.service';

export async function GET() {
  const ctx = await guardAdvisor('GET /api/contracts');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const contract = await getUnitContract(ctx.unitId);

    return NextResponse.json({ success: true, data: contract }, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: 'GET /api/contracts', unitId: ctx.unitId });
  }
}

export async function POST(request: Request) {
  const ctx = await guardAdvisor('POST /api/contracts');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { body } = await request.json();
    if (!body) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const contract = await saveUnitContract(ctx.unitId, body);

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { route: 'POST /api/contracts', unitId: ctx.unitId });
  }
}
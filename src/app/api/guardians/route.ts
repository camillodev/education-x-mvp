import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { encrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  const unitContext = await guardAdvisor('GET /api/guardians');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId') || unitContext.unitId;

    const db = forUnit(unitId);
    const guardians = await db.guardian.findMany({
      include: { enrollments: { include: { student: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: guardians }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/guardians', unitId: unitContext.unitId });
  }
}

export async function POST(request: Request) {
  const unitContext = await guardAdvisor('POST /api/guardians');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const body = await request.json();
    const db = forUnit(unitContext.unitId);

    const encryptedFields: any = {};
    if (body.cpfCnpj) encryptedFields.cpfEnc = await encrypt(body.cpfCnpj);
    if (body.email) encryptedFields.emailEnc = await encrypt(body.email);
    if (body.mobilePhone) encryptedFields.phoneEnc = await encrypt(body.mobilePhone);
    if (body.postalCode) encryptedFields.postalCodeEnc = await encrypt(body.postalCode);
    if (body.address) encryptedFields.addressEnc = await encrypt(body.address);
    if (body.addressNumber) encryptedFields.addressNumberEnc = await encrypt(body.addressNumber);
    if (body.complement) encryptedFields.complementEnc = await encrypt(body.complement);
    if (body.province) encryptedFields.provinceEnc = await encrypt(body.province);
    if (body.city) encryptedFields.cityEnc = await encrypt(body.city);
    if (body.state) encryptedFields.stateEnc = await encrypt(body.state);
    if (body.phone) encryptedFields.landlineEnc = await encrypt(body.phone);
    if (body.additionalEmails) encryptedFields.additionalEmailsEnc = await encrypt(body.additionalEmails);

    const guardian = await db.guardian.create({
      data: {
        ...body,
        ...encryptedFields,
        unitId: unitContext.unitId,
      },
    });

    return NextResponse.json({ success: true, data: guardian }, { status: 201 });
  } catch (error: any) {
    return errorResponse(error, { route: 'POST /api/guardians', unitId: unitContext.unitId });
  }
}

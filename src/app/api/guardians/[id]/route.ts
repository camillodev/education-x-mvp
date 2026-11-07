import { NextResponse } from 'next/server';
import { forUnit } from '@/lib/db';
import { guardAdvisor } from '@/lib/api/guard';
import { errorResponse } from '@/lib/errors/handle';
import { encrypt } from '@/lib/crypto';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('GET /api/guardians/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
    const db = forUnit(unitContext.unitId);
    const guardian = await db.guardian.findUnique({
      where: { id },
      include: { enrollments: { include: { student: true } } },
    });

    if (!guardian) {
      return errorResponse(
        new Error('Guardian not found'),
        { route: 'GET /api/guardians/[id]', unitId: unitContext.unitId }
      );
    }

    return NextResponse.json({ success: true, data: guardian }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'GET /api/guardians/[id]', unitId: unitContext.unitId });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('PUT /api/guardians/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
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

    const result = await db.guardian.update({
      where: { id },
      data: { ...encryptedFields, ...body },
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'PUT /api/guardians/[id]', unitId: unitContext.unitId });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unitContext = await guardAdvisor('DELETE /api/guardians/[id]');
  if (unitContext instanceof NextResponse) return unitContext;

  try {
    const { id } = await params;
    const db = forUnit(unitContext.unitId);
    await db.guardian.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return errorResponse(error, { route: 'DELETE /api/guardians/[id]', unitId: unitContext.unitId });
  }
}
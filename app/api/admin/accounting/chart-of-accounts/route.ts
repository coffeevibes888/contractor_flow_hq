import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { ensureChartOfAccounts } from '@/lib/accounting/gl';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

async function getLandlord(userId: string, landlordId: string) {
  return prisma.landlord.findFirst({
    where: { id: landlordId, ownerUserId: userId },
  });
}

// GET — list all accounts for this landlord
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await getLandlord(session.user.id, landlordId);
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await ensureChartOfAccounts(landlordId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: { landlordId },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

// POST — create a new custom account
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { landlordId, code, name, type, subType, taxLine, description, parentId } = body;

    if (!landlordId || !code || !name || !type)
      return NextResponse.json({ success: false, message: 'landlordId, code, name, and type are required' }, { status: 400 });

    const landlord = await getLandlord(session.user.id, landlordId);
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    // Check for duplicate code within this landlord
    const existing = await prisma.chartOfAccount.findUnique({
      where: { landlordId_code: { landlordId, code } },
    });
    if (existing)
      return NextResponse.json({ success: false, message: `Account code ${code} already exists` }, { status: 409 });

    const account = await prisma.chartOfAccount.create({
      data: {
        landlordId,
        code,
        name,
        type,
        subType: subType ?? null,
        taxLine: taxLine ?? null,
        description: description ?? null,
        parentId: parentId ?? null,
        isSystem: false,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { balanceSheet } from '@/lib/accounting';
import { assertAccountingAccess } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    await assertAccountingAccess(landlordId);

    const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();
    const report = await balanceSheet(landlordId, asOf);
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { profitAndLoss } from '@/lib/accounting';
import { assertAccountingReports } from '@/lib/accounting/feature-gate';
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

    await assertAccountingReports(landlordId);

    const now = new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const report = await profitAndLoss(landlordId, from, to);
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

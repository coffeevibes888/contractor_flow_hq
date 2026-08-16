import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { getReconciliationSummary } from '@/lib/banking/stripe-bank-sync';

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
    await assertAccountingLedger(landlordId);

    const fromDate = searchParams.get('fromDate')
      ? new Date(searchParams.get('fromDate')!)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 3);
          return d;
        })();
    const toDate = searchParams.get('toDate')
      ? new Date(searchParams.get('toDate')!)
      : new Date();

    const tiles = await getReconciliationSummary({ landlordId, fromDate, toDate });

    return NextResponse.json({
      success: true,
      data: {
        tiles,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

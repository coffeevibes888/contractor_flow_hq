import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getTenantLedger, getTenantBalance } from '@/lib/accounting';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    const leaseId = searchParams.get('leaseId');
    if (!landlordId || !leaseId) {
      return NextResponse.json({ success: false, message: 'landlordId and leaseId are required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { landlordId } } },
      include: {
        unit: { include: { property: true } },
        tenant: { select: { id: true, name: true, email: true, phoneNumber: true } },
      },
    });
    if (!lease) {
      return NextResponse.json({ success: false, message: 'Lease not found' }, { status: 404 });
    }

    await assertAccountingLedger(landlordId);

    const [entries, currentBalance] = await Promise.all([
      getTenantLedger(leaseId),
      getTenantBalance(leaseId),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        lease: {
          id: lease.id,
          unit: lease.unit?.name ?? lease.unit?.id,
          property: lease.unit?.property?.name,
          tenant: lease.tenant,
        },
        currentBalance,
        entries,
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

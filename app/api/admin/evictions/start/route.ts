import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { prisma } from '@/db/prisma';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 400 });
    }
    const landlordId = landlordResult.landlord.id;

    const body = await req.json();
    const { tenantId, leaseId, propertyId, reason, amountOwed, deadline, portalUrl } = body || {};

    if (!tenantId || !leaseId || !propertyId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, tenantId },
      include: {
        tenant: { select: { email: true, name: true } },
        unit: { select: { name: true, property: { select: { name: true, landlordId: true } } } },
      },
    });

    if (!lease || lease.unit.property?.landlordId !== landlordId) {
      return NextResponse.json({ message: 'Lease not found' }, { status: 404 });
    }

    const messageLines = [
      `An eviction process has been initiated for ${lease.unit.property?.name || 'your unit'}.`,
      lease.unit?.name ? `Unit: ${lease.unit.name}` : null,
      amountOwed ? `Amount owed: $${amountOwed}` : null,
      deadline ? `Deadline to cure or vacate: ${deadline}` : null,
      reason ? `Reason: ${reason}` : null,
      `Please review and respond via the tenant portal.`,
    ]
      .filter(Boolean)
      .join(' ');

    await NotificationService.createNotification({
      userId: tenantId,
      type: 'reminder',
      title: 'Eviction process started',
      message: messageLines,
      actionUrl: '/user/notifications',
      metadata: { leaseId, propertyId, portalUrl },
      landlordId,
    });

    return NextResponse.json({
      success: true,
      message: 'Eviction notice drafted and tenant notified',
    });
  } catch (error) {
    console.error('Eviction start error', error);
    return NextResponse.json({ message: 'Failed to start eviction' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id: leaseId } = await context.params;
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      unit: { include: { property: { include: { landlord: { select: { ownerUserId: true } } } } } },
      tenant: { select: { name: true } },
    },
  });

  if (!lease) return NextResponse.json({ message: 'Lease not found' }, { status: 404 });

  const landlordUserId = lease.unit.property?.landlord?.ownerUserId;
  if (!landlordUserId) return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });

  await NotificationService.createNotification({
    userId: landlordUserId,
    type: 'reminder',
    title: 'Lease ready for your signature',
    message: `${lease.tenant?.name || 'Tenant'} has signed. Please sign to complete.`,
    actionUrl: `/admin/dashboard/properties/${lease.unit.propertyId}/details`,
    landlordId: lease.unit.property.landlordId || undefined,
  });

  return NextResponse.json({ success: true });
}

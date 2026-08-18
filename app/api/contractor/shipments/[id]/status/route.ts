/**
 * PATCH /api/contractor/shipments/[id]/status
 *
 * Update a shipment's status. When status transitions to 'delivered',
 * automatically triggers job readiness checks and crew notifications.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, trackingNumber, carrier, deliveredAt } = body as {
      status: string;
      trackingNumber?: string;
      carrier?: string;
      deliveredAt?: string;
    };

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const validStatuses = ['draft', 'packed', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Verify shipment belongs to contractor
    const shipment = await prisma.contractorShipment.findFirst({
      where: { id, contractorId: contractor.id },
    });
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const previousStatus = shipment.status;

    // Update shipment
    const updated = await prisma.contractorShipment.update({
      where: { id },
      data: {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(carrier ? { carrier } : {}),
        ...(status === 'delivered' ? { deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date() } : {}),
        ...(status === 'in_transit' && !shipment.shipDate ? { shipDate: new Date() } : {}),
      },
    });

    // When shipment is delivered → trigger job readiness and crew notifications
    if (status === 'delivered' && previousStatus !== 'delivered') {
      try {
        const { onShipmentDelivered } = await import('@/lib/services/contractor-automation');
        await onShipmentDelivered({
          shipmentId: id,
          contractorId: contractor.id,
        });
      } catch (err) {
        console.error('[shipment status] delivery automation failed (non-blocking):', err);
      }
    }

    return NextResponse.json({ success: true, shipment: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/shipments/[id]/status error:', error);
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
  }
}

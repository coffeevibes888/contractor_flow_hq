import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Accept or counter-offer a work order (Contractor action)
 * 
 * Flow:
 * 1. PM sends job offer with price
 * 2. Contractor can:
 *    - Accept at offered price
 *    - Counter-offer with different price
 *    - Decline
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workOrderId } = await params;
    const { action, counterOfferAmount, message } = await req.json();

    if (!['accept', 'counter', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        contractor: { select: { id: true, userId: true, name: true } },
        landlord: { select: { id: true, name: true, ownerUserId: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Verify contractor owns this
    if (workOrder.contractor?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Must be in draft/assigned status to accept/counter
    if (!['draft', 'assigned'].includes(workOrder.status)) {
      return NextResponse.json({ 
        error: 'Work order cannot be modified in current status' 
      }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept at the offered price
      await prisma.$transaction([
        prisma.workOrder.update({
          where: { id: workOrderId },
          data: { status: 'assigned' },
        }),
        prisma.workOrderHistory.create({
          data: {
            workOrderId,
            changedById: session.user.id,
            previousStatus: workOrder.status,
            newStatus: 'assigned',
            notes: `Accepted by contractor at $${Number(workOrder.agreedPrice).toFixed(2)}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Work order accepted',
        agreedPrice: workOrder.agreedPrice,
      });
    }

    if (action === 'counter') {
      if (!counterOfferAmount || Number(counterOfferAmount) <= 0) {
        return NextResponse.json({ error: 'Counter offer amount required' }, { status: 400 });
      }

      // Create counter offer - status stays draft, price updated
      await prisma.$transaction([
        prisma.workOrder.update({
          where: { id: workOrderId },
          data: { 
            agreedPrice: Number(counterOfferAmount),
            status: 'draft', // Back to draft for PM review
            notes: message ? `Counter offer note: ${message}` : workOrder.notes,
          },
        }),
        prisma.workOrderHistory.create({
          data: {
            workOrderId,
            changedById: session.user.id,
            previousStatus: workOrder.status,
            newStatus: 'draft',
            notes: `Counter offer: $${Number(counterOfferAmount).toFixed(2)} (was $${Number(workOrder.agreedPrice).toFixed(2)})${message ? ` - ${message}` : ''}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Counter offer submitted',
        counterOfferAmount: Number(counterOfferAmount),
      });
    }

    if (action === 'decline') {
      await prisma.$transaction([
        prisma.workOrder.update({
          where: { id: workOrderId },
          data: { 
            status: 'cancelled',
            contractorId: null, // Unassign contractor
          },
        }),
        prisma.workOrderHistory.create({
          data: {
            workOrderId,
            changedById: session.user.id,
            previousStatus: workOrder.status,
            newStatus: 'cancelled',
            notes: `Declined by contractor${message ? `: ${message}` : ''}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Work order declined',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing work order action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

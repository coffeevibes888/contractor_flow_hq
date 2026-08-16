import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

// POST - Accept a bid on a work order (landlord only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: workOrderId } = await params;
    const body = await req.json();
    const { bidId } = body;

    if (!bidId) {
      return NextResponse.json(
        { success: false, error: 'Bid ID is required' },
        { status: 400 }
      );
    }

    // Get work order and verify ownership
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { ownerUserId: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    if (workOrder.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Work order is not open for bidding' },
        { status: 400 }
      );
    }

    // Get the bid
    const bid = await prisma.workOrderBid.findUnique({
      where: { id: bidId },
      include: {
        contractor: { select: { id: true, name: true } },
      },
    });

    if (!bid || bid.workOrderId !== workOrderId) {
      return NextResponse.json(
        { success: false, error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Accept the bid in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the bid status to accepted
      await tx.workOrderBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      // Decline all other bids
      await tx.workOrderBid.updateMany({
        where: {
          workOrderId,
          id: { not: bidId },
        },
        data: { status: 'declined' },
      });

      // Update work order with contractor and agreed price
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          contractorId: bid.contractorId,
          agreedPrice: bid.amount,
          status: 'assigned',
          isOpenBid: false,
        },
      });

      // Create history record
      await tx.workOrderHistory.create({
        data: {
          workOrderId,
          changedById: session.user.id!,
          previousStatus: 'open',
          newStatus: 'assigned',
          notes: `Accepted bid from ${bid.contractor.name} for $${Number(bid.amount).toFixed(2)}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Bid accepted! ${bid.contractor.name} has been assigned to this job.`,
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}

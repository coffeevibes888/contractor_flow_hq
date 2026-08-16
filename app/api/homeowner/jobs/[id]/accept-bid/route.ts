import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: jobId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get homeowner profile
    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return NextResponse.json({ error: 'Homeowner profile not found' }, { status: 404 });
    }

    // Verify job belongs to homeowner
    const workOrder = await prisma.homeownerWorkOrder.findFirst({
      where: {
        id: jobId,
        homeownerId: homeowner.id,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (workOrder.status !== 'open') {
      return NextResponse.json(
        { error: 'This job is no longer accepting bids' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { bidId } = body;

    if (!bidId) {
      return NextResponse.json({ error: 'Bid ID is required' }, { status: 400 });
    }

    // Verify bid exists and belongs to this job
    const bid = await prisma.homeownerWorkOrderBid.findFirst({
      where: {
        id: bidId,
        workOrderId: jobId,
      },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    if (bid.status !== 'pending') {
      return NextResponse.json(
        { error: 'This bid has already been processed' },
        { status: 400 }
      );
    }

    // Use transaction to update bid, job, and decline other bids
    await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      await tx.homeownerWorkOrderBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      // Update job status and assign contractor
      await tx.homeownerWorkOrder.update({
        where: { id: jobId },
        data: {
          status: 'assigned',
          contractorId: bid.contractorId,
          agreedPrice: bid.amount,
        },
      });

      // Decline all other pending bids
      await tx.homeownerWorkOrderBid.updateMany({
        where: {
          workOrderId: jobId,
          id: { not: bidId },
          status: 'pending',
        },
        data: { status: 'declined' },
      });
    });

    // Send notifications
    try {
      // Get contractor user ID
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: bid.contractorId },
        include: { user: true },
      });

      if (contractor?.user) {
        // Notify contractor that bid was accepted
        await MarketplaceNotifications.notifyBidAccepted({
          contractorId: contractor.user.id,
          jobId,
          jobTitle: workOrder.title,
          homeownerName: session.user.name || 'A homeowner',
          amount: Number(bid.amount),
        });
      }

      // Notify other contractors that their bids were declined
      const otherBids = await prisma.homeownerWorkOrderBid.findMany({
        where: {
          workOrderId: jobId,
          id: { not: bidId },
          status: 'declined',
        },
      });

      for (const otherBid of otherBids) {
        const otherContractor = await prisma.contractorProfile.findUnique({
          where: { id: otherBid.contractorId },
          include: { user: true },
        });
        if (otherContractor?.user) {
          await MarketplaceNotifications.notifyBidRejected({
            contractorId: otherContractor.user.id,
            jobId,
            jobTitle: workOrder.title,
          });
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Bid accepted successfully',
      bid: {
        id: bid.id,
        amount: bid.amount,
        contractorId: bid.contractorId,
      },
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return NextResponse.json(
      { error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}

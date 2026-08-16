import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bidId = params.id;

    // Get the bid with job details
    const bid = await prisma.contractorBid.findUnique({
      where: { id: bidId },
      include: {
        job: true,
        contractor: {
          select: {
            id: true,
            businessName: true,
            displayName: true,
            userId: true,
          },
        },
      },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    // Verify the user is the customer (job owner)
    if (bid.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if bid is still active
    if (bid.status !== 'active') {
      return NextResponse.json(
        { error: 'Bid is no longer active' },
        { status: 400 }
      );
    }

    // Reject the bid
    const rejectedBid = await prisma.contractorBid.update({
      where: { id: bidId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
      },
    });

    // Create notification for contractor
    if (bid.contractor.userId) {
      await prisma.notification.create({
        data: {
          userId: bid.contractor.userId,
          type: 'bid_rejected',
          title: 'Bid Not Selected',
          message: `Your bid of $${Number(bid.bidAmount).toLocaleString()} for "${bid.job.title}" was not selected. Keep bidding on other jobs!`,
          actionUrl: `/contractor/marketplace`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bid: rejectedBid,
    });
  } catch (error) {
    console.error('Error rejecting bid:', error);
    return NextResponse.json(
      { error: 'Failed to reject bid' },
      { status: 500 }
    );
  }
}

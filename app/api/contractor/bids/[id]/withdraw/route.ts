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

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Get the bid
    const bid = await prisma.contractorBid.findUnique({
      where: { id: bidId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    // Verify the contractor owns this bid
    if (bid.contractorId !== contractor.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if bid is still active
    if (bid.status !== 'active') {
      return NextResponse.json(
        { error: 'Bid is no longer active and cannot be withdrawn' },
        { status: 400 }
      );
    }

    // Check if job is still open
    if (bid.job.status !== 'open') {
      return NextResponse.json(
        { error: 'Job is no longer accepting bids' },
        { status: 400 }
      );
    }

    // Withdraw the bid
    const withdrawnBid = await prisma.contractorBid.update({
      where: { id: bidId },
      data: {
        status: 'withdrawn',
      },
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: bid.customerId,
        type: 'bid_withdrawn',
        title: 'Bid Withdrawn',
        message: `${contractor.businessName || contractor.displayName} has withdrawn their bid for "${bid.job.title}".`,
        actionUrl: `/customer/jobs/${bid.jobId}/bids`,
      },
    });

    return NextResponse.json({
      success: true,
      bid: withdrawnBid,
    });
  } catch (error) {
    console.error('Error withdrawing bid:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw bid' },
      { status: 500 }
    );
  }
}

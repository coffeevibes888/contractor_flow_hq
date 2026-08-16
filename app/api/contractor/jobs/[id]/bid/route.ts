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

    const jobId = params.id;
    const body = await req.json();
    const { bidAmount, deliveryDays, bidMessage, contractorId } = body;

    // Validation
    if (!bidAmount || bidAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid bid amount' },
        { status: 400 }
      );
    }

    if (!deliveryDays || deliveryDays <= 0) {
      return NextResponse.json(
        { error: 'Invalid delivery days' },
        { status: 400 }
      );
    }

    if (!bidMessage || bidMessage.trim().length < 50) {
      return NextResponse.json(
        { error: 'Proposal message must be at least 50 characters' },
        { status: 400 }
      );
    }

    // Verify contractor ownership
    const contractor = await prisma.contractorProfile.findFirst({
      where: {
        id: contractorId,
        userId: session.user.id,
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Get the job
    const job = await prisma.workOrder.findUnique({
      where: { id: jobId },
      include: {
        landlord: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is still open for bidding
    if (!job.isOpenBid || job.status !== 'open') {
      return NextResponse.json(
        { error: 'Job is no longer accepting bids' },
        { status: 400 }
      );
    }

    // Check if bid deadline has passed
    if (job.bidDeadline && new Date(job.bidDeadline) < new Date()) {
      return NextResponse.json(
        { error: 'Bid deadline has passed' },
        { status: 400 }
      );
    }

    if (!job.landlord.ownerUserId) {
      return NextResponse.json(
        { error: 'Unable to process bid — job owner not found' },
        { status: 400 }
      );
    }

    // Check if contractor already bid
    const existingBid = await prisma.contractorBid.findFirst({
      where: {
        jobId,
        contractorId,
      },
    });

    if (existingBid) {
      return NextResponse.json(
        { error: 'You have already submitted a bid for this job' },
        { status: 400 }
      );
    }

    // Create the bid
    const bid = await prisma.contractorBid.create({
      data: {
        jobId,
        contractorId,
        customerId: job.landlord.ownerUserId,
        bidAmount,
        deliveryDays,
        bidMessage: bidMessage.trim(),
        status: 'active',
        validUntil: job.bidDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      },
    });

    // Notify the job owner (landlord) that a new bid was received.
    try {
      await prisma.notification.create({
        data: {
          userId: job.landlord.ownerUserId,
          type: 'message',
          title: 'New bid received',
          message: `${contractor.displayName || contractor.businessName} submitted a bid of $${Number(bidAmount).toLocaleString()} on "${job.title}".`,
          actionUrl: `/admin/work-orders/${jobId}`,
          metadata: { jobId, bidId: bid.id, contractorId },
        },
      });
    } catch (notifyError) {
      // Notification failures should not block the bid from being recorded.
      console.error('Failed to create bid notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      bid,
    });
  } catch (error) {
    console.error('Error submitting bid:', error);
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    );
  }
}

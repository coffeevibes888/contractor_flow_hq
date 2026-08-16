import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

/**
 * POST - Submit a bid on a homeowner job
 */
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

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found. Please complete your profile first.' },
        { status: 404 }
      );
    }

    // Get job
    const job = await prisma.homeownerWorkOrder.findUnique({
      where: { id: jobId },
      include: {
        homeowner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job is open for bidding
    if (!job.isOpenBid || job.status !== 'open') {
      return NextResponse.json(
        { error: 'This job is not open for bidding' },
        { status: 400 }
      );
    }

    // Check bid deadline
    if (job.bidDeadline && new Date() > job.bidDeadline) {
      return NextResponse.json(
        { error: 'Bidding deadline has passed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, estimatedHours, proposedStartDate, message } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid bid amount is required' },
        { status: 400 }
      );
    }

    // Check if contractor already bid
    const existingBid = await prisma.homeownerWorkOrderBid.findUnique({
      where: {
        workOrderId_contractorId: {
          workOrderId: jobId,
          contractorId: contractor.id,
        },
      },
    });

    let bid;
    let isNew = false;

    if (existingBid) {
      // Update existing bid
      if (existingBid.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot update a bid that has already been processed' },
          { status: 400 }
        );
      }

      bid = await prisma.homeownerWorkOrderBid.update({
        where: { id: existingBid.id },
        data: {
          amount: Number(amount),
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
          message,
        },
      });
    } else {
      // Create new bid
      bid = await prisma.homeownerWorkOrderBid.create({
        data: {
          workOrderId: jobId,
          contractorId: contractor.id,
          amount: Number(amount),
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
          message,
        },
      });
      isNew = true;
    }

    // Send notification to homeowner (only for new bids)
    if (isNew && job.homeowner.user) {
      try {
        await MarketplaceNotifications.notifyBidReceived({
          homeownerId: job.homeowner.user.id,
          jobId,
          jobTitle: job.title,
          contractorName: contractor.displayName || contractor.businessName,
          bidAmount: Number(amount),
        });
      } catch (error) {
        console.error('Error sending notification:', error);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      bid,
      isNew,
      message: isNew ? 'Bid submitted successfully' : 'Bid updated successfully',
    });
  } catch (error) {
    console.error('Error submitting bid:', error);
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get all bids for a job (homeowner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: jobId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify homeowner owns this job
    const homeowner = await prisma.homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return NextResponse.json(
        { error: 'Homeowner profile not found' },
        { status: 404 }
      );
    }

    const job = await prisma.homeownerWorkOrder.findFirst({
      where: {
        id: jobId,
        homeownerId: homeowner.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all bids with contractor details
    const bids = await prisma.homeownerWorkOrderBid.findMany({
      where: { workOrderId: jobId },
      orderBy: { createdAt: 'desc' },
    });

    // Get contractor details for each bid
    const bidsWithContractors = await Promise.all(
      bids.map(async (bid) => {
        const contractor = await prisma.contractorProfile.findUnique({
          where: { id: bid.contractorId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        });

        return {
          ...bid,
          contractor,
        };
      })
    );

    return NextResponse.json({
      success: true,
      bids: bidsWithContractors,
    });
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}

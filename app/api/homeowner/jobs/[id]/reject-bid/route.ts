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

    const body = await request.json();
    const { bidId, reason } = body;

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

    // Decline the bid
    await prisma.homeownerWorkOrderBid.update({
      where: { id: bidId },
      data: { status: 'declined' },
    });

    // Send notification to contractor
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: bid.contractorId },
        include: { user: true },
      });

      if (contractor?.user) {
        await MarketplaceNotifications.notifyBidRejected({
          contractorId: contractor.user.id,
          jobId,
          jobTitle: workOrder.title,
          reason,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Bid declined successfully',
    });
  } catch (error) {
    console.error('Error rejecting bid:', error);
    return NextResponse.json(
      { error: 'Failed to reject bid' },
      { status: 500 }
    );
  }
}

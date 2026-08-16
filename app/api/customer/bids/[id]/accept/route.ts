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
        job: {
          include: {
            landlord: true,
          },
        },
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

    // Check if job is still open
    if (bid.job.status !== 'open') {
      return NextResponse.json(
        { error: 'Job is no longer accepting bids' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Accept the bid
      const acceptedBid = await tx.contractorBid.update({
        where: { id: bidId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Reject all other bids for this job
      await tx.contractorBid.updateMany({
        where: {
          jobId: bid.jobId,
          id: { not: bidId },
          status: 'active',
        },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
        },
      });

      // Update job status to assigned
      await tx.workOrder.update({
        where: { id: bid.jobId },
        data: {
          status: 'assigned',
          contractorId: bid.contractorId,
        },
      });

      // Create a ContractorJob from the accepted bid
      const contractorJob = await tx.contractorJob.create({
        data: {
          contractorId: bid.contractorId,
          jobNumber: `JOB-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          title: bid.job.title,
          description: bid.job.description,
          status: 'approved',
          estimatedCost: bid.bidAmount,
          priority: bid.job.priority,
          estimatedHours: bid.deliveryDays ? bid.deliveryDays * 8 : undefined,
        },
      });

      // Create customer record if doesn't exist
      let customer = await tx.contractorCustomer.findFirst({
        where: {
          userId: session.user.id,
          contractorId: bid.contractorId,
        },
      });

      if (!customer) {
        customer = await tx.contractorCustomer.create({
          data: {
            contractorId: bid.contractorId,
            userId: session.user.id,
            name: session.user.name || 'Customer',
            email: session.user.email || '',
            source: 'marketplace',
          },
        });
      }

      // Link customer to job
      await tx.contractorJob.update({
        where: { id: contractorJob.id },
        data: {
          customerId: customer.id,
        },
      });

      // Create notification for contractor
      await tx.notification.create({
        data: {
          userId: bid.contractor.userId || '',
          type: 'bid_accepted',
          title: 'Bid Accepted!',
          message: `Your bid of $${Number(bid.bidAmount).toLocaleString()} for "${bid.job.title}" has been accepted.`,
        },
      });

      return { acceptedBid, contractorJob };
    });

    return NextResponse.json({
      success: true,
      bid: result.acceptedBid,
      job: result.contractorJob,
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return NextResponse.json(
      { error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}

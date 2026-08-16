import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Submit a bid on an open work order (Upwork-style bidding)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, amount, estimatedHours, proposedStartDate, message } = await req.json();

    if (!workOrderId || !amount) {
      return NextResponse.json({ error: 'Work order ID and amount required' }, { status: 400 });
    }

    // Get contractor profile
    const contractor = await prisma.contractor.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Verify it's an open bid job
    if (!workOrder.isOpenBid || workOrder.status !== 'open') {
      return NextResponse.json({ error: 'This job is not open for bidding' }, { status: 400 });
    }

    // Check bid deadline
    if (workOrder.bidDeadline && new Date() > workOrder.bidDeadline) {
      return NextResponse.json({ error: 'Bidding deadline has passed' }, { status: 400 });
    }

    // Check if contractor already bid
    const existingBid = await prisma.workOrderBid.findUnique({
      where: {
        workOrderId_contractorId: {
          workOrderId,
          contractorId: contractor.id,
        },
      },
    });

    if (existingBid) {
      // Update existing bid
      const bid = await prisma.workOrderBid.update({
        where: { id: existingBid.id },
        data: {
          amount: Number(amount),
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
          message,
        },
      });

      return NextResponse.json({ bid, updated: true });
    }

    // Create new bid
    const bid = await prisma.workOrderBid.create({
      data: {
        workOrderId,
        contractorId: contractor.id,
        amount: Number(amount),
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        proposedStartDate: proposedStartDate ? new Date(proposedStartDate) : null,
        message,
      },
    });

    return NextResponse.json({ bid, created: true });
  } catch (error) {
    console.error('Error submitting bid:', error);
    return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
  }
}

// GET - Fetch contractor's bids
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profiles
    const contractors = await prisma.contractor.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (contractors.length === 0) {
      return NextResponse.json({ bids: [] });
    }

    const contractorIds = contractors.map(c => c.id);

    const bids = await prisma.workOrderBid.findMany({
      where: { contractorId: { in: contractorIds } },
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            budgetMin: true,
            budgetMax: true,
            bidDeadline: true,
            property: { select: { name: true } },
            landlord: { select: { name: true, companyName: true } },
            _count: { select: { bids: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bids });
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 });
  }
}

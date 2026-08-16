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
      return NextResponse.json(
        { error: 'Homeowner profile not found' },
        { status: 404 }
      );
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

    if (workOrder.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job is not completed yet' },
        { status: 400 }
      );
    }

    if (!workOrder.contractorId) {
      return NextResponse.json(
        { error: 'No contractor assigned to this job' },
        { status: 400 }
      );
    }

    // Get escrow hold
    const escrowHold = await prisma.jobGuaranteeHold.findFirst({
      where: {
        jobId,
        status: 'held',
      },
    });

    if (!escrowHold) {
      return NextResponse.json(
        { error: 'No active escrow hold found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed reason (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Generate unique case number
    const caseNumber = `DSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        caseNumber,
        type: 'job_quality',
        category: 'poor_quality',
        status: 'open',
        priority: 'high',
        filedById: session.user.id,
        filedByRole: 'homeowner',
        homeownerId: homeowner.id,
        contractorId: workOrder.contractorId,
        workOrderId: jobId,
        landlordId: homeowner.id,
        title: `Job Dispute: ${workOrder.title}`,
        description: reason,
        disputedAmount: escrowHold.amount,
      },
    });

    // Update escrow hold to disputed status
    await prisma.jobGuaranteeHold.update({
      where: { id: escrowHold.id },
      data: {
        status: 'disputed',
        disputeId: dispute.id,
      },
    });

    // Create initial dispute timeline entry
    await prisma.disputeTimeline.create({
      data: {
        disputeId: dispute.id,
        action: 'dispute_filed',
        description: 'Dispute filed by homeowner',
        performedById: session.user.id,
      },
    });

    // Send notifications
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: workOrder.contractorId },
        include: { user: true },
      });

      if (contractor?.user) {
        await MarketplaceNotifications.notifyDisputeFiled({
          contractorId: contractor.user.id,
          jobId,
          jobTitle: workOrder.title,
          homeownerName: session.user.name || 'A homeowner',
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute filed successfully',
      disputeId: dispute.id,
    });
  } catch (error) {
    console.error('Error filing dispute:', error);
    return NextResponse.json(
      { error: 'Failed to file dispute' },
      { status: 500 }
    );
  }
}

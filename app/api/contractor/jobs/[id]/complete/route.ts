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

    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Check if this is a ContractorJob or HomeownerWorkOrder
    // First try ContractorJob
    let job = await prisma.contractorJob.findFirst({
      where: {
        id: jobId,
        contractorId: contractorProfile.id,
      },
    });

    if (job) {
      // Handle ContractorJob completion
      const body = await request.json();
      const { completionNotes, completionPhotos } = body;

      await prisma.contractorJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
          notes: completionNotes
            ? `${job.notes || ''}\n\nCompletion Notes: ${completionNotes}`.trim()
            : job.notes,
          afterPhotos: completionPhotos
            ? [...job.afterPhotos, ...completionPhotos]
            : job.afterPhotos,
        },
      });

      // Notify the customer (only when they have a registered user account).
      try {
        if (job.customerId) {
          const customer = await prisma.contractorCustomer.findUnique({
            where: { id: job.customerId },
            select: { userId: true, name: true },
          });
          if (customer?.userId) {
            await prisma.notification.create({
              data: {
                userId: customer.userId,
                type: 'message',
                title: 'Job completed',
                message: `${contractorProfile.displayName || contractorProfile.businessName} marked "${job.jobNumber ? `#${job.jobNumber} ` : ''}${job.title}" as complete.`,
                actionUrl: `/customer/jobs`,
                metadata: { jobId },
              },
            });
          }
        }
      } catch (notifyError) {
        console.error('Failed to create job completion notification:', notifyError);
      }
      // Invoice generation remains a manual contractor action via the invoicing module.

      return NextResponse.json({
        success: true,
        message: 'Job marked as complete',
      });
    }

    // Try HomeownerWorkOrder
    const homeownerJob = await prisma.homeownerWorkOrder.findFirst({
      where: {
        id: jobId,
        contractorId: contractorProfile.id,
      },
      include: {
        homeowner: {
          include: {
            user: true,
          },
        },
        bids: {
          where: {
            contractorId: contractorProfile.id,
            status: 'accepted',
          },
        },
      },
    });

    if (!homeownerJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!['assigned', 'in_progress'].includes(homeownerJob.status)) {
      return NextResponse.json(
        { error: 'Job is not in a state that can be completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { completionNotes, completionPhotos } = body;

    // Update job status to completed
    await prisma.homeownerWorkOrder.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: completionNotes
          ? `${homeownerJob.notes || ''}\n\nCompletion Notes: ${completionNotes}`.trim()
          : homeownerJob.notes,
        images: completionPhotos
          ? [...homeownerJob.images, ...completionPhotos]
          : homeownerJob.images,
      },
    });

    // Create escrow hold for 7 days
    const acceptedBid = homeownerJob.bids[0];
    if (acceptedBid) {
      const releaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      await prisma.jobGuaranteeHold.create({
        data: {
          jobId,
          contractorId: contractorProfile.id,
          customerId: homeownerJob.homeownerId,
          amount: acceptedBid.amount,
          status: 'held',
          releaseAt: releaseDate,
        },
      });
    }

    // Send notification to homeowner
    try {
      const homeowner = await prisma.homeowner.findUnique({
        where: { id: homeownerJob.homeownerId },
        include: { user: true },
      });

      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: contractorProfile.id },
      });

      if (homeowner?.user && contractor) {
        await MarketplaceNotifications.notifyJobCompleted({
          homeownerId: homeowner.user.id,
          jobId,
          jobTitle: homeownerJob.title,
          contractorName: contractor.displayName || contractor.businessName,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Job marked as complete. Homeowner has been notified for approval.',
    });
  } catch (error) {
    console.error('Error completing job:', error);
    return NextResponse.json(
      { error: 'Failed to complete job' },
      { status: 500 }
    );
  }
}

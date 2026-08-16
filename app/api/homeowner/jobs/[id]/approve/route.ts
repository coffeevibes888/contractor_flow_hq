import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';
import { stripe } from '@/lib/stripe';

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
    const { rating, review } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Use transaction to update escrow, create review, and update contractor stats
    await prisma.$transaction(async (tx) => {
      // Release escrow
      await tx.jobGuaranteeHold.update({
        where: { id: escrowHold.id },
        data: {
          status: 'released',
          releasedAt: new Date(),
        },
      });

      // Create review
      await tx.contractorReview.create({
        data: {
          contractorId: escrowHold.contractorId,
          customerId: homeowner.userId,
          jobId,
          overallRating: rating,
          qualityRating: rating,
          communicationRating: rating,
          timelinessRating: rating,
          valueRating: rating,
          comment: review || 'Great work!',
          verified: true,
          status: 'published',
        },
      });

      // Update contractor stats
      const contractor = await tx.contractorProfile.findUnique({
        where: { id: escrowHold.contractorId },
      });

      if (contractor) {
        const allReviews = await tx.contractorReview.findMany({
          where: { contractorId: escrowHold.contractorId },
        });
        
        const totalReviews = allReviews.length + 1;
        const totalRating = allReviews.reduce((sum, r) => sum + Number(r.overallRating), 0) + rating;
        const newAvgRating = totalRating / totalReviews;

        await tx.contractorProfile.update({
          where: { id: escrowHold.contractorId },
          data: {
            avgRating: newAvgRating,
            completedJobs: { increment: 1 },
          },
        });
      }
    });

    // Send notifications
    try {
      const contractor = await prisma.contractorProfile.findUnique({
        where: { id: escrowHold.contractorId },
        include: { user: true },
      });

      if (contractor?.user) {
        // Notify contractor of payment release
        await MarketplaceNotifications.notifyPaymentReleased({
          contractorId: contractor.user.id,
          jobId,
          jobTitle: workOrder.title,
          amount: Number(escrowHold.amount),
          rating,
        });

        // Notify contractor of review
        if (review) {
          await MarketplaceNotifications.notifyReviewReceived({
            contractorId: contractor.user.id,
            jobId,
            jobTitle: workOrder.title,
            rating,
            reviewText: review,
          });
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }

    // TODO: Transfer funds to contractor via Stripe
    // This would require Stripe Connect or Treasury
    // For now, we just mark as released in the database

    // TODO: Send notification to contractor

    return NextResponse.json({
      success: true,
      message: 'Payment released successfully',
    });
  } catch (error) {
    console.error('Error approving job:', error);
    return NextResponse.json(
      { error: 'Failed to approve job' },
      { status: 500 }
    );
  }
}

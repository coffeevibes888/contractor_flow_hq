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

    const milestoneId = params.id;

    // Get the milestone with all relations
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        escrow: {
          include: {
            contractorJob: {
              include: {
                contractor: {
                  select: { userId: true, businessName: true }
                },
                customer: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Verify contractor owns this job
    if (milestone.escrow.contractorJob.contractor.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if milestone is already completed
    if (milestone.status === 'completed') {
      return NextResponse.json(
        { error: 'Milestone already completed' },
        { status: 400 }
      );
    }

    // Check if milestone is in progress
    if (milestone.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Milestone must be in progress to complete' },
        { status: 400 }
      );
    }

    // Verify all required verifications are complete
    const verificationErrors: string[] = [];

    if (milestone.requireGPS && !milestone.gpsVerified) {
      verificationErrors.push('GPS verification required');
    }

    if (milestone.requirePhotos && milestone.photosUploaded < milestone.minPhotos) {
      verificationErrors.push(`At least ${milestone.minPhotos} photos required (${milestone.photosUploaded} uploaded)`);
    }

    if (milestone.requireSignature && !milestone.contractorSignature) {
      verificationErrors.push('Contractor signature required');
    }

    if (verificationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Verification requirements not met',
          details: verificationErrors
        },
        { status: 400 }
      );
    }

    // Update milestone status to pending_approval
    const updatedMilestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'pending_approval',
        completedAt: new Date()
      }
    });

    // Send notification to customer
    if (milestone.escrow.contractorJob.customerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: milestone.escrow.contractorJob.customerId,
            type: 'milestone_completed',
            title: 'Milestone Completed',
            message: `${milestone.escrow.contractorJob.contractor.businessName} has completed milestone "${milestone.title}". Please review and approve.`,
            actionUrl: `/customer/jobs/${milestone.escrow.contractorJobId}/milestones/${milestoneId}`
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      milestone: {
        id: updatedMilestone.id,
        status: updatedMilestone.status,
        completedAt: updatedMilestone.completedAt
      }
    });
  } catch (error) {
    console.error('Error completing milestone:', error);
    return NextResponse.json(
      { error: 'Failed to complete milestone' },
      { status: 500 }
    );
  }
}

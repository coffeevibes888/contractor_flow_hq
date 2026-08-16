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

    const { lat, lng, address, accuracy } = await req.json();
    const milestoneId = params.id;

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get the milestone
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        escrow: {
          include: {
            contractorJob: {
              include: {
                contractor: {
                  select: { userId: true }
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

    // Check if GPS verification is required
    if (!milestone.requireGPS) {
      return NextResponse.json(
        { error: 'GPS verification not required for this milestone' },
        { status: 400 }
      );
    }

    // Update milestone with GPS data
    const updatedMilestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: {
        gpsVerified: true,
        gpsLat: lat,
        gpsLng: lng,
        gpsAddress: address || null,
        gpsVerifiedAt: new Date()
      }
    });

    // Send notification to customer
    if (milestone.escrow.contractorJob.customerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: milestone.escrow.contractorJob.customerId,
            type: 'milestone_gps_verified',
            title: 'GPS Verification Complete',
            message: `The contractor has verified their location for milestone "${milestone.title}".`,
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
        gpsVerified: updatedMilestone.gpsVerified,
        gpsLat: updatedMilestone.gpsLat,
        gpsLng: updatedMilestone.gpsLng,
        gpsAddress: updatedMilestone.gpsAddress,
        gpsVerifiedAt: updatedMilestone.gpsVerifiedAt
      }
    });
  } catch (error) {
    console.error('Error verifying GPS:', error);
    return NextResponse.json(
      { error: 'Failed to verify GPS' },
      { status: 500 }
    );
  }
}

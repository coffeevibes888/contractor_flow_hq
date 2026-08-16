import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

const PLATFORM_FEE_FLAT = 1.00; // $1 flat fee per transaction

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestones } = await req.json();
    const jobId = params.id;

    // Validate milestones
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return NextResponse.json(
        { error: 'At least one milestone is required' },
        { status: 400 }
      );
    }

    // Validate total percentage
    const totalPercentage = milestones.reduce((sum: number, m: any) => sum + m.percentage, 0);
    if (totalPercentage !== 100) {
      return NextResponse.json(
        { error: 'Milestone percentages must total 100%' },
        { status: 400 }
      );
    }

    // Get the contractor job
    const contractorJob = await prisma.contractorJob.findUnique({
      where: { id: jobId },
      include: {
        contractor: {
          select: {
            id: true,
            businessName: true,
            displayName: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!contractorJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify ownership (customer owns the job)
    if (contractorJob.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if escrow already exists
    const existingEscrow = await prisma.jobEscrow.findUnique({
      where: { contractorJobId: jobId }
    });

    if (existingEscrow) {
      return NextResponse.json(
        { error: 'Escrow already exists for this job' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const jobAmount = Number(contractorJob.estimatedCost || 0);
    const platformFee = PLATFORM_FEE_FLAT; // $1 flat fee
    const totalAmount = jobAmount + platformFee;

    // Create escrow with milestones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create escrow
      const escrow = await tx.jobEscrow.create({
        data: {
          contractorJobId: jobId,
          totalAmount,
          platformFee,
          contractorAmount: jobAmount,
          status: 'pending'
        }
      });

      // Create milestones
      const createdMilestones = await Promise.all(
        milestones.map((milestone: any, index: number) =>
          tx.jobMilestone.create({
            data: {
              escrowId: escrow.id,
              order: index + 1,
              title: milestone.title,
              description: milestone.description || null,
              amount: (jobAmount * milestone.percentage) / 100,
              percentage: milestone.percentage,
              requireGPS: milestone.requireGPS || false,
              requirePhotos: milestone.requirePhotos || false,
              minPhotos: milestone.minPhotos || 0,
              requireSignature: milestone.requireSignature || false,
              status: 'pending'
            }
          })
        )
      );

      return { escrow, milestones: createdMilestones };
    });

    return NextResponse.json({
      success: true,
      escrow: {
        id: result.escrow.id,
        totalAmount: Number(result.escrow.totalAmount),
        platformFee: Number(result.escrow.platformFee),
        contractorAmount: Number(result.escrow.contractorAmount),
        status: result.escrow.status
      },
      milestones: result.milestones.map(m => ({
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        percentage: m.percentage,
        requireGPS: m.requireGPS,
        requirePhotos: m.requirePhotos,
        minPhotos: m.minPhotos,
        requireSignature: m.requireSignature
      }))
    });
  } catch (error) {
    console.error('Error creating escrow:', error);
    return NextResponse.json(
      { error: 'Failed to create escrow' },
      { status: 500 }
    );
  }
}

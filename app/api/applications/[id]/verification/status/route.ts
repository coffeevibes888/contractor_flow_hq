import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { VerificationService } from '@/lib/services/verification.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;

    // Verify application exists
    const application = await db.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        unit: {
          include: {
            property: {
              include: {
                landlord: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user is the applicant or the landlord
    const isApplicant = application.applicantId === session.user.id;
    const isLandlord = application.unit?.property?.landlord?.ownerUserId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isApplicant && !isLandlord && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this verification status' },
        { status: 403 }
      );
    }

    // Get verification status
    const status = await VerificationService.getVerificationStatus(applicationId);

    // Calculate estimated processing time
    let estimatedProcessingTime: string | undefined;
    
    const pendingDocs = await db.verificationDocument.count({
      where: {
        applicationId,
        verificationStatus: { in: ['pending', 'processing'] },
      },
    });

    if (pendingDocs > 0) {
      estimatedProcessingTime = `${pendingDocs * 2}-${pendingDocs * 5} minutes`;
    }

    return NextResponse.json({
      identityStatus: status.identityStatus,
      employmentStatus: status.employmentStatus,
      overallStatus: status.overallStatus,
      canSubmit: status.canSubmit,
      requiredDocuments: status.requiredDocuments,
      monthlyIncome: status.monthlyIncome,
      identityVerifiedAt: status.identityVerifiedAt,
      employmentVerifiedAt: status.employmentVerifiedAt,
      completedAt: status.completedAt,
      estimatedProcessingTime,
    });
  } catch (error: any) {
    console.error('Get verification status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve verification status' },
      { status: 500 }
    );
  }
}

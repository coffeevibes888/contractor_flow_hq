import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !['admin', 'super_admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { verificationId, field, action, notes } = body;

    if (!verificationId || !field || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const verification = await prisma.contractorVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    };

    const now = new Date();

    // Update specific field status
    switch (field) {
      case 'identity':
        updateData.identityStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'approve') {
          updateData.identityVerifiedAt = now;
        } else {
          updateData.identityRejectionReason = notes;
        }
        break;

      case 'license':
        updateData.licenseStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'approve') {
          updateData.licenseVerifiedAt = now;
        } else {
          updateData.licenseRejectionReason = notes;
        }
        break;

      case 'insurance':
        updateData.insuranceStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'approve') {
          updateData.insuranceVerifiedAt = now;
        } else {
          updateData.insuranceRejectionReason = notes;
        }
        break;

      case 'background':
        updateData.backgroundCheckStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'approve') {
          updateData.backgroundCheckDate = now;
          updateData.backgroundCheckResult = 'clear';
        } else {
          updateData.backgroundCheckRejectionReason = notes;
        }
        break;

      case 'bank':
        updateData.bankAccountStatus = action === 'approve' ? 'verified' : 'rejected';
        if (action === 'approve') {
          updateData.bankAccountVerified = true;
          updateData.bankAccountVerifiedAt = now;
        }
        break;
    }

    // Update verification
    const updatedVerification = await prisma.contractorVerification.update({
      where: { id: verificationId },
      data: updateData,
    });

    // Check if all required fields are verified
    const allVerified =
      updatedVerification.identityStatus === 'verified' &&
      updatedVerification.licenseStatus === 'verified' &&
      updatedVerification.insuranceStatus === 'verified' &&
      updatedVerification.bankAccountStatus === 'verified';

    // Update overall status and badges
    if (allVerified) {
      const badges = ['verified'];
      if (updatedVerification.licenseStatus === 'verified') badges.push('licensed');
      if (updatedVerification.insuranceStatus === 'verified') badges.push('insured');
      if (updatedVerification.backgroundCheckStatus === 'verified') {
        badges.push('background_checked');
      }

      await prisma.contractorVerification.update({
        where: { id: verificationId },
        data: {
          verificationStatus: 'verified',
          verifiedAt: now,
          badges,
        },
      });
    }

    // Send notification to contractor
    try {
      await prisma.notification.create({
        data: {
          userId: verification.contractorId,
          type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
          title:
            action === 'approve'
              ? `${field} Verification Approved`
              : `${field} Verification Rejected`,
          message:
            action === 'approve'
              ? `Your ${field} verification has been approved!`
              : `Your ${field} verification was rejected. ${notes || 'Please resubmit.'}`,
          actionUrl: '/contractor/verification',
        },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: `Verification ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error reviewing verification:', error);
    return NextResponse.json(
      { error: 'Failed to review verification' },
      { status: 500 }
    );
  }
}

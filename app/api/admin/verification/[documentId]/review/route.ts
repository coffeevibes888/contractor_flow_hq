import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { VerificationService } from '@/lib/services/verification.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
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

    // Check if user is admin or landlord
    if (session.user.role !== 'admin' && session.user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Forbidden: Only landlords and admins can review documents' },
        { status: 403 }
      );
    }

    const { documentId } = await params;

    // Get document
    const document = await db.verificationDocument.findUnique({
      where: { id: documentId },
      include: {
        application: {
          include: {
            applicant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        landlord: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this document
    if (session.user.role === 'landlord') {
      const landlord = await db.landlord.findFirst({
        where: { ownerUserId: session.user.id },
      });

      if (!landlord || landlord.id !== document.landlordId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this document' },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { action, reason, notes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Update document based on action
    if (action === 'approve') {
      await db.verificationDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: 'verified',
          verificationMethod: 'manual',
          verificationCompletedAt: new Date(),
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNotes: notes || 'Manually approved by landlord',
          rejectionReason: null, // Clear any previous rejection reason
        },
      });

      // Update application verification status
      await VerificationService.updateVerificationStatus(document.applicationId);

      // TODO: Send notification to tenant (Task 23)

      return NextResponse.json({
        success: true,
        verificationStatus: 'verified',
        message: 'Document approved successfully',
      });
    } else {
      // Reject
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      await db.verificationDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: 'rejected',
          rejectionReason: reason,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNotes: notes || null,
        },
      });

      // Update application verification status
      await VerificationService.updateVerificationStatus(document.applicationId);

      // TODO: Send notification to tenant (Task 23)

      return NextResponse.json({
        success: true,
        verificationStatus: 'rejected',
        message: 'Document rejected successfully',
      });
    }
  } catch (error: any) {
    console.error('Review document error:', error);
    return NextResponse.json(
      { error: 'Failed to review document' },
      { status: 500 }
    );
  }
}

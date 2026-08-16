import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  rejectApplication,
  ApprovalError,
  ApprovalErrorCodes,
} from '@/lib/services/application-approval.service';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/applications/[id]/reject
 * Reject a rental application
 * 
 * Request body:
 * - reason?: string (optional) - Reason for rejection
 * 
 * Returns:
 * - success: boolean
 * - application: { id, status, fullName, email }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;

    // Get landlord for the current user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json(
        { success: false, message: 'Landlord account not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    // Reject the application
    const result = await rejectApplication({
      applicationId,
      reason,
      landlordId: landlord.id,
    });

    // Revalidate relevant paths
    revalidatePath('/admin/applications');
    revalidatePath(`/admin/applications/${applicationId}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Application rejection error:', error);

    if (error instanceof ApprovalError) {
      const statusCode = error.code === ApprovalErrorCodes.APPLICATION_NOT_FOUND ? 404 : 400;
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to reject application' },
      { status: 500 }
    );
  }
}

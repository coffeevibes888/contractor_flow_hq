import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  approveApplication,
  ApprovalError,
  ApprovalErrorCodes,
  getTemplateForApproval,
} from '@/lib/services/application-approval.service';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/applications/[id]/approve
 * Approve a rental application and auto-generate a lease
 * 
 * Request body:
 * - unitId: string (required) - The unit to assign to the tenant
 * - leaseStartDate: string (required) - ISO date string
 * - leaseEndDate?: string (optional) - ISO date string, null for month-to-month
 * - rentAmount?: number (optional) - Override unit rent amount
 * - billingDayOfMonth?: number (optional) - Day of month rent is due (1-28)
 * 
 * Returns:
 * - success: boolean
 * - application: { id, status, fullName, email }
 * - lease: { id, status, startDate, endDate, rentAmount }
 * - signingUrl: string - URL for tenant to sign the lease
 * 
 * Error codes:
 * - NO_LEASE_TEMPLATE: Property has no lease template configured
 * - UNIT_UNAVAILABLE: Unit is not available or already has a lease
 * - APPLICATION_NOT_FOUND: Application doesn't exist
 * - APPLICATION_NOT_PENDING: Application is not in pending status
 * - VALIDATION_ERROR: Invalid input or unauthorized
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
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { unitId, leaseStartDate, leaseEndDate, rentAmount, billingDayOfMonth } = body;

    // Validate required fields
    if (!unitId) {
      return NextResponse.json(
        { success: false, message: 'Unit ID is required', code: ApprovalErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    if (!leaseStartDate) {
      return NextResponse.json(
        { success: false, message: 'Lease start date is required', code: ApprovalErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(leaseStartDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid lease start date', code: ApprovalErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    let endDate: Date | null = null;
    if (leaseEndDate) {
      endDate = new Date(leaseEndDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Invalid lease end date', code: ApprovalErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        );
      }
    }

    // Approve the application
    const result = await approveApplication({
      applicationId,
      unitId,
      leaseStartDate: startDate,
      leaseEndDate: endDate,
      rentAmount: rentAmount ? Number(rentAmount) : undefined,
      billingDayOfMonth: billingDayOfMonth ? Number(billingDayOfMonth) : undefined,
      landlordId: landlord.id,
    });

    // Revalidate relevant paths
    revalidatePath('/admin/applications');
    revalidatePath('/admin/leases');
    revalidatePath(`/admin/applications/${applicationId}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Application approval error:', error);

    if (error instanceof ApprovalError) {
      const statusCode = getStatusCodeForError(error.code);
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
      { success: false, message: 'Failed to approve application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/applications/[id]/approve
 * Get information about what template would be used for approval
 * Useful for showing in the approval confirmation modal
 */
export async function GET(
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

    // Get the application with property info
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        unit: {
          include: {
            property: {
              select: { id: true, name: true, landlordId: true },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    const property = application.unit?.property;
    if (!property || property.landlordId !== landlord.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get template info
    const templateInfo = await getTemplateForApproval(property.id, landlord.id);

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        fullName: application.fullName,
        email: application.email,
      },
      property: {
        id: property.id,
        name: property.name,
      },
      templateInfo,
    });
  } catch (error) {
    console.error('Error getting approval info:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get approval info' },
      { status: 500 }
    );
  }
}

function getStatusCodeForError(code: string): number {
  switch (code) {
    case ApprovalErrorCodes.APPLICATION_NOT_FOUND:
    case ApprovalErrorCodes.PROPERTY_NOT_FOUND:
    case ApprovalErrorCodes.TENANT_NOT_FOUND:
      return 404;
    case ApprovalErrorCodes.UNIT_UNAVAILABLE:
    case ApprovalErrorCodes.APPLICATION_NOT_PENDING:
    case ApprovalErrorCodes.NO_LEASE_TEMPLATE:
      return 400;
    case ApprovalErrorCodes.VALIDATION_ERROR:
      return 400;
    case ApprovalErrorCodes.LEASE_GENERATION_FAILED:
      return 500;
    default:
      return 500;
  }
}

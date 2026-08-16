import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { jobGuaranteeService } from '@/lib/services/job-guarantee';
import { prisma } from '@/db/prisma';

/**
 * POST /api/contractor/guarantee/dispute
 * File a dispute for a held job
 * 
 * Requirements: 6.2, 6.3, 6.4
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      holdId,
      landlordId,
      type,
      category,
      title,
      description,
      desiredResolution,
      evidence,
    } = body;

    // Validate required fields
    if (!holdId || !landlordId || !type || !category || !title || !description) {
      return NextResponse.json(
        {
          error: 'Missing required fields: holdId, landlordId, type, category, title, description',
        },
        { status: 400 }
      );
    }

    // Get the hold to verify it exists and get contractor/customer info
    const hold = await jobGuaranteeService.getHold(holdId);
    
    if (!hold) {
      return NextResponse.json(
        { error: 'Hold not found' },
        { status: 404 }
      );
    }

    // Verify user is the customer
    if (hold.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the customer can file a dispute' },
        { status: 403 }
      );
    }

    // Validate dispute type and category
    const validTypes = ['payment', 'quality', 'timeline', 'scope', 'communication', 'other'];
    const validCategories = [
      'work_not_completed',
      'poor_quality',
      'overcharge',
      'damage',
      'no_show',
      'contract_breach',
      'other',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Initiate the dispute
    const result = await jobGuaranteeService.initiateDispute({
      holdId,
      customerId: session.user.id,
      landlordId,
      type,
      category,
      title,
      description,
      desiredResolution: desiredResolution || 'Refund',
      evidence: evidence || [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error filing dispute:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to file dispute' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contractor/guarantee/dispute
 * Resolve a dispute
 * 
 * Requirements: 6.4, 6.5, 6.6
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can resolve disputes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { disputeId, resolution, refundAmount, contractorStripeAccountId } = body;

    // Validate required fields
    if (!disputeId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: disputeId, resolution' },
        { status: 400 }
      );
    }

    // Validate resolution type
    const validResolutions = ['customer', 'contractor', 'split'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}` },
        { status: 400 }
      );
    }

    // Resolve the dispute
    await jobGuaranteeService.resolveDispute(
      disputeId,
      resolution,
      refundAmount,
      contractorStripeAccountId
    );

    return NextResponse.json({ success: true, disputeId });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}

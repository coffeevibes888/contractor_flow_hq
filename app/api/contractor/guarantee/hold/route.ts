import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { jobGuaranteeService } from '@/lib/services/job-guarantee';

/**
 * POST /api/contractor/guarantee/hold
 * Create a fund hold for a completed job
 * 
 * Requirements: 6.1
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
    const { jobId, contractorId, customerId, amount, stripePaymentIntentId } = body;

    // Validate required fields
    if (!jobId || !contractorId || !customerId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, contractorId, customerId, amount' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Create the hold
    const result = await jobGuaranteeService.holdFunds({
      jobId,
      contractorId,
      customerId,
      amount,
      stripePaymentIntentId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating fund hold:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create fund hold' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/guarantee/hold?holdId=xxx
 * Get hold details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const holdId = searchParams.get('holdId');

    if (!holdId) {
      return NextResponse.json(
        { error: 'Missing holdId parameter' },
        { status: 400 }
      );
    }

    const hold = await jobGuaranteeService.getHold(holdId);

    if (!hold) {
      return NextResponse.json(
        { error: 'Hold not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: hold.id,
      jobId: hold.jobId,
      contractorId: hold.contractorId,
      customerId: hold.customerId,
      amount: hold.amount.toNumber(),
      status: hold.status,
      heldAt: hold.heldAt,
      releaseAt: hold.releaseAt,
      releasedAt: hold.releasedAt,
      disputeId: hold.disputeId,
      stripeTransferId: hold.stripeTransferId,
    });
  } catch (error) {
    console.error('Error fetching hold:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hold' },
      { status: 500 }
    );
  }
}

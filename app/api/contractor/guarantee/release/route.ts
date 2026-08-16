import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { jobGuaranteeService } from '@/lib/services/job-guarantee';
import { prisma } from '@/db/prisma';

/**
 * POST /api/contractor/guarantee/release
 * Release held funds to contractor
 * 
 * Requirements: 6.1, 6.5
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
    const { holdId, contractorStripeAccountId } = body;

    // Validate required fields
    if (!holdId) {
      return NextResponse.json(
        { error: 'Missing required field: holdId' },
        { status: 400 }
      );
    }

    // Get the hold to verify ownership/permissions
    const hold = await jobGuaranteeService.getHold(holdId);
    
    if (!hold) {
      return NextResponse.json(
        { error: 'Hold not found' },
        { status: 404 }
      );
    }

    // Check if user has permission (admin or contractor)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';
    const isContractor = hold.contractorId === session.user.id;

    if (!isAdmin && !isContractor) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to release this hold' },
        { status: 403 }
      );
    }

    // Release the funds
    const result = await jobGuaranteeService.releaseFunds({
      holdId,
      contractorStripeAccountId: contractorStripeAccountId || '',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error releasing funds:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to release funds' },
      { status: 500 }
    );
  }
}

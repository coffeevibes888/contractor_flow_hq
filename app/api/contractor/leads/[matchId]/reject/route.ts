import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { eventBus } from '@/lib/event-system';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    const { matchId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Get lead match
    const leadMatch = await prisma.contractorLeadMatch.findFirst({
      where: {
        id: matchId,
        contractorId: contractor.id,
      },
    });

    if (!leadMatch) {
      return NextResponse.json({ error: 'Lead match not found' }, { status: 404 });
    }

    if (leadMatch.status !== 'pending') {
      return NextResponse.json(
        { error: 'Lead has already been processed' },
        { status: 400 }
      );
    }

    // Update lead match status
    await prisma.contractorLeadMatch.update({
      where: { id: matchId },
      data: {
        status: 'lost',
      },
    });

    await eventBus.emit('contractor.lead.rejected', {
      matchId,
      leadId: leadMatch.leadId,
      contractorId: contractor.id,
      contractorUserId: contractor.userId,
      rejectedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Lead rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting lead:', error);
    return NextResponse.json(
      { error: 'Failed to reject lead' },
      { status: 500 }
    );
  }
}

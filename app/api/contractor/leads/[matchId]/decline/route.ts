import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

/**
 * Decline a lead (request refund if applicable)
 * POST /api/contractor/leads/[matchId]/decline
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    // Get the match and verify ownership
    const match = await prisma.contractorLeadMatch.findUnique({
      where: { id: matchId },
      include: { contractor: true, lead: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (match.contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already responded (can't decline after responding)
    if (match.respondedAt) {
      return NextResponse.json({ error: 'Cannot decline after responding' }, { status: 400 });
    }

    // Update the match
    await prisma.contractorLeadMatch.update({
      where: { id: matchId },
      data: {
        status: 'lost',
        refundRequested: true,
        refundReason: reason || 'Declined by contractor',
      },
    });

    // Auto-approve refund if lead wasn't charged yet
    // (In a real system, you might have more complex refund logic)
    if (match.pricingModel === 'per_lead' && !match.respondedAt) {
      await prisma.contractorLeadMatch.update({
        where: { id: matchId },
        data: {
          refundApproved: true,
          refundAmount: match.leadCost,
          refundedAt: new Date(),
        },
      });
    }

    await eventBus.emit('contractor.lead.declined', {
      matchId,
      leadId: match.leadId,
      contractorId: match.contractorId,
      contractorUserId: match.contractor.userId,
      reason: reason || null,
      declinedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Lead declined',
    });
  } catch (error) {
    console.error('Error declining lead:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to decline lead' },
      { status: 500 }
    );
  }
}
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

/**
 * Mark a lead as viewed
 * POST /api/contractor/leads/[matchId]/view
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

    // Get the match and verify ownership
    const match = await prisma.contractorLeadMatch.findUnique({
      where: { id: matchId },
      include: { contractor: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (match.contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only update if not already viewed
    if (!match.viewedAt) {
      await prisma.contractorLeadMatch.update({
        where: { id: matchId },
        data: {
          status: 'viewed',
          viewedAt: new Date(),
        },
      });

      await eventBus.emit('contractor.lead.viewed', {
        matchId,
        leadId: match.leadId,
        contractorId: match.contractorId,
        contractorUserId: match.contractor.userId,
        viewedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking lead as viewed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark as viewed' },
      { status: 500 }
    );
  }
}

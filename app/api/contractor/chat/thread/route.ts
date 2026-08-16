import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get existing chat thread with a contractor
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId');

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    // Get contractor's user ID — try ContractorProfile first, then Contractor
    let contractorUserId: string | null = null;

    const profile = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });

    if (profile?.userId) {
      contractorUserId = profile.userId;
    } else {
      const contractor = await prisma.contractor.findUnique({
        where: { id: contractorId },
        select: { userId: true },
      });
      contractorUserId = contractor?.userId || null;
    }

    if (!contractorUserId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Find existing DM thread between these two users
    const existingThread = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: contractorUserId } } },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (existingThread) {
      // Mark as read
      await prisma.threadParticipant.updateMany({
        where: { threadId: existingThread.id, userId: session.user.id },
        data: { lastReadAt: new Date() },
      });

      return NextResponse.json({
        threadId: existingThread.id,
        messages: existingThread.messages,
      });
    }

    return NextResponse.json({ threadId: null, messages: [] });
  } catch (error) {
    console.error('Error getting thread:', error);
    return NextResponse.json({ error: 'Failed to get thread' }, { status: 500 });
  }
}

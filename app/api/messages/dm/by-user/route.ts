import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * POST /api/messages/dm/by-user
 * Creates or opens a DM thread between the current user and a target user
 * identified by their userId directly (used by the tenant compose form).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { toUserId, message } = body ?? {};

    if (!toUserId || typeof toUserId !== 'string') {
      return NextResponse.json({ error: 'toUserId is required.' }, { status: 400 });
    }

    const currentUserId = session.user.id as string;

    if (toUserId === currentUserId) {
      return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });
    }

    // Make sure the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
    }

    // Find existing 1:1 DM thread between both users
    const existingThread = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { userId: currentUserId, isDeleted: false } } },
          { participants: { some: { userId: toUserId, isDeleted: false } } },
        ],
      },
      select: { id: true },
    });

    let threadId: string;

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const thread = await prisma.thread.create({
        data: {
          type: 'dm',
          status: 'open',
          createdByUserId: currentUserId,
          participants: {
            create: [
              { userId: currentUserId },
              { userId: toUserId },
            ],
          },
        },
        select: { id: true },
      });
      threadId = thread.id;
    }

    // Optionally send an opening message
    if (message && typeof message === 'string' && message.trim()) {
      await prisma.message.create({
        data: {
          threadId,
          senderUserId: currentUserId,
          senderName: session.user.name ?? null,
          senderEmail: session.user.email ?? null,
          content: message.trim(),
          role: 'user',
        },
      });

      await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      await prisma.threadParticipant.updateMany({
        where: { threadId, userId: currentUserId },
        data: { lastReadAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, threadId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[DM by-user] Error:', error);
    return NextResponse.json({ error: 'Failed to create direct message.' }, { status: 500 });
  }
}

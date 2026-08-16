import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { identifier, message } = body ?? {};

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required.' },
        { status: 400 }
      );
    }

    const currentUserId = session.user.id as string;

    const targetUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { email: identifier },
              { phoneNumber: identifier },
              { name: identifier },
            ],
          },
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No user found with that email, phone number, or name.' },
        { status: 404 }
      );
    }

    const existingThread = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        participants: {
          every: {
            userId: { in: [currentUserId, targetUser.id] },
          },
        },
      },
      include: { participants: true },
    });

    let threadId: string;

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const thread = await prisma.thread.create({
        data: {
          type: 'dm',
          status: 'open',
          participants: {
            create: [
              { userId: currentUserId },
              { userId: targetUser.id },
            ],
          },
        },
      });
      threadId = thread.id;
    }

    let messageId: string | null = null;

    if (message && typeof message === 'string' && message.trim()) {
      const createdMessage = await prisma.message.create({
        data: {
          threadId,
          senderUserId: currentUserId,
          senderName: session.user.name ?? null,
          senderEmail: session.user.email ?? null,
          content: message.trim(),
          role: 'user',
        },
      });

      messageId = createdMessage.id;

      await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      await prisma.threadParticipant.updateMany({
        where: { threadId, userId: currentUserId },
        data: { lastReadAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      threadId,
      messageId,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating DM:', error);
    return NextResponse.json(
      { error: 'Failed to create direct message.' },
      { status: 500 }
    );
  }
}

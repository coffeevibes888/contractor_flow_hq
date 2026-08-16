import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    const { threadId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        participants: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const userId = session.user.id as string;
    const isAdmin = session.user.role === 'admin' || session.user.role === 'superAdmin';

    if (!isAdmin) {
      const isParticipant = thread.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Mark this thread as read for the current user when they view it
    await prisma.threadParticipant.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    const { threadId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: { participants: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const userId = session.user.id as string;
    const isAdmin = session.user.role === 'admin' || session.user.role === 'superAdmin';

    if (!isAdmin) {
      const isParticipant = thread.participants.some((p) => p.userId === userId);
      if (!isParticipant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        senderName: session.user.name ?? null,
        senderEmail: session.user.email ?? null,
        content,
        role: isAdmin ? 'admin' : 'user',
      },
    });

    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    await prisma.threadParticipant.updateMany({
      where: { threadId: thread.id, userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error posting message:', error);
    return NextResponse.json(
      { error: 'Failed to post message' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const threads = await prisma.thread.findMany({
      where: {
        participants: {
          some: { userId: payload.userId, isDeleted: false },
        },
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        subject: true,
        status: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            senderName: true,
            createdAt: true,
            senderUserId: true,
          },
        },
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({
      threads: threads.map((t) => {
        const lastMessage = t.messages[0] ?? null;
        const otherParticipants = t.participants.filter((p) => p.userId !== payload.userId);
        const myParticipant = t.participants.find((p) => p.userId === payload.userId);
        const isUnread = lastMessage && myParticipant?.lastReadAt
          ? new Date(lastMessage.createdAt) > new Date(myParticipant.lastReadAt)
          : !!lastMessage && !myParticipant?.lastReadAt;

        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          updatedAt: t.updatedAt.toISOString(),
          isUnread,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content?.substring(0, 100) ?? '',
                senderName: lastMessage.senderName ?? 'Unknown',
                createdAt: lastMessage.createdAt.toISOString(),
                isOwn: lastMessage.senderUserId === payload.userId,
              }
            : null,
          participants: otherParticipants.map((p) => ({
            name: p.user.name ?? 'Unknown',
            email: p.user.email ?? '',
          })),
        };
      }),
    });
  } catch (error) {
    console.error('[mobile/pm/messages]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a message in a thread
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { threadId, content } = body;

    if (!threadId || !content) {
      return NextResponse.json({ error: 'threadId and content required' }, { status: 400 });
    }

    // Verify user is participant
    const participant = await prisma.threadParticipant.findFirst({
      where: { threadId, userId: payload.userId },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true },
    });

    const message = await prisma.message.create({
      data: {
        threadId,
        senderUserId: payload.userId,
        senderName: user?.name ?? undefined,
        senderEmail: user?.email ?? undefined,
        content,
        role: 'user',
      },
    });

    // Update thread timestamp and mark as read for sender
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    await prisma.threadParticipant.updateMany({
      where: { threadId, userId: payload.userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ success: true, message: { id: message.id } });
  } catch (error) {
    console.error('[mobile/pm/messages POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

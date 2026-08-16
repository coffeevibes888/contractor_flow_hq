import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

// GET - List tenant's message threads
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const threads = await prisma.thread.findMany({
      where: {
        participants: { some: { userId: payload.userId, isDeleted: false } },
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
          select: { content: true, senderName: true, createdAt: true, senderUserId: true },
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
        const lastMsg = t.messages[0] ?? null;
        const others = t.participants.filter((p) => p.userId !== payload.userId);
        const me = t.participants.find((p) => p.userId === payload.userId);
        const isUnread = lastMsg && me?.lastReadAt
          ? new Date(lastMsg.createdAt) > new Date(me.lastReadAt)
          : !!lastMsg && !me?.lastReadAt;

        return {
          id: t.id,
          subject: t.subject,
          updatedAt: t.updatedAt.toISOString(),
          isUnread,
          lastMessage: lastMsg ? {
            content: lastMsg.content?.substring(0, 100) ?? '',
            senderName: lastMsg.senderName ?? 'Unknown',
            createdAt: lastMsg.createdAt.toISOString(),
            isOwn: lastMsg.senderUserId === payload.userId,
          } : null,
          participants: others.map((p) => ({ name: p.user.name ?? 'Unknown', email: p.user.email ?? '' })),
        };
      }),
    });
  } catch (error) {
    console.error('[mobile/tenant/messages GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { threadId, content } = await req.json();
    if (!threadId || !content) return NextResponse.json({ error: 'threadId and content required' }, { status: 400 });

    const participant = await prisma.threadParticipant.findFirst({
      where: { threadId, userId: payload.userId },
    });
    if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true },
    });

    await prisma.message.create({
      data: {
        threadId,
        senderUserId: payload.userId,
        senderName: user?.name ?? undefined,
        senderEmail: user?.email ?? undefined,
        content,
        role: 'user',
      },
    });

    await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    await prisma.threadParticipant.updateMany({
      where: { threadId, userId: payload.userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/tenant/messages POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

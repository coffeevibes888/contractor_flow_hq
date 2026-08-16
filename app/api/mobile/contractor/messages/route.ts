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
        participants: { some: { userId: payload.userId, isDeleted: false } },
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true, subject: true, updatedAt: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, senderName: true, createdAt: true, senderUserId: true } },
        participants: { select: { userId: true, lastReadAt: true, user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      threads: threads.map((t) => {
        const last = t.messages[0];
        const me = t.participants.find((p) => p.userId === payload.userId);
        const others = t.participants.filter((p) => p.userId !== payload.userId);
        const isUnread = last && me?.lastReadAt ? new Date(last.createdAt) > new Date(me.lastReadAt) : !!last && !me?.lastReadAt;
        return {
          id: t.id, subject: t.subject, updatedAt: t.updatedAt.toISOString(), isUnread,
          lastMessage: last ? { content: last.content?.substring(0, 100) ?? '', senderName: last.senderName ?? '', createdAt: last.createdAt.toISOString(), isOwn: last.senderUserId === payload.userId } : null,
          participants: others.map((p) => ({ name: p.user.name ?? 'Unknown' })),
        };
      }),
    });
  } catch (error) {
    console.error('[mobile/contractor/messages]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { threadId, content } = await req.json();
    if (!threadId || !content) return NextResponse.json({ error: 'threadId and content required' }, { status: 400 });

    const participant = await prisma.threadParticipant.findFirst({ where: { threadId, userId: payload.userId } });
    if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } });
    await prisma.message.create({ data: { threadId, senderUserId: payload.userId, senderName: user?.name ?? undefined, senderEmail: user?.email ?? undefined, content, role: 'user' } });
    await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    await prisma.threadParticipant.updateMany({ where: { threadId, userId: payload.userId }, data: { lastReadAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/contractor/messages POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

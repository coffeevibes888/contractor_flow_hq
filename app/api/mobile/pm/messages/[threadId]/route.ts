import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { threadId } = params;
    const participant = await prisma.threadParticipant.findFirst({
      where: { threadId, userId: payload.userId },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        subject: true,
        status: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            senderUserId: true,
            senderName: true,
            role: true,
            createdAt: true,
          },
        },
        participants: {
          select: {
            userId: true,
            user: { select: { name: true, image: true, email: true } },
          },
        },
      },
    });
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    await prisma.threadParticipant.updateMany({
      where: { threadId, userId: payload.userId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({
      thread: {
        id: thread.id,
        subject: thread.subject,
        status: thread.status,
        participants: thread.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name ?? 'Unknown',
          email: p.user.email ?? '',
          image: p.user.image ?? null,
          isMe: p.userId === payload.userId,
        })),
      },
      messages: thread.messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderName: m.senderName ?? 'Unknown',
        senderUserId: m.senderUserId,
        isOwn: m.senderUserId === payload.userId,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[mobile/pm/messages/[threadId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

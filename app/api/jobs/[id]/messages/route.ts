import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: jobId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    // Verify user is participant in thread
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      messages: thread.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderUserId: msg.senderUserId,
        senderName: msg.senderName,
        senderImage: msg.senderEmail,
        createdAt: msg.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: jobId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, content } = body;

    if (!threadId || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'Thread ID and content required' },
        { status: 400 }
      );
    }

    // Verify user is participant in thread
    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId,
        senderUserId: session.user.id,
        senderName: session.user.name || 'User',
        senderEmail: session.user.email || '',
        content: content.trim(),
        role: 'user',
      },
    });

    // Update thread updated timestamp
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // TODO: Send notification to other participants
    // TODO: Broadcast via WebSocket

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        senderUserId: message.senderUserId,
        senderName: message.senderName,
        senderImage: message.senderEmail,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

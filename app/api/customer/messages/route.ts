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
    const { contractorUserId, message, subject, threadId: existingThreadId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // If replying to an existing thread, use that directly
    if (existingThreadId) {
      // Verify the user is a participant in this thread
      const participant = await prisma.threadParticipant.findFirst({
        where: {
          threadId: existingThreadId,
          userId: session.user.id,
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: 'You are not a participant in this thread' },
          { status: 403 }
        );
      }

      const newMessage = await prisma.message.create({
        data: {
          threadId: existingThreadId,
          senderUserId: session.user.id,
          senderName: session.user.name || undefined,
          senderEmail: session.user.email || undefined,
          content: message,
          role: 'user',
        },
      });

      await prisma.thread.update({
        where: { id: existingThreadId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: newMessage,
        threadId: existingThreadId,
      });
    }

    // Starting a new conversation requires contractorUserId
    if (!contractorUserId) {
      return NextResponse.json(
        { error: 'Contractor user ID is required for new conversations' },
        { status: 400 }
      );
    }

    // Check if a thread already exists between these users
    let thread = await prisma.thread.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [session.user.id, contractorUserId]
            }
          }
        }
      },
      include: {
        participants: true
      }
    });

    // If no thread exists, create one
    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          subject: subject || 'New Conversation',
          participants: {
            create: [
              { userId: session.user.id },
              { userId: contractorUserId }
            ]
          }
        },
        include: {
          participants: true
        }
      });
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: session.user.id,
        senderName: session.user.name || undefined,
        senderEmail: session.user.email || undefined,
        content: message,
        role: 'user',
      },
    });

    // Update thread's updatedAt
    await prisma.thread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
      threadId: thread.id,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

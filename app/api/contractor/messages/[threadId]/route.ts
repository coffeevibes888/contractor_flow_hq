import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { UnifiedMessageService } from '@/lib/services/unified-message-service';
import { getContractorIdForUser } from '@/lib/contractor-profile';

/**
 * GET /api/contractor/messages/[threadId]
 * Get a specific thread with all messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    const contractorId = await getContractorIdForUser(session.user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Not a contractor' }, { status: 403 });
    }

    const { threadId } = await params;

    // Try to get thread from UnifiedMessageService first
    let thread = await UnifiedMessageService.getThread(threadId, session.user.id);

    // If not found, try to get DM thread directly
    if (!thread) {
      const dmThread = await prisma.thread.findFirst({
        where: {
          id: threadId,
          type: 'dm',
          participants: {
            some: { userId: session.user.id },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
            },
          },
        },
      });

      if (dmThread) {
        // Mark as read
        await prisma.threadParticipant.updateMany({
          where: {
            threadId: dmThread.id,
            userId: session.user.id,
          },
          data: { lastReadAt: new Date() },
        });

        // Format to match ThreadWithMessages interface
        thread = {
          id: dmThread.id,
          type: dmThread.type,
          subject: dmThread.subject,
          fromEmail: dmThread.fromEmail,
          toEmail: dmThread.toEmail,
          status: dmThread.status,
          createdAt: dmThread.createdAt,
          updatedAt: dmThread.updatedAt,
          messages: dmThread.messages.map((m: any) => ({
            id: m.id,
            content: m.content,
            senderName: m.senderName,
            senderEmail: m.senderEmail,
            role: m.role,
            createdAt: m.createdAt,
          })),
          participants: dmThread.participants,
        };
      }
    }

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error('GET /api/contractor/messages/[threadId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractor/messages/[threadId]
 * Reply to a thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    const contractorId = await getContractorIdForUser(session.user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Not a contractor' }, { status: 403 });
    }

    const { threadId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if this is a DM thread
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { type: true },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // For DM threads, use direct prisma instead of UnifiedMessageService
    if (thread.type === 'dm') {
      // Verify user is a participant
      const participant = await prisma.threadParticipant.findFirst({
        where: { threadId, userId: session.user.id },
      });

      if (!participant) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          threadId,
          senderUserId: session.user.id,
          senderName: session.user.name || 'Contractor',
          senderEmail: session.user.email || '',
          content: content.trim(),
          role: 'user',
        },
      });

      // Update thread timestamp
      await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      // Mark as read for sender
      await prisma.threadParticipant.updateMany({
        where: { threadId, userId: session.user.id },
        data: { lastReadAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        messageId: message.id,
      });
    }

    // For other thread types, use UnifiedMessageService
    const result = await UnifiedMessageService.sendMessage({
      senderId: session.user.id,
      senderName: session.user.name || undefined,
      senderEmail: session.user.email || undefined,
      content,
      threadId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('POST /api/contractor/messages/[threadId] error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
/**
 * PATCH /api/contractor/messages/[threadId]
 * Archive a thread
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    const contractorId = await getContractorIdForUser(session.user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Not a contractor' }, { status: 403 });
    }

    const { threadId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'archive') {
      const result = await UnifiedMessageService.archiveThread(threadId, session.user.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to archive thread' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/contractor/messages/[threadId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/contractor/messages/[threadId]
 * Delete (move to trash) a thread
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    const contractorId = await getContractorIdForUser(session.user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Not a contractor' }, { status: 403 });
    }

    const { threadId } = await params;

    const result = await UnifiedMessageService.deleteThread(threadId, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete thread' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contractor/messages/[threadId] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
}

// Made with Bob

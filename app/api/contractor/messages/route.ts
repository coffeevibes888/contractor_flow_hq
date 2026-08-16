import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { UnifiedMessageService } from '@/lib/services/unified-message-service';
import { getContractorIdForUser } from '@/lib/contractor-profile';

/**
 * GET /api/contractor/messages
 * Get all message threads for the current contractor
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const folder = (searchParams.get('folder') as any) || 'inbox';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const threads = await UnifiedMessageService.getThreads({
      userId: session.user.id,
      userRole: 'contractor',
      folder,
      limit,
      offset,
    });

    // Also fetch DM threads (from marketplace contact button)
    // These are created by the /api/contractor/chat/send endpoint
    const dmThreads = await prisma.threadParticipant.findMany({
      where: {
        userId: session.user.id,
        isDeleted: false,
        thread: {
          type: 'dm',
          status: folder === 'inbox' ? 'open' : folder === 'sent' ? { in: ['open', 'archived'] } : folder,
        },
      },
      include: {
        thread: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            participants: {
              select: {
                userId: true,
                lastReadAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        thread: { updatedAt: 'desc' },
      },
      take: limit,
      skip: offset,
    });

    // Format DM threads to match the ThreadWithMessages interface
    const formattedDmThreads = dmThreads
      .filter((tp: any) => tp.thread !== null)
      .map((tp: any) => {
        const thread = tp.thread;
        const userParticipant = thread.participants.find((p: any) => p.userId === session.user.id);
        const lastMessage = thread.messages[0];
        
        // Calculate unread count
        let unreadCount = 0;
        if (lastMessage && userParticipant) {
          if (!userParticipant.lastReadAt || new Date(lastMessage.createdAt) > new Date(userParticipant.lastReadAt)) {
            unreadCount = 1;
          }
        }

        return {
          id: thread.id,
          type: thread.type,
          subject: thread.subject,
          fromEmail: thread.fromEmail,
          toEmail: thread.toEmail,
          status: thread.status,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          messages: thread.messages.map((m: any) => ({
            id: m.id,
            content: m.content,
            senderName: m.senderName,
            senderEmail: m.senderEmail,
            role: m.role,
            createdAt: m.createdAt,
          })),
          participants: thread.participants,
          unreadCount,
        };
      });

    // Merge and sort all threads by updatedAt
    const allThreads = [...threads, ...formattedDmThreads].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const unreadCount = await UnifiedMessageService.getUnreadCount(session.user.id);

    return NextResponse.json({
      success: true,
      threads: allThreads,
      folder,
      unreadCount,
    });
  } catch (error) {
    console.error('GET /api/contractor/messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractor/messages
 * Send a new message or reply to existing thread
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { recipientId, subject, content, threadId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!threadId && !recipientId) {
      return NextResponse.json(
        { error: 'Either threadId or recipientId is required' },
        { status: 400 }
      );
    }

    const result = await UnifiedMessageService.sendMessage({
      senderId: session.user.id,
      senderName: session.user.name || undefined,
      senderEmail: session.user.email || undefined,
      recipientId,
      subject,
      content,
      threadId,
      threadType: 'contractor_client',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      threadId: result.threadId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('POST /api/contractor/messages error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// Made with Bob

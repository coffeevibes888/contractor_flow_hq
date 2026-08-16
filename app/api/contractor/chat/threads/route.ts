import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { decryptField } from '@/lib/encrypt';
import { NextResponse } from 'next/server';

/**
 * GET /api/contractor/chat/threads
 * Returns all DM threads for the current user with latest message and participant info.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threads = await prisma.thread.findMany({
      where: {
        type: 'dm',
        participants: { some: { userId: session.user.id } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = await Promise.all(
      threads.map(async (thread) => {
        const otherParticipant = thread.participants.find(
          (p) => p.userId !== session.user.id
        );
        const myParticipant = thread.participants.find(
          (p) => p.userId === session.user.id
        );
        const lastMessage = thread.messages[0] || null;
        const isUnread =
          lastMessage &&
          myParticipant?.lastReadAt &&
          new Date(lastMessage.createdAt) > new Date(myParticipant.lastReadAt);

        // Nested `include` bypasses the prisma message decrypt extension,
        // so decrypt the preview content here.
        let decryptedContent: string | null = null;
        if (lastMessage && typeof lastMessage.content === 'string') {
          try {
            decryptedContent = await decryptField(lastMessage.content);
          } catch {
            decryptedContent = lastMessage.content;
          }
        }

        return {
          id: thread.id,
          subject: thread.subject,
          updatedAt: thread.updatedAt,
          otherUser: otherParticipant?.user || null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: decryptedContent ?? '',
                senderUserId: lastMessage.senderUserId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          isUnread: !!isUnread,
        };
      })
    );

    return NextResponse.json({ threads: formatted });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }
}

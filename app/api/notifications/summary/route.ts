import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

type ThreadParticipantWithThread = {
  id: string;
  threadId: string;
  userId: string;
  lastReadAt: Date | null;
  thread: {
    type?: string;
    messages: {
      createdAt: Date | string;
    }[];
  };
};

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        newOrders: 0, 
        openMessages: 0, 
        unreadMessages: 0 
      });
    }

    const userId = session.user.id as string;
    const isAdmin = session.user.role === 'admin' || session.user.role === 'superAdmin';

    let newOrders = 0;
    let openMessages = 0;
    let unreadMessages = 0;
    let unreadEmailThreads = 0;
    let pendingFriendRequests = 0;

    if (isAdmin) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      newOrders = await prisma.order.count({
        where: {
          createdAt: {
            gte: oneDayAgo,
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openMessages = await (prisma as any).thread.count({
        where: {
          type: { in: ['contact', 'support'] },
          status: 'open',
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const participants = await (prisma as any).threadParticipant.findMany({
        where: { userId },
        include: {
          thread: {
            include: {
              messages: {
                where: {
                  createdAt: {
                    gt: new Date(0),
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      unreadMessages = participants.filter((p: ThreadParticipantWithThread) => {
        if (!p.thread.messages.length) return false;
        const lastMessage = p.thread.messages[0];
        if (!p.lastReadAt) return true;
        return new Date(lastMessage.createdAt) > new Date(p.lastReadAt);
      }).length;

      unreadEmailThreads = participants.filter((p: ThreadParticipantWithThread) => {
        if (p.thread.type !== 'email') return false;
        if (!p.thread.messages.length) return false;
        const lastMessage = p.thread.messages[0];
        if (!p.lastReadAt) return true;
        return new Date(lastMessage.createdAt) > new Date(p.lastReadAt);
      }).length;

      pendingFriendRequests = await prisma.friend.count({
        where: {
          friendId: userId,
          status: 'pending',
        },
      });
    }

    return NextResponse.json({
      newOrders,
      openMessages,
      unreadMessages,
      unreadEmailThreads,
      pendingFriendRequests,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

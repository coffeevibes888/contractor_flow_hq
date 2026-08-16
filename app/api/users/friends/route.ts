import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ friends: [] });
    }

    const currentUserId = session.user.id as string;

    const friendships = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: currentUserId }, { friendId: currentUserId }],
      },
      include: {
        user: true,
        friend: true,
      },
    });

    const friends = friendships.map((f) => {
      const other = f.userId === currentUserId ? f.friend : f.user;
      return {
        id: other.id,
        name: other.name,
        email: other.email,
        phoneNumber: other.phoneNumber,
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const currentUserId = session.user.id as string;

    if (targetUserId === currentUserId) {
      return NextResponse.json({ error: 'You cannot add yourself as a friend.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (existing && existing.status === 'accepted') {
      return NextResponse.json({ ok: true, status: 'accepted' });
    }

    if (existing && existing.status === 'pending') {
      return NextResponse.json({ ok: true, status: 'pending' });
    }

    const request = await prisma.friend.create({
      data: {
        userId: currentUserId,
        friendId: targetUserId,
        status: 'pending',
      },
    });

    return NextResponse.json({ ok: true, status: 'pending', requestId: request.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating friend request:', error);
    return NextResponse.json({ error: 'Failed to create friend request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const currentUserId = session.user.id as string;

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.friend.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting friend:', error);
    return NextResponse.json({ error: 'Failed to delete friend' }, { status: 500 });
  }
}

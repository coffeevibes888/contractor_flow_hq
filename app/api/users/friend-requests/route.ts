import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const userId = session.user.id as string;

    const request = await prisma.friend.findUnique({ where: { id: requestId } });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.userId !== userId && request.friendId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    const updated = await prisma.friend.update({
      where: { id: requestId },
      data: {
        status: action === 'accept' ? 'accepted' : 'declined',
      },
    });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating friend request:', error);
    return NextResponse.json({ error: 'Failed to update friend request' }, { status: 500 });
  }
}

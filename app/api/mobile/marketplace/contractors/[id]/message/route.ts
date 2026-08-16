/**
 * POST /api/mobile/marketplace/contractors/[id]/message
 *
 * Open or get an existing chat thread between the current user and a contractor.
 * Optionally seeds the thread with a first message.
 *
 * Body:
 *   { initialMessage?: string }
 *
 * Response:
 *   { threadId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const initialMessage: string | undefined = body?.initialMessage;

    const contractor = await prisma.contractorProfile.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, userId: true, businessName: true },
    });
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    if (!contractor.userId) {
      return NextResponse.json({ error: 'Contractor has no linked user account' }, { status: 400 });
    }
    if (contractor.userId === auth.userId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Find an existing DM thread between these two users
    const existing = await prisma.thread.findFirst({
      where: {
        type: 'dm',
        AND: [
          { participants: { some: { userId: auth.userId, isDeleted: false } } },
          { participants: { some: { userId: contractor.userId, isDeleted: false } } },
        ],
      },
      select: { id: true },
    });

    let threadId = existing?.id;

    if (!threadId) {
      const thread = await prisma.thread.create({
        data: {
          type: 'dm',
          subject: contractor.businessName ?? null,
          createdByUserId: auth.userId,
          participants: {
            create: [
              { userId: auth.userId },
              { userId: contractor.userId },
            ],
          },
        },
        select: { id: true },
      });
      threadId = thread.id;
    }

    if (initialMessage && initialMessage.trim()) {
      await prisma.message.create({
        data: {
          threadId,
          senderUserId: auth.userId,
          content: initialMessage.trim(),
          role: 'user',
        },
      });
      await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ threadId });
  } catch (error: any) {
    console.error('[mobile/marketplace/message]', error);
    return NextResponse.json({ error: error?.message || 'Could not start conversation' }, { status: 500 });
  }
}

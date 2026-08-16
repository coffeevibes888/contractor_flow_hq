import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

/**
 * Verify the current user can read/write messages on this bid.
 * Allowed parties: the contractor who submitted the bid (via Contractor.userId)
 * and the PM/owner of the landlord that posted the work order.
 */
async function authorizeBidParticipant(workOrderId: string, bidId: string, userId: string) {
  const bid = await prisma.workOrderBid.findFirst({
    where: { id: bidId, workOrderId },
    include: {
      contractor: { select: { userId: true } },
      workOrder: {
        select: {
          landlord: { select: { ownerUserId: true } },
        },
      },
    },
  });

  if (!bid) return { ok: false as const, code: 404, error: 'Bid not found' };

  const isContractor = bid.contractor.userId === userId;
  const isOwner = bid.workOrder.landlord.ownerUserId === userId;

  if (!isContractor && !isOwner) {
    return { ok: false as const, code: 403, error: 'Not a participant on this bid' };
  }

  return { ok: true as const, bid, role: isOwner ? ('owner' as const) : ('contractor' as const) };
}

// GET - list messages on a bid (chronological)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id: workOrderId, bidId } = await params;
    const authz = await authorizeBidParticipant(workOrderId, bidId, session.user.id);
    if (!authz.ok) {
      return NextResponse.json({ success: false, error: authz.error }, { status: authz.code });
    }

    const messages = await prisma.workOrderBidMessage.findMany({
      where: { bidId },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark unread incoming messages as read for this user
    await prisma.workOrderBidMessage.updateMany({
      where: {
        bidId,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, messages, role: authz.role });
  } catch (error) {
    console.error('GET /bid/messages error', error);
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST - send a message OR a counter-offer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id: workOrderId, bidId } = await params;
    const authz = await authorizeBidParticipant(workOrderId, bidId, session.user.id);
    if (!authz.ok) {
      return NextResponse.json({ success: false, error: authz.error }, { status: authz.code });
    }

    const body = await req.json();
    const { type = 'message', body: text, counterAmount } = body as {
      type?: 'message' | 'counter_offer';
      body?: string;
      counterAmount?: number | string;
    };

    if (type === 'message') {
      if (!text || !text.trim()) {
        return NextResponse.json({ success: false, error: 'Message body required' }, { status: 400 });
      }

      const msg = await prisma.workOrderBidMessage.create({
        data: {
          bidId,
          senderId: session.user.id,
          type: 'message',
          body: text.trim(),
        },
        include: { sender: { select: { id: true, name: true, image: true } } },
      });

      return NextResponse.json({ success: true, message: msg });
    }

    if (type === 'counter_offer') {
      const amt = typeof counterAmount === 'string' ? parseFloat(counterAmount) : counterAmount;
      if (!amt || isNaN(amt) || amt <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid counter-offer amount required' },
          { status: 400 }
        );
      }

      // Mark all previous pending counter-offers on this bid as superseded
      await prisma.workOrderBidMessage.updateMany({
        where: { bidId, type: 'counter_offer', counterStatus: 'pending' },
        data: { counterStatus: 'superseded' },
      });

      const msg = await prisma.workOrderBidMessage.create({
        data: {
          bidId,
          senderId: session.user.id,
          type: 'counter_offer',
          body: text?.trim() || null,
          counterAmount: amt,
          counterStatus: 'pending',
        },
        include: { sender: { select: { id: true, name: true, image: true } } },
      });

      // Reflect negotiation state on the bid
      await prisma.workOrderBid.update({
        where: { id: bidId },
        data: { status: 'counter_offered' },
      });

      return NextResponse.json({ success: true, message: msg });
    }

    return NextResponse.json({ success: false, error: 'Unknown message type' }, { status: 400 });
  } catch (error) {
    console.error('POST /bid/messages error', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

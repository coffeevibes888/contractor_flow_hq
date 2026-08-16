import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

/**
 * POST - accept or reject a counter-offer.
 * Body: { action: 'accept' | 'reject' }
 *
 * Only the OPPOSITE party to the sender can respond. e.g., if the PM sent a
 * counter-offer, only the contractor can accept/reject it (and vice-versa).
 *
 * On accept: the bid's `amount` is updated to the counter amount and bid
 * status returns to 'pending' so the PM can finalize/award.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string; msgId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id: workOrderId, bidId, msgId } = await params;
    const { action } = (await req.json()) as { action: 'accept' | 'reject' };

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const msg = await prisma.workOrderBidMessage.findFirst({
      where: { id: msgId, bidId, type: 'counter_offer' },
      include: {
        bid: {
          include: {
            contractor: { select: { userId: true } },
            workOrder: { select: { landlord: { select: { ownerUserId: true } } } },
          },
        },
      },
    });

    if (!msg || msg.bid.workOrder.landlord.ownerUserId == null) {
      return NextResponse.json({ success: false, error: 'Counter-offer not found' }, { status: 404 });
    }

    if (msg.counterStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Counter-offer is no longer pending' },
        { status: 400 }
      );
    }

    if (workOrderId !== msg.bid.workOrderId) {
      return NextResponse.json({ success: false, error: 'Mismatched work order' }, { status: 400 });
    }

    const isContractor = msg.bid.contractor.userId === session.user.id;
    const isOwner = msg.bid.workOrder.landlord.ownerUserId === session.user.id;
    if (!isContractor && !isOwner) {
      return NextResponse.json({ success: false, error: 'Not a participant on this bid' }, { status: 403 });
    }

    // Only the opposite party may respond
    if (msg.senderId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot respond to your own counter-offer' },
        { status: 400 }
      );
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const [updatedMsg] = await prisma.$transaction([
      prisma.workOrderBidMessage.update({
        where: { id: msgId },
        data: {
          counterStatus: newStatus,
          respondedAt: new Date(),
          respondedBy: session.user.id,
        },
        include: { sender: { select: { id: true, name: true, image: true } } },
      }),
      ...(action === 'accept' && msg.counterAmount
        ? [
            prisma.workOrderBid.update({
              where: { id: bidId },
              data: { amount: msg.counterAmount, status: 'pending' },
            }),
          ]
        : action === 'reject'
          ? [
              prisma.workOrderBid.update({
                where: { id: bidId },
                data: { status: 'pending' },
              }),
            ]
          : []),
      prisma.workOrderBidMessage.create({
        data: {
          bidId,
          senderId: session.user.id,
          type: 'system',
          body:
            action === 'accept'
              ? `Counter-offer of $${Number(msg.counterAmount).toLocaleString()} accepted. Bid amount updated.`
              : `Counter-offer of $${Number(msg.counterAmount).toLocaleString()} rejected.`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: updatedMsg });
  } catch (error) {
    console.error('POST /bid/messages/respond error', error);
    return NextResponse.json({ success: false, error: 'Failed to respond' }, { status: 500 });
  }
}

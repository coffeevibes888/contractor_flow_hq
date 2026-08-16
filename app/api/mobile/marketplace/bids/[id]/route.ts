/**
 * POST /api/mobile/marketplace/bids/[id]
 *
 * Action endpoint for the bid recipient (homeowner or PM):
 *   - action: 'accept' | 'decline' | 'counter'
 *   - counterAmount?: number  (required for counter)
 *   - counterNote?: string
 *
 * For 'accept', the bid status moves to `accepted`, the parent job is
 * reassigned, and competing bids are auto-declined. Escrow funding happens
 * via the existing /api/work-orders/[id]/accept-and-pay flow on web —
 * here we just mark the bid accepted; the mobile UI will then drive the
 * Stripe payment sheet via a separate call.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard, type CardKind } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: bidId } = await params;
    const body = await req.json();
    const action: string = body?.action;
    const counterAmount = body?.counterAmount;
    const counterNote = body?.counterNote;

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept, decline, or counter' }, { status: 400 });
    }
    if (action === 'counter' && (counterAmount == null || isNaN(Number(counterAmount)))) {
      return NextResponse.json({ error: 'counterAmount required for counter action' }, { status: 400 });
    }

    const db = prisma as any;

    // ── 1. Try WorkOrderBid (landlord-posted job) ────────────────────────────
    const wob = await prisma.workOrderBid.findUnique({
      where: { id: bidId },
      include: {
        workOrder: { select: { id: true, landlordId: true, status: true } },
      },
    });

    if (wob) {
      // Authorize: caller must be the landlord that posted the job
      const landlord = await db.landlord.findUnique({
        where: { userId: auth.userId },
        select: { id: true },
      });
      if (!landlord || landlord.id !== wob.workOrder.landlordId) {
        return NextResponse.json({ error: 'Only the job owner can act on this bid' }, { status: 403 });
      }

      if (wob.status !== 'pending' && action !== 'counter') {
        return NextResponse.json({ error: `Bid is already ${wob.status}` }, { status: 400 });
      }

      if (action === 'decline') {
        const updated = await prisma.workOrderBid.update({
          where: { id: bidId },
          data: { status: 'declined' },
        });
        await notifyContractor(auth.userId, wob.contractorId, 'bid_declined', wob, counterAmount, counterNote);
        return NextResponse.json({ success: true, status: updated.status });
      }

      if (action === 'accept') {
        // Mark this accepted, decline the rest, mark job assigned
        await prisma.$transaction([
          prisma.workOrderBid.update({
            where: { id: bidId },
            data: { status: 'accepted' },
          }),
          prisma.workOrderBid.updateMany({
            where: {
              workOrderId: wob.workOrderId,
              id: { not: bidId },
              status: 'pending',
            },
            data: { status: 'declined' },
          }),
          prisma.workOrder.update({
            where: { id: wob.workOrderId },
            data: {
              contractorId: wob.contractorId,
              acceptedBidId: bidId,
              agreedPrice: wob.amount,
              status: 'assigned',
            },
          }),
        ]);
        await notifyContractor(auth.userId, wob.contractorId, 'bid_accepted', wob, counterAmount, counterNote);
        return NextResponse.json({ success: true, status: 'accepted', workOrderId: wob.workOrderId });
      }

      if (action === 'counter') {
        // Persist a counter as a WorkOrderBidMessage with type='counter_offer'
        await prisma.workOrderBidMessage.create({
          data: {
            bidId,
            senderId: auth.userId,
            type: 'counter_offer',
            body: counterNote ?? null,
            counterAmount: Number(counterAmount),
            counterStatus: 'pending',
          },
        });
        await prisma.workOrderBid.update({
          where: { id: bidId },
          data: { status: 'counter_offered' },
        });
        await notifyContractor(auth.userId, wob.contractorId, 'bid_countered', wob, counterAmount, counterNote);
        return NextResponse.json({ success: true, status: 'counter_offered' });
      }
    }

    // ── 2. Try HomeownerWorkOrderBid ─────────────────────────────────────────
    const hwob = await db.homeownerWorkOrderBid.findUnique({
      where: { id: bidId },
      include: {
        workOrder: { select: { id: true, homeownerId: true, status: true } },
      },
    });

    if (hwob) {
      const homeowner = await db.homeowner.findUnique({
        where: { userId: auth.userId },
        select: { id: true },
      });
      if (!homeowner || homeowner.id !== hwob.workOrder.homeownerId) {
        return NextResponse.json({ error: 'Only the job owner can act on this bid' }, { status: 403 });
      }
      if (hwob.status !== 'pending' && action !== 'counter') {
        return NextResponse.json({ error: `Bid is already ${hwob.status}` }, { status: 400 });
      }

      if (action === 'decline') {
        await db.homeownerWorkOrderBid.update({
          where: { id: bidId },
          data: { status: 'declined' },
        });
        await notifyHomeownerBidContractor(auth.userId, hwob.contractorId, 'bid_declined', hwob);
        return NextResponse.json({ success: true, status: 'declined' });
      }

      if (action === 'accept') {
        await prisma.$transaction([
          db.homeownerWorkOrderBid.update({
            where: { id: bidId },
            data: { status: 'accepted' },
          }),
          db.homeownerWorkOrderBid.updateMany({
            where: {
              workOrderId: hwob.workOrderId,
              id: { not: bidId },
              status: 'pending',
            },
            data: { status: 'declined' },
          }),
          db.homeownerWorkOrder.update({
            where: { id: hwob.workOrderId },
            data: {
              contractorId: hwob.contractorId,
              agreedPrice: hwob.amount,
              status: 'assigned',
            },
          }),
        ]);
        await notifyHomeownerBidContractor(auth.userId, hwob.contractorId, 'bid_accepted', hwob);
        return NextResponse.json({ success: true, status: 'accepted', jobId: hwob.workOrderId });
      }

      if (action === 'counter') {
        // No native counter table for homeowner bids; use a status update.
        await db.homeownerWorkOrderBid.update({
          where: { id: bidId },
          data: { status: 'pending', message: counterNote ?? hwob.message, amount: Number(counterAmount) },
        });
        await notifyHomeownerBidContractor(auth.userId, hwob.contractorId, 'bid_countered', hwob, counterAmount, counterNote);
        return NextResponse.json({ success: true, status: 'countered' });
      }
    }

    return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[mobile/marketplace/bids/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Could not act on bid' }, { status: 500 });
  }
}


// ─── helpers ─────────────────────────────────────────────────────────────────

const TITLE: Record<CardKind, string> = {
  bid_sent: 'Bid sent',
  bid_accepted: 'Bid accepted',
  bid_declined: 'Bid declined',
  bid_countered: 'Counter offer',
  quote_sent: 'Quote sent',
  quote_accepted: 'Quote accepted',
  quote_declined: 'Quote declined',
  quote_countered: 'Counter offer',
  booking_created: 'Booking',
  offer_sent: 'Job offer',
  job_completed: 'Job complete',
  review_request: 'Leave a review',
};

/**
 * Send a card to the contractor (legacy `Contractor` model — used for PM bids).
 * Resolves the contractor's user id, then drops the action card in the DM
 * thread between the actor and the contractor.
 */
async function notifyContractor(
  fromUserId: string,
  contractorId: string,
  kind: CardKind,
  bid: { amount: any; workOrderId: string },
  counterAmount?: any,
  counterNote?: string,
) {
  const c = await (prisma as any).contractor.findUnique({
    where: { id: contractorId },
    select: { userId: true },
  });
  if (!c?.userId) return;
  const amount = kind === 'bid_countered' && counterAmount != null ? Number(counterAmount) : Number(bid.amount);
  await emitMarketplaceCard(fromUserId, c.userId, {
    kind,
    title: TITLE[kind],
    summary: kind === 'bid_accepted'
      ? `Customer accepted your $${Number(bid.amount).toFixed(0)} bid`
      : kind === 'bid_declined'
        ? counterNote
          ? `Customer declined: "${counterNote}"`
          : 'Customer declined your bid'
        : `Customer countered: $${Number(counterAmount ?? 0).toFixed(0)}`,
    amount,
    refId: bid.workOrderId,
    refType: 'bid',
    details: counterNote ? { note: counterNote } : undefined,
  });
}

/**
 * Same idea for homeowner bids — contractor lives on `ContractorProfile`.
 */
async function notifyHomeownerBidContractor(
  fromUserId: string,
  contractorProfileId: string,
  kind: CardKind,
  bid: { amount: any; workOrderId: string },
  counterAmount?: any,
  counterNote?: string,
) {
  const cp = await prisma.contractorProfile.findUnique({
    where: { id: contractorProfileId },
    select: { userId: true },
  });
  if (!cp?.userId) return;
  const amount = kind === 'bid_countered' && counterAmount != null ? Number(counterAmount) : Number(bid.amount);
  await emitMarketplaceCard(fromUserId, cp.userId, {
    kind,
    title: TITLE[kind],
    summary: kind === 'bid_accepted'
      ? `Customer accepted your $${Number(bid.amount).toFixed(0)} bid`
      : kind === 'bid_declined'
        ? counterNote
          ? `Customer declined: "${counterNote}"`
          : 'Customer declined your bid'
        : `Customer countered: $${Number(counterAmount ?? 0).toFixed(0)}`,
    amount,
    refId: bid.workOrderId,
    refType: 'bid',
    details: counterNote ? { note: counterNote } : undefined,
  });
}

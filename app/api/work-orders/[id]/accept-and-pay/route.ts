/**
 * POST /api/work-orders/[id]/accept-and-pay
 *
 * PM-only. Accepts the winning bid and creates a Stripe PaymentIntent.
 * The PaymentIntent is captured in `manual` mode so the platform receives
 * the funds and holds them in its Stripe balance until release.
 *
 * Body: { bidId: string, paymentMethodId?: string }
 * Returns: { clientSecret, paymentIntentId, amount } so the client can
 * confirm the payment with stripe-js if not already confirmed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { recordTransition } from '@/lib/services/work-order-lifecycle';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: workOrderId } = await params;
    const { bidId, paymentMethodId } = (await req.json()) as {
      bidId: string;
      paymentMethodId?: string;
    };

    if (!bidId) {
      return NextResponse.json(
        { success: false, error: 'bidId is required' },
        { status: 400 }
      );
    }

    // Load the work order + bid + verify caller is the PM owner
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { id: true, ownerUserId: true, name: true } },
      },
    });
    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }
    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the property manager can accept bids' },
        { status: 403 }
      );
    }
    if (workOrder.lifecycleStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Work order is already ${workOrder.lifecycleStatus}` },
        { status: 400 }
      );
    }

    const bid = await prisma.workOrderBid.findFirst({
      where: { id: bidId, workOrderId },
      include: {
        contractor: {
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!bid) {
      return NextResponse.json(
        { success: false, error: 'Bid not found on this work order' },
        { status: 404 }
      );
    }
    if (bid.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This bid is ${bid.status} and cannot be accepted` },
        { status: 400 }
      );
    }

    const amount = Number(bid.amount);
    const amountInCents = Math.round(amount * 100);
    if (amountInCents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bid amount must be positive' },
        { status: 400 }
      );
    }

    // Resolve the contractor's Stripe Connect account (preferred path:
    // ContractorProfile.stripeConnectAccountId). The directory `Contractor`
    // model is per-PM so we look up the profile by userId.
    let contractorStripeAccountId: string | null = null;
    if (bid.contractor.userId) {
      const profile = await prisma.contractorProfile.findFirst({
        where: { userId: bid.contractor.userId },
        select: { stripeConnectAccountId: true, isPaymentReady: true },
      });
      if (profile?.isPaymentReady && profile.stripeConnectAccountId) {
        contractorStripeAccountId = profile.stripeConnectAccountId;
      }
    }
    // We DON'T fail if the contractor isn't payment-ready yet — funds are
    // still held in the platform balance. They'll need to onboard before
    // we can transfer on release. Surface a warning instead.

    // Create the PaymentIntent in MANUAL capture? No — for our model we
    // capture immediately so funds move into the platform balance and we
    // are not bound by the 7-day auth window. The platform balance acts
    // as the holding location until we issue a Transfer on release.
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      capture_method: 'automatic',
      // If a payment method id is provided, confirm immediately. Otherwise
      // return the client secret and the front-end will collect/confirm.
      ...(paymentMethodId
        ? { payment_method: paymentMethodId, confirm: true, off_session: false }
        : { automatic_payment_methods: { enabled: true } }),
      metadata: {
        platform: 'property-flow-hq',
        workOrderId,
        bidId,
        landlordId: workOrder.landlord.id,
        contractorId: bid.contractor.id,
        purpose: 'work_order_escrow_funding',
      },
      description: `PropertyFlow job: ${workOrder.title} (#${workOrderId.slice(0, 8)})`,
    });

    // Update DB atomically: bid accepted, others rejected, work order funded
    await prisma.$transaction(async (tx) => {
      await tx.workOrderBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });
      await tx.workOrderBid.updateMany({
        where: {
          workOrderId,
          id: { not: bidId },
          status: { in: ['pending', 'counter_offered'] },
        },
        data: { status: 'declined' },
      });

      await recordTransition({
        tx,
        workOrderId,
        to: 'funded',
        actorUserId: session.user.id,
        actorRole: 'landlord',
        note: `Accepted bid from ${bid.contractor.name} for $${amount.toLocaleString()}`,
        metadata: {
          bidId,
          paymentIntentId: intent.id,
          amount,
          contractorStripeAccountId,
        },
        workOrderPatch: {
          contractor: { connect: { id: bid.contractor.id } },
          status: 'assigned',
          agreedPrice: bid.amount,
          acceptedBidId: bidId,
          escrowStatus: 'funded',
          escrowAmount: bid.amount,
          escrowFundedAt: new Date(),
          stripePaymentIntentId: intent.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
      amount,
      contractorPaymentReady: !!contractorStripeAccountId,
    });
  } catch (error) {
    console.error('accept-and-pay error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

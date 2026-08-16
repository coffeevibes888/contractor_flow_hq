import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';

/**
 * POST /api/contractor/subscription/cancel
 *
 * Cancels a contractor's subscription at the end of the current billing period.
 * The contractor retains access until currentPeriodEnd.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        subscriptionEndsAt: true,
      },
    });

    if (!contractor) {
      return NextResponse.json({ success: false, message: 'Contractor profile not found' }, { status: 404 });
    }

    if (!contractor.subscriptionStatus || contractor.subscriptionStatus === 'canceled') {
      return NextResponse.json({ success: false, message: 'No active subscription found' }, { status: 400 });
    }

    if (contractor.subscriptionTier === 'starter' || !contractor.subscriptionTier) {
      return NextResponse.json({ success: false, message: 'No paid subscription to cancel' }, { status: 400 });
    }

    // If already scheduled for cancellation, return success
    if (contractor.subscriptionEndsAt) {
      return NextResponse.json({
        success: true,
        message: 'Subscription is already scheduled for cancellation',
        endsAt: contractor.subscriptionEndsAt,
      });
    }

    const endsAt = contractor.currentPeriodEnd || new Date();

    // Cancel in Stripe if subscription ID exists
    if (contractor.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(contractor.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        // Continue with local DB update even if Stripe fails
      }
    }

    // Mark subscription as scheduled for cancellation in DB
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        subscriptionEndsAt: endsAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      endsAt: endsAt,
    });
  } catch (error) {
    console.error('Cancel contractor subscription error:', error);
    return NextResponse.json({ success: false, message: 'Failed to cancel subscription' }, { status: 500 });
  }
}

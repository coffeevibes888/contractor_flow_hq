import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

// Create Stripe billing portal session for managing subscription
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json({ success: false, message: 'Unable to determine landlord' }, { status: 400 });
    }

    const landlord = landlordResult.landlord;

    if (!landlord.stripeCustomerId) {
      return NextResponse.json({ success: false, message: 'No active subscription found' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: landlord.stripeCustomerId,
      return_url: `${baseUrl}/admin/settings/subscription`,
    });

    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ success: false, message: 'Failed to open billing portal' }, { status: 500 });
  }
}

// Cancel subscription
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json({ success: false, message: 'Unable to determine landlord' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordResult.landlord.id },
      include: { subscription: true },
    });

    if (!landlord?.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ success: false, message: 'No active subscription found' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

    // Cancel at period end (user keeps access until billing period ends)
    await stripe.subscriptions.update(landlord.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local database
    await prisma.landlordSubscription.update({
      where: { id: landlord.subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ success: false, message: 'Failed to cancel subscription' }, { status: 500 });
  }
}

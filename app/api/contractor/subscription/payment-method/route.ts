import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!profile?.stripeCustomerId) {
      return NextResponse.json({ success: true, paymentMethod: null });
    }

    const stripe = new Stripe(stripeSecretKey);
    const customer = await stripe.customers.retrieve(profile.stripeCustomerId) as Stripe.Customer;

    if (customer.deleted || !customer.invoice_settings?.default_payment_method) {
      return NextResponse.json({ success: true, paymentMethod: null });
    }

    const pm = await stripe.paymentMethods.retrieve(
      customer.invoice_settings.default_payment_method as string
    );

    if (pm.type !== 'card' || !pm.card) {
      return NextResponse.json({ success: true, paymentMethod: null });
    }

    return NextResponse.json({
      success: true,
      paymentMethod: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      },
    });
  } catch (error) {
    console.error('Failed to fetch payment method:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!profile?.stripeCustomerId) {
      return NextResponse.json({ success: false, message: 'No billing account found.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL}/contractor/settings/subscription`,
    });

    return NextResponse.json({ success: true, url: portalSession.url });
  } catch (error) {
    console.error('Failed to create billing portal session:', error);
    return NextResponse.json({ success: false, message: 'Failed to open billing portal.' }, { status: 500 });
  }
}

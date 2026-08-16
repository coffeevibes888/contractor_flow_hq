import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { SERVER_URL } from '@/lib/constants';

// Visibility credit packages — impression-based, not rank-based
export const VISIBILITY_PACKAGES = [
  {
    id: 'boost_500',
    name: '500 Impressions',
    credits: 500,
    price: 299, // $2.99 in cents
    description: 'Your card shown to ~500 more people',
    popular: false,
  },
  {
    id: 'boost_1500',
    name: '1,500 Impressions',
    credits: 1500,
    price: 699, // $6.99
    description: 'Your card shown to ~1,500 more people',
    popular: true,
  },
  {
    id: 'boost_3000',
    name: '3,000 Impressions',
    credits: 3000,
    price: 999, // $9.99 — max $10 cap
    description: 'Your card shown to ~3,000 more people',
    popular: false,
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { packageId } = body;

    const pkg = VISIBILITY_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, stripeCustomerId: true, businessName: true, displayName: true, newContractorBoostUntil: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Block purchases while free new-member boost is active
    if (profile.newContractorBoostUntil && profile.newContractorBoostUntil > new Date()) {
      const daysLeft = Math.ceil((profile.newContractorBoostUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return NextResponse.json({
        error: `You have a free new-member boost active for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}. You can purchase additional boosts after it expires.`,
      }, { status: 400 });
    }

    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: profile.displayName || profile.businessName,
        metadata: { contractorProfileId: profile.id, userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.contractorProfile.update({
        where: { id: profile.id },
        data: { stripeCustomerId: customerId },
      });
    }

    let baseUrl = SERVER_URL;
    try { baseUrl = new URL(SERVER_URL).origin; } catch { /* keep SERVER_URL as-is if it isn't a parseable URL */ }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pkg.price,
            product_data: {
              name: `Visibility Boost — ${pkg.name}`,
              description: pkg.description,
              metadata: { packageId: pkg.id, credits: String(pkg.credits) },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/contractor/profile/visibility?boost=success&package=${pkg.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/contractor/profile/visibility?boost=canceled`,
      metadata: {
        contractorProfileId: profile.id,
        packageId: pkg.id,
        credits: String(pkg.credits),
        type: 'visibility_boost',
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Visibility purchase error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

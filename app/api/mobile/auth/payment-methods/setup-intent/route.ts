/**
 * POST /api/mobile/auth/payment-methods/setup-intent
 *
 * Creates (or fetches) a Stripe Customer for the user and a SetupIntent
 * the mobile PaymentSheet uses to add a new card. Mobile flow:
 *
 *   1. App calls this endpoint, receives `{ clientSecret, ephemeralKey, customerId }`
 *   2. App initializes Stripe PaymentSheet with those values
 *   3. User taps "Add card" → PaymentSheet presents native flow
 *   4. On success, Stripe attaches the new PaymentMethod to the Customer
 *   5. App calls /confirm to persist the new SavedPaymentMethod row
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const STRIPE_API_VERSION = '2024-11-20.acacia' as Stripe.LatestApiVersion;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payments not configured on the server' }, { status: 500 });
    }
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let customerId = user.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: STRIPE_API_VERSION },
    );

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customerId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (error: any) {
    console.error('[mobile/auth/payment-methods/setup-intent]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create setup intent' },
      { status: 500 },
    );
  }
}

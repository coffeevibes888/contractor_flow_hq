import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { formatError } from '@/lib/utils';

/**
 * POST /api/payment-methods/bank/setup-intent
 *
 * Creates a Stripe SetupIntent restricted to US bank accounts so the user can
 * link a bank for future one-click ACH payments. Pure Stripe (no Plaid).
 *
 * The SetupIntent is attached to the user's Stripe Customer, creating one if
 * it doesn't exist. Returns the client_secret for use with the Stripe Payment
 * Element on the client.
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create a SetupIntent restricted to US bank accounts. Using the
    // `us_bank_account` payment method gives us Stripe Financial Connections
    // for instant verification, with manual routing/account entry as a fallback.
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method'],
          },
          verification_method: 'automatic',
        },
      },
      usage: 'off_session',
      metadata: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error('Error creating bank setup intent:', error);
    return NextResponse.json(
      { success: false, message: formatError(error) },
      { status: 500 }
    );
  }
}

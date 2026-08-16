import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import Stripe from 'stripe';
import { syncLandlordConnectStatus } from '@/lib/services/stripe-connect.service';

/**
 * Rent checkout API - DIRECT TO LANDLORD MODEL
 * 
 * Payments go directly to landlord's Stripe Connect account.
 * No platform fees on rent - landlords pay subscription instead.
 * 
 * Flow:
 * 1. Tenant pays rent
 * 2. Money goes directly to landlord's Connect account
 * 3. Stripe takes their processing fee
 * 4. Landlord receives the rest immediately
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as
    | { rentPaymentIds?: string[] }
    | null;

  if (!body?.rentPaymentIds || !Array.isArray(body.rentPaymentIds) || body.rentPaymentIds.length === 0) {
    return NextResponse.json({ message: 'No rent payments specified' }, { status: 400 });
  }

  // Get rent payments for this tenant
  const rentPayments = await prisma.rentPayment.findMany({
    where: {
      id: { in: body.rentPaymentIds },
      tenantId: session.user.id as string,
      status: 'pending',
    },
    include: {
      lease: {
        include: {
          unit: {
            include: {
              property: {
                include: {
                  landlord: {
                    select: {
                      id: true,
                      stripeConnectAccountId: true,
                      stripeOnboardingStatus: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (rentPayments.length === 0) {
    return NextResponse.json({ message: 'No pending rent payments found' }, { status: 400 });
  }

  // Get landlord info
  const firstPayment = rentPayments[0];
  const landlord = firstPayment.lease?.unit?.property?.landlord;

  if (!landlord) {
    return NextResponse.json({ message: 'Could not determine landlord for payment' }, { status: 400 });
  }

  // Verify landlord has completed Stripe Connect onboarding
  if (!landlord.stripeConnectAccountId) {
    return NextResponse.json({ 
      message: 'Your landlord has not set up payment receiving. Please contact them.',
      code: 'LANDLORD_NOT_ONBOARDED'
    }, { status: 400 });
  }

  // Both 'verified' (current Wallet vocabulary) and 'active' (legacy
  // pre-consolidation vocabulary) mean the landlord can receive funds.
  // If the locally-cached value is anything else we re-sync from Stripe
  // through the shared helper so wallet + checkout stay in agreement.
  const isReadyStatus = (s: string | null | undefined) =>
    s === 'verified' || s === 'active';

  if (!isReadyStatus(landlord.stripeOnboardingStatus)) {
    try {
      const { status } = await syncLandlordConnectStatus(landlord.id);

      if (status !== 'verified') {
        const message =
          status === 'restricted' || status === 'invalid'
            ? "Your landlord's payment account needs additional information. Please contact them."
            : "Your landlord's payment account is pending verification. Please try again later or contact them.";
        const code =
          status === 'restricted' || status === 'invalid'
            ? 'LANDLORD_ACTION_REQUIRED'
            : 'LANDLORD_PENDING_VERIFICATION';
        return NextResponse.json({ message, code }, { status: 400 });
      }
    } catch (error) {
      console.error('Stripe Connect status verification failed:', error);
      return NextResponse.json(
        {
          message: "Your landlord's payment account needs attention. Please contact them.",
          code: 'LANDLORD_STRIPE_STATUS_ERROR',
        },
        { status: 400 }
      );
    }
  }

  const totalAmount = rentPayments.reduce((sum, p) => {
    const amt = Number(p.amount);
    return sum + (Number.isNaN(amt) ? 0 : amt);
  }, 0);

  if (!totalAmount || totalAmount <= 0) {
    return NextResponse.json({ message: 'Invalid total amount' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const rentAmountInCents = Math.round(totalAmount * 100);

  // Create Payment Intent - DIRECT TO LANDLORD
  // Uses Stripe Connect destination charges.
  //
  // NOTE on payment methods with destination charges:
  // - card, us_bank_account, link: supported ✅
  // - cashapp: NOT supported with transfer_data (Stripe restriction) ❌
  // - apple_pay / google_pay: rendered client-side by PaymentElement automatically ✅
  //
  // We use automatic_payment_methods with an explicit allowlist so Stripe
  // can dynamically enable methods from your dashboard without code changes,
  // while still excluding methods incompatible with destination charges.
  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: rentAmountInCents,
    currency: 'usd',
    // DIRECT PAYMENT: Money goes to landlord's Connect account
    transfer_data: {
      destination: landlord.stripeConnectAccountId,
    },
    // No application_fee_amount - subscription model, no per-transaction fees
    metadata: {
      type: 'rent_payment',
      tenantId: session.user.id as string,
      rentPaymentIds: rentPayments.map((p) => p.id).join(','),
      landlordId: landlord.id,
      rentAmount: rentAmountInCents.toString(),
    },
    // Use automatic_payment_methods so dashboard-enabled methods appear
    // without requiring code changes. Cash App is excluded because it is
    // incompatible with destination charges (Stripe limitation).
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never', // keep tenant on-page; no redirect-based methods
    },
    receipt_email: session.user.email || undefined,
    payment_method_options: {
      us_bank_account: {
        verification_method: 'automatic',
      },
    },
  };

  try {
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    await prisma.rentPayment.updateMany({
      where: { id: { in: rentPayments.map((p) => p.id) } },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      rentAmount: totalAmount,
      totalAmount: totalAmount, // Same as rent - no fees
      platformFee: 0,
      message: 'Payment goes directly to your landlord. No platform fees.',
    });
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);
    const stripeError = error as { message?: string; code?: string };
    
    // Handle specific Connect errors
    if (stripeError.code === 'account_invalid') {
      return NextResponse.json({ 
        message: 'Your landlord\'s payment account needs attention. Please contact them.',
        code: 'LANDLORD_ACCOUNT_INVALID'
      }, { status: 400 });
    }
    
    const message = stripeError.message || 'Payment initialization failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
